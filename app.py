import json
import os
import uuid
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple

from flask import (
    Flask,
    abort,
    jsonify,
    render_template,
    request,
    send_from_directory,
    url_for,
)
from PIL import Image
from werkzeug.utils import secure_filename

# Optional ReportLab for PDF conversion
try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    from reportlab.lib.pagesizes import letter, A4
    PDF_SUPPORTED = True
except Exception:
    PDF_SUPPORTED = False

# Optional HEIC decoding
try:
    from pillow_heif import register_heif_opener  # type: ignore

    register_heif_opener()
    HEIF_SUPPORTED = True
except Exception:
    HEIF_SUPPORTED = False

# Optional Real-ESRGAN support
REAL_ESRGAN_STATE = {
    "ready": False,
    "error": None,
    "engine": None,
}

BRAND_NAME = "ImageForge"
ROOT_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = ROOT_DIR / "uploads"
CONVERTED_FOLDER = ROOT_DIR / "converted"
METADATA_SUFFIX = ".json"
MODEL_FOLDER = ROOT_DIR / "models"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "ico", "heic"}
CONVERT_FORMATS = {"png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "ico", "pdf"}
MAX_SINGLE_BATCH = 10
MAX_HEIC_BATCH = 5
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB

app = Flask(__name__)
app.secret_key = os.environ.get("IMAGEFORGE_SECRET", os.urandom(24))
app.config.update(
    UPLOAD_FOLDER=str(UPLOAD_FOLDER),
    CONVERTED_FOLDER=str(CONVERTED_FOLDER),
    MAX_CONTENT_LENGTH=MAX_FILE_SIZE,
)

UPLOAD_FOLDER.mkdir(exist_ok=True)
CONVERTED_FOLDER.mkdir(exist_ok=True)
MODEL_FOLDER.mkdir(exist_ok=True)


def extension_from_name(name: str) -> str:
    return name.rsplit(".", 1)[-1].lower() if "." in name else ""


def normalise_extension(ext: str) -> str:
    return ext.lower().lstrip(".")


def parse_positive_int(value: Optional[str]) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        parsed = int(value)
    except ValueError:
        return None
    return parsed if parsed > 0 else None


def resolve_pil_format(ext: str) -> str:
    mapping = {
        "jpg": "JPEG",
        "jpeg": "JPEG",
        "png": "PNG",
        "webp": "WEBP",
        "gif": "GIF",
        "bmp": "BMP",
        "tiff": "TIFF",
        "ico": "ICO",
    }
    return mapping.get(ext.lower(), ext.upper())


def branded_filename(original_name: str, output_ext: str, used: set) -> str:
    base = secure_filename(Path(original_name).stem) or "image"
    candidate = f"{BRAND_NAME}_{base}.{output_ext}"
    index = 2
    while candidate.lower() in used:
        candidate = f"{BRAND_NAME}_{base}_{index}.{output_ext}"
        index += 1
    used.add(candidate.lower())
    return candidate


def init_realesrgan() -> None:
    if REAL_ESRGAN_STATE["ready"] or REAL_ESRGAN_STATE["error"]:
        return
    try:
        from realesrgan import RealESRGANer  # type: ignore
        from basicsr.archs.rrdbnet_arch import RRDBNet  # type: ignore
    except Exception as exc:  # pragma: no cover - optional dependency
        REAL_ESRGAN_STATE["error"] = f"Real-ESRGAN import failed: {exc}"
        return

    model_path = MODEL_FOLDER / "RealESRGAN_x4plus.pth"
    if not model_path.exists():
        REAL_ESRGAN_STATE["error"] = (
            f"Real-ESRGAN model not found at {model_path}. "
            "Download the model and place it in the models directory."
        )
        return

    try:
        model = RRDBNet(
            num_in_ch=3,
            num_out_ch=3,
            num_feat=64,
            num_block=23,
            num_grow_ch=32,
            scale=4,
        )
        engine = RealESRGANer(
            scale=4,
            model_path=str(model_path),
            model=model,
            tile=0,
            tile_pad=10,
            pre_pad=0,
            half=False,
        )
    except Exception as exc:  # pragma: no cover - optional dependency
        REAL_ESRGAN_STATE["error"] = f"Real-ESRGAN initialisation failed: {exc}"
        return

    REAL_ESRGAN_STATE.update({"ready": True, "engine": engine, "error": None})


def enhance_image_if_requested(image: Image.Image, requested: bool) -> Tuple[Image.Image, Optional[str]]:
    if not requested:
        return image, None

    init_realesrgan()
    if REAL_ESRGAN_STATE["ready"] and REAL_ESRGAN_STATE["engine"]:  # pragma: no cover - heavy dependency
        try:
            import numpy as np

            rgb = image.convert("RGB")
            enhanced, _ = REAL_ESRGAN_STATE["engine"].enhance(np.array(rgb), outscale=2)
            return Image.fromarray(enhanced), "Real-ESRGAN x4"
        except Exception as exc:
            REAL_ESRGAN_STATE["error"] = f"Real-ESRGAN inference failed: {exc}"

    upscale = image.resize((image.width * 2, image.height * 2), Image.LANCZOS)
    note = REAL_ESRGAN_STATE["error"] or "Lanczos upscale fallback"
    return upscale, note


def process_convert(image: Image.Image, options: Dict, original_ext: str) -> Tuple[Image.Image, str, Dict]:
    target_format = normalise_extension(options.get("format", "png"))
    if target_format not in CONVERT_FORMATS:
        raise ValueError(f"Unsupported output format: {target_format}")

    output = image
    pil_format = resolve_pil_format(target_format)
    save_kwargs: Dict = {"format": pil_format}

    if target_format in {"jpg", "jpeg"}:
        output = image.convert("RGB")
        save_kwargs.update({"quality": 90, "optimize": True})
    elif target_format == "png":
        save_kwargs.update({"optimize": True})
    elif target_format == "webp":
        save_kwargs.update({"quality": 85, "method": 6})
    elif target_format == "ico":
        size = min(max(image.width, image.height), 256)
        output = image.resize((size, size), Image.LANCZOS)

    return output, target_format, {"save_kwargs": save_kwargs, "original_format": original_ext}


def process_resize(image: Image.Image, options: Dict) -> Tuple[Image.Image, str, Dict]:
    mode = options.get("resize_mode", "pixels")
    maintain_aspect = options.get("maintain_aspect", "true").lower() == "true"

    if mode == "percentage":
        percentage = parse_positive_int(options.get("percentage")) or 100
        width = max(1, int(image.width * (percentage / 100)))
        height = max(1, int(image.height * (percentage / 100)))
    else:
        width = parse_positive_int(options.get("width")) or image.width
        height = parse_positive_int(options.get("height")) or image.height
        if maintain_aspect:
            aspect = image.width / image.height
            if width / height > aspect:
                width = int(height * aspect)
            else:
                height = int(width / aspect)

    resized = image.resize((width, height), Image.LANCZOS)
    return resized, "png", {
        "save_kwargs": {"format": "PNG", "optimize": True},
        "original_size": f"{image.width}x{image.height}",
        "new_size": f"{width}x{height}",
    }


def process_compress(image: Image.Image, options: Dict, original_ext: str) -> Tuple[Image.Image, str, Dict]:
    target_format = normalise_extension(options.get("format", original_ext or "jpg"))
    if target_format not in {"jpg", "jpeg", "png", "webp"}:
        raise ValueError(f"Unsupported compression target: {target_format}")

    quality = parse_positive_int(options.get("quality")) or 85
    quality = max(10, min(quality, 100))

    output = image
    pil_format = resolve_pil_format(target_format)
    save_kwargs: Dict = {"format": pil_format, "optimize": True}

    if target_format in {"jpg", "jpeg"}:
        output = image.convert("RGB")
        save_kwargs.update({"quality": quality})
    elif target_format == "webp":
        save_kwargs.update({"quality": quality, "method": 6})
    elif target_format == "png":
        save_kwargs.pop("optimize", None)
        save_kwargs.update({"compress_level": 9})

    return output, target_format, {"save_kwargs": save_kwargs, "quality": quality}


def process_crop(image: Image.Image, options: Dict) -> Tuple[Image.Image, str, Dict]:
    x = parse_positive_int(options.get("x")) or 0
    y = parse_positive_int(options.get("y")) or 0
    width = parse_positive_int(options.get("width")) or image.width
    height = parse_positive_int(options.get("height")) or image.height

    x = min(max(0, x), image.width - 1)
    y = min(max(0, y), image.height - 1)
    width = min(width, image.width - x)
    height = min(height, image.height - y)

    if width <= 0 or height <= 0:
        raise ValueError("Invalid crop dimensions")

    cropped = image.crop((x, y, x + width, y + height))
    return cropped, "png", {
        "save_kwargs": {"format": "PNG", "optimize": True},
        "crop_area": f"{x},{y},{width},{height}",
    }


def prepare_operation(image: Image.Image, operation: str, options: Dict, original_ext: str) -> Tuple[Image.Image, str, Dict]:
    if operation == "resize":
        return process_resize(image, options)
    if operation == "compress":
        return process_compress(image, options, original_ext)
    if operation == "crop":
        return process_crop(image, options)
    return process_convert(image, options, original_ext)


def handle_file(
    file_storage,
    manifest_entry: Dict,
    operation: str,
    options: Dict,
    enhance: bool,
    job_id: str,
    index: int,
    used_names: set,
) -> Dict:
    original_name = manifest_entry.get("original_name") or file_storage.filename
    original_extension = normalise_extension(
        manifest_entry.get("original_extension") or extension_from_name(original_name)
    )
    incoming_extension = normalise_extension(extension_from_name(file_storage.filename))
    converted_from_heic = bool(manifest_entry.get("converted_from_heic", False))

    if not original_extension:
        original_extension = incoming_extension

    if (
        original_extension not in ALLOWED_EXTENSIONS
        and incoming_extension not in ALLOWED_EXTENSIONS
    ):
        raise ValueError(f"Unsupported file type: {original_extension}")

    if (
        original_extension == "heic"
        and not HEIF_SUPPORTED
        and not converted_from_heic
        and incoming_extension == "heic"
    ):
        raise ValueError("HEIC support requires pillow-heif. Install pillow-heif or enable HEIC conversion in the browser.")

    working_extension = incoming_extension or original_extension or "tmp"
    temp_name = f"{job_id}_{index}.{working_extension}"
    temp_path = UPLOAD_FOLDER / temp_name
    file_storage.save(temp_path)

    try:
        image = Image.open(temp_path)
        if image.mode not in {"RGB", "RGBA", "L", "LA"}:
            image = image.convert("RGBA")

        processed_image, output_ext, extra = prepare_operation(image, operation, options, original_extension)
        processed_image, enhancement_note = enhance_image_if_requested(processed_image, enhance)

        raw_filename = f"{job_id}_{index}.{output_ext}"
        raw_path = CONVERTED_FOLDER / raw_filename
        save_kwargs = extra.get("save_kwargs", {})
        if "format" not in save_kwargs:
            save_kwargs["format"] = resolve_pil_format(output_ext)
        processed_image.save(raw_path, **save_kwargs)

        final_name = branded_filename(original_name, output_ext, used_names)
        final_path = CONVERTED_FOLDER / final_name
        if final_path.exists():
            final_path.unlink()
        raw_path.rename(final_path)

        size_bytes = final_path.stat().st_size
        download_url = url_for("download_file", filename=final_name, download="true")

        return {
            "display_name": final_name,
            "original_name": original_name,
            "input_format": original_extension,
            "output_format": output_ext,
            "size_bytes": size_bytes,
            "download_url": download_url,
            "enhancement": enhancement_note,
            "converted_from_heic": converted_from_heic,
        }
    finally:
        if temp_path.exists():
            temp_path.unlink()


def create_metadata(job_id: str, results: list, bundle: Dict) -> Dict:
    created_at = datetime.utcnow()
    metadata = {
        "id": job_id,
        "created_at": created_at.isoformat() + "Z",
        "created_at_human": created_at.strftime("%d %b %Y • %H:%M UTC"),
        "files": results,
        "bundle": bundle,
        "real_esrgan_status": REAL_ESRGAN_STATE.get("error"),
        "heif_supported": HEIF_SUPPORTED,
    }

    metadata_path = CONVERTED_FOLDER / f"{job_id}{METADATA_SUFFIX}"
    with open(metadata_path, "w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2)

    return metadata


@app.context_processor
def inject_globals():
    return {"current_year": datetime.now().year}


@app.route("/")
def index():
    # Render converter page as the default landing page
    return render_template("converter.html")

@app.route("/simple")
def index_simple():
    return render_template("index_simple.html")


@app.route("/converter")
def converter_page():
    return render_template("converter.html")


@app.route("/resizer")
def resizer_page():
    return render_template("resizer.html")


@app.route("/cropper")
def cropper_page():
    return render_template("cropper.html")


@app.route("/compressor")
def compressor_page():
    return render_template("compressor.html")


@app.route("/qr-generator")
def qr_generator_page():
    return render_template("qr_generator.html")


@app.route("/background-remover")
def background_remover_page():
    return render_template("canva.html")


# More section routes (Coming Soon pages)
@app.route("/meme-generator")
def meme_generator_page():
    return render_template("coming_soon.html", tool_name="Meme Generator")


@app.route("/color-picker")
def color_picker_page():
    return render_template("coming_soon.html", tool_name="Color Picker")


@app.route("/rotate-image")
def rotate_image_page():
    return render_template("coming_soon.html", tool_name="Rotate Image")


@app.route("/flip-image")
def flip_image_page():
    return render_template("coming_soon.html", tool_name="Flip Image")


@app.route("/image-enlarger")
def image_enlarger_page():
    return render_template("coming_soon.html", tool_name="Image Enlarger")


# Resize tool variants
@app.route("/resizer/bulk")
def resizer_bulk_page():
    return render_template("tool_template.html", 
                         tool_name="Bulk Resize", 
                         subtitle="Resize multiple images at once",
                         tool_type="resizer")


@app.route("/resizer/png")
def resizer_png_page():
    return render_template("tool_template.html", 
                         tool_name="Resize PNG", 
                         subtitle="Resize PNG images while maintaining transparency",
                         tool_type="resizer")


@app.route("/resizer/jpg")
def resizer_jpg_page():
    return render_template("tool_template.html", 
                         tool_name="Resize JPG", 
                         subtitle="Resize JPG images with quality control",
                         tool_type="resizer")


@app.route("/resizer/webp")
def resizer_webp_page():
    return render_template("tool_template.html", 
                         tool_name="Resize WebP", 
                         subtitle="Resize WebP images for modern web",
                         tool_type="resizer")


# Crop tool variants
@app.route("/cropper/png")
def cropper_png_page():
    return render_template("tool_template.html", 
                         tool_name="Crop PNG", 
                         subtitle="Crop PNG images with precision",
                         tool_type="cropper")


@app.route("/cropper/webp")
def cropper_webp_page():
    return render_template("tool_template.html", 
                         tool_name="Crop WebP", 
                         subtitle="Crop WebP images easily",
                         tool_type="cropper")


@app.route("/cropper/jpg")
def cropper_jpg_page():
    return render_template("tool_template.html", 
                         tool_name="Crop JPG", 
                         subtitle="Crop JPG images to any size",
                         tool_type="cropper")


# Compress tool variants
@app.route("/compressor/jpeg")
def compressor_jpeg_page():
    return render_template("tool_template.html", 
                         tool_name="Compress JPEG", 
                         subtitle="Reduce JPEG file size without losing quality",
                         tool_type="compressor")


@app.route("/compressor/png")
def compressor_png_page():
    return render_template("tool_template.html", 
                         tool_name="PNG Compressor", 
                         subtitle="Compress PNG images while preserving transparency",
                         tool_type="compressor")


@app.route("/compressor/gif")
def compressor_gif_page():
    return render_template("tool_template.html", 
                         tool_name="GIF Compressor", 
                         subtitle="Optimize animated GIF file sizes",
                         tool_type="compressor")


# Converter tool variants
@app.route("/converter/svg")
def converter_svg_page():
    """SVG Converter - redirects to main converter with SVG format"""
    return render_template("converter.html", default_format="svg")


@app.route("/converter/png")
def converter_png_page():
    """PNG Converter - redirects to main converter with PNG format"""
    return render_template("converter.html", default_format="png")


@app.route("/converter/jpg")
def converter_jpg_page():
    """JPG Converter - redirects to main converter with JPG format"""
    return render_template("converter.html", default_format="jpg")


@app.route("/converter/gif")
def converter_gif_page():
    """GIF Converter - redirects to main converter with GIF format"""
    return render_template("converter.html", default_format="gif")


@app.route("/converter/heic-to-jpg")
def converter_heic_to_jpg_page():
    """HEIC to JPG Converter"""
    return render_template("converter.html", default_format="jpg")


@app.route("/converter/webp-to-png")
def converter_webp_to_png_page():
    """WebP to PNG Converter"""
    return render_template("converter.html", default_format="png")


@app.route("/converter/webp-to-jpg")
def converter_webp_to_jpg_page():
    """WebP to JPG Converter"""
    return render_template("converter.html", default_format="jpg")


@app.route("/converter/png-to-jpg")
def converter_png_to_jpg_page():
    """PNG to JPG Converter"""
    return render_template("converter.html", default_format="jpg")


@app.route("/converter/png-to-svg")
def converter_png_to_svg_page():
    """PNG to SVG Converter"""
    return render_template("converter.html", default_format="svg")


@app.route("/converter/batch")
def converter_batch_page():
    """Batch Converter - same as main converter (supports bulk)"""
    return render_template("converter.html", default_format="jpg")


@app.route("/feedback")
def feedback_page():
    """Feedback form page"""
    return render_template("feedback.html")


@app.route("/request-feature")
def request_feature_page():
    """Feature request form page"""
    return render_template("request_feature.html")


@app.route("/donate")
def donate_page():
    """Donation/support page"""
    return render_template("donate.html")


@app.route("/api/feedback", methods=["POST"])
def api_feedback():
    """API endpoint to handle feedback and feature requests"""
    try:
        data = request.get_json()
        
        # Create feedback directory if it doesn't exist
        feedback_dir = ROOT_DIR / "feedback"
        feedback_dir.mkdir(exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        feedback_type = data.get('type', 'feedback')
        filename = f"{feedback_type}_{timestamp}_{uuid.uuid4().hex[:8]}.json"
        
        # Save feedback to file
        feedback_file = feedback_dir / filename
        with open(feedback_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        return jsonify({"success": True, "message": "Thank you for your feedback!"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/submit-rating", methods=["POST"])
def api_submit_rating():
    """API endpoint to handle user ratings after download"""
    try:
        data = request.get_json()
        
        # Create ratings directory if it doesn't exist
        ratings_dir = ROOT_DIR / "feedback" / "ratings"
        ratings_dir.mkdir(parents=True, exist_ok=True)
        
        # Add timestamp if not provided
        if 'timestamp' not in data:
            data['timestamp'] = datetime.now().isoformat()
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"rating_{timestamp}_{uuid.uuid4().hex[:8]}.json"
        
        # Save rating to file (this can be later synced to Google Sheets)
        rating_file = ratings_dir / filename
        with open(rating_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        # TODO: Integrate with Google Sheets API
        # For now, we save to file. You can add Google Sheets integration here
        
        return jsonify({"success": True, "message": "Thank you for your rating!"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/convert", methods=["POST"])
def api_convert():
    """Simple API endpoint for image conversion"""
    files = request.files.getlist("files[]")
    if not files:
        return jsonify({"success": False, "error": "No files uploaded."}), 400
    
    # Get conversion options
    target_format = normalise_extension(request.form.get("target_format", "jpg"))
    quality = parse_positive_int(request.form.get("quality")) or 80
    width = parse_positive_int(request.form.get("width"))
    height = parse_positive_int(request.form.get("height"))
    keep_aspect = request.form.get("keep_aspect", "true").lower() == "true"
    
    # Validate format
    if target_format not in CONVERT_FORMATS:
        return jsonify({"success": False, "error": f"Unsupported format: {target_format}"}), 400
    
    # Create output directory if it doesn't exist
    out_dir = ROOT_DIR / "static" / "out"
    out_dir.mkdir(parents=True, exist_ok=True)
    
    items = []
    used_names = set()
    
    try:
        for file_storage in files:
            if not file_storage.filename:
                continue
            
            original_name = secure_filename(file_storage.filename)
            original_ext = extension_from_name(original_name)
            
            # Validate file type
            if original_ext not in ALLOWED_EXTENSIONS:
                items.append({
                    "status": "error",
                    "error": f"Unsupported file type: {original_ext}",
                    "url": None
                })
                continue
            
            try:
                # Open image
                image = Image.open(file_storage.stream)
                
                # Apply resizing if dimensions provided
                if width or height:
                    new_width = width or image.width
                    new_height = height or image.height
                    
                    if keep_aspect:
                        aspect = image.width / image.height
                        if new_width / new_height > aspect:
                            new_width = int(new_height * aspect)
                        else:
                            new_height = int(new_width / aspect)
                    
                    image = image.resize((new_width, new_height), Image.LANCZOS)
                
                # Convert format if needed
                output = image
                pil_format = resolve_pil_format(target_format)
                save_kwargs = {"format": pil_format}
                
                if target_format in {"jpg", "jpeg"}:
                    output = image.convert("RGB")
                    save_kwargs.update({"quality": quality, "optimize": True})
                elif target_format == "png":
                    save_kwargs.update({"optimize": True})
                elif target_format == "webp":
                    save_kwargs.update({"quality": quality, "method": 6})
                
                # Generate output filename
                base_name = Path(original_name).stem or "image"
                output_name = branded_filename(original_name, target_format, used_names)
                output_path = out_dir / output_name
                
                # Save image
                output.save(output_path, **save_kwargs)
                
                # Generate URL
                file_url = url_for("static", filename=f"out/{output_name}", _external=False)
                
                items.append({
                    "status": "success",
                    "url": file_url,
                    "filename": output_name
                })
                
            except Exception as e:
                items.append({
                    "status": "error",
                    "error": str(e),
                    "url": None
                })
        
        return jsonify({"success": True, "items": items})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/resize", methods=["POST"])
def api_resize():
    """API endpoint for image resizing"""
    if "image" not in request.files:
        return jsonify({"success": False, "error": "No image uploaded."}), 400
    
    file_storage = request.files["image"]
    if not file_storage.filename:
        return jsonify({"success": False, "error": "No image uploaded."}), 400
    
    # Get resize parameters
    width = parse_positive_int(request.form.get("width"))
    height = parse_positive_int(request.form.get("height"))
    target_format = request.form.get("format", "").lower() or "png"
    
    if not width or not height:
        return jsonify({"success": False, "error": "Width and height are required."}), 400
    
    # Validate format
    if target_format not in CONVERT_FORMATS:
        return jsonify({"success": False, "error": f"Unsupported format: {target_format}"}), 400
    
    # Create output directory
    out_dir = ROOT_DIR / "static" / "out"
    out_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        original_name = secure_filename(file_storage.filename)
        original_ext = extension_from_name(original_name)
        
        # Validate file type
        if original_ext not in ALLOWED_EXTENSIONS:
            return jsonify({"success": False, "error": f"Unsupported file type: {original_ext}"}), 400
        
        # Open and resize image
        image = Image.open(file_storage.stream)
        resized = image.resize((width, height), Image.LANCZOS)
        
        # Convert format if needed
        output = resized
        pil_format = resolve_pil_format(target_format)
        save_kwargs = {"format": pil_format}
        
        if target_format in {"jpg", "jpeg"}:
            output = resized.convert("RGB")
            save_kwargs.update({"quality": 85, "optimize": True})
        elif target_format == "png":
            save_kwargs.update({"optimize": True})
        elif target_format == "webp":
            save_kwargs.update({"quality": 85, "method": 6})
        
        # Generate output filename
        base_name = Path(original_name).stem or "image"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_name = f"{base_name}_resized_{width}x{height}_{timestamp}.{target_format}"
        output_path = out_dir / output_name
        
        # Save image
        output.save(output_path, **save_kwargs)
        
        # Generate URL
        file_url = url_for("static", filename=f"out/{output_name}", _external=False)
        
        return jsonify({
            "success": True,
            "file": file_url,
            "filename": output_name,
            "dimensions": {"width": width, "height": height}
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/crop", methods=["POST"])
def api_crop():
    """API endpoint for image cropping"""
    if "image" not in request.files:
        return jsonify({"success": False, "error": "No image uploaded."}), 400
    
    file_storage = request.files["image"]
    if not file_storage.filename:
        return jsonify({"success": False, "error": "No image uploaded."}), 400
    
    # Get crop parameters
    x = parse_positive_int(request.form.get("x"))
    y = parse_positive_int(request.form.get("y"))
    width = parse_positive_int(request.form.get("width"))
    height = parse_positive_int(request.form.get("height"))
    
    if x is None or y is None or not width or not height:
        return jsonify({"success": False, "error": "Crop coordinates (x, y, width, height) are required."}), 400
    
    # Create output directory
    out_dir = ROOT_DIR / "static" / "out"
    out_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        original_name = secure_filename(file_storage.filename)
        original_ext = extension_from_name(original_name)
        
        # Validate file type
        if original_ext not in ALLOWED_EXTENSIONS:
            return jsonify({"success": False, "error": f"Unsupported file type: {original_ext}"}), 400
        
        # Open image
        image = Image.open(file_storage.stream)
        
        # Validate crop bounds
        if x < 0 or y < 0 or x + width > image.width or y + height > image.height:
            return jsonify({
                "success": False, 
                "error": f"Crop area out of bounds. Image size: {image.width}x{image.height}"
            }), 400
        
        # Crop image
        cropped = image.crop((x, y, x + width, y + height))
        
        # Determine output format
        target_format = original_ext if original_ext in CONVERT_FORMATS else "png"
        pil_format = resolve_pil_format(target_format)
        save_kwargs = {"format": pil_format}
        
        output = cropped
        if target_format in {"jpg", "jpeg"}:
            output = cropped.convert("RGB")
            save_kwargs.update({"quality": 95, "optimize": True})
        elif target_format == "png":
            save_kwargs.update({"optimize": True})
        elif target_format == "webp":
            save_kwargs.update({"quality": 95, "method": 6})
        
        # Generate output filename
        base_name = Path(original_name).stem or "image"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_name = f"{base_name}_cropped_{width}x{height}_{timestamp}.{target_format}"
        output_path = out_dir / output_name
        
        # Save image
        output.save(output_path, **save_kwargs)
        
        # Generate URL
        file_url = url_for("static", filename=f"out/{output_name}", _external=False)
        
        return jsonify({
            "success": True,
            "url": file_url,
            "filename": output_name,
            "dimensions": {"width": width, "height": height},
            "crop": {"x": x, "y": y}
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/compress", methods=["POST"])
def api_compress():
    """API endpoint for image compression"""
    if "image" not in request.files:
        return jsonify({"success": False, "error": "No image uploaded."}), 400
    
    file_storage = request.files["image"]
    if not file_storage.filename:
        return jsonify({"success": False, "error": "No image uploaded."}), 400
    
    # Get compression parameters
    quality = parse_positive_int(request.form.get("quality", "85"))
    target_format = request.form.get("format", "").lower()
    # Support both max_size and target_size for compatibility
    max_size = parse_positive_int(request.form.get("max_size")) or parse_positive_int(request.form.get("target_size"))
    
    if not quality or quality > 100:
        quality = 85
    
    # Clamp quality to reasonable range
    quality = max(1, min(100, quality))
    
    # Create output directory
    out_dir = ROOT_DIR / "static" / "out"
    out_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        original_name = secure_filename(file_storage.filename)
        original_ext = extension_from_name(original_name)
        
        # Validate file type
        if original_ext not in ALLOWED_EXTENSIONS:
            return jsonify({"success": False, "error": f"Unsupported file type: {original_ext}"}), 400
        
        # Open image
        image = Image.open(file_storage.stream)
        
        # Determine output format
        if not target_format or target_format == "original":
            target_format = original_ext if original_ext in CONVERT_FORMATS else "png"
        
        if target_format not in CONVERT_FORMATS:
            return jsonify({"success": False, "error": f"Unsupported format: {target_format}"}), 400
        
        pil_format = resolve_pil_format(target_format)
        output = image
        save_kwargs = {"format": pil_format}
        
        # Format-specific conversions and compression
        if target_format in {"jpg", "jpeg"}:
            output = image.convert("RGB")
            save_kwargs.update({"quality": quality, "optimize": True})
        elif target_format == "png":
            save_kwargs.update({"optimize": True, "compress_level": 9})
        elif target_format == "webp":
            save_kwargs.update({"quality": quality, "method": 6})
        elif target_format == "gif":
            save_kwargs.update({"optimize": True})
        
        # Generate output filename
        base_name = Path(original_name).stem or "image"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_name = f"{base_name}_compressed_{timestamp}.{target_format}"
        output_path = out_dir / output_name
        
        # Save with compression
        from io import BytesIO
        
        # If max_size is specified, iteratively compress to target size
        if max_size and target_format in {"jpg", "jpeg", "webp"}:
            # Binary search for optimal quality
            min_quality = 10
            max_quality = 95
            best_buffer = None
            best_quality = min_quality
            
            # First, try with current quality
            buffer = BytesIO()
            temp_save_kwargs = save_kwargs.copy()
            temp_save_kwargs["quality"] = quality
            output.save(buffer, **temp_save_kwargs)
            
            if buffer.tell() <= max_size:
                # Already within target, use it
                buffer.seek(0)
                with open(output_path, 'wb') as f:
                    f.write(buffer.read())
                best_quality = quality
            else:
                # Use binary search to find optimal quality
                while min_quality <= max_quality:
                    current_quality = (min_quality + max_quality) // 2
                    buffer = BytesIO()
                    temp_save_kwargs = save_kwargs.copy()
                    temp_save_kwargs["quality"] = current_quality
                    output.save(buffer, **temp_save_kwargs)
                    current_size = buffer.tell()
                    
                    if current_size <= max_size:
                        # This quality works, try higher
                        best_buffer = buffer
                        best_quality = current_quality
                        min_quality = current_quality + 1
                    else:
                        # Too large, try lower quality
                        max_quality = current_quality - 1
                
                # Save the best result
                if best_buffer:
                    best_buffer.seek(0)
                    with open(output_path, 'wb') as f:
                        f.write(best_buffer.read())
                else:
                    # Fallback to minimum quality
                    buffer = BytesIO()
                    save_kwargs["quality"] = 10
                    output.save(buffer, **save_kwargs)
                    buffer.seek(0)
                    with open(output_path, 'wb') as f:
                        f.write(buffer.read())
                    best_quality = 10
            
            # Update quality to actual used quality
            quality = best_quality
        else:
            # Standard compression
            output.save(output_path, **save_kwargs)
        
        # Get file size
        file_size = output_path.stat().st_size
        
        # Generate URL
        file_url = url_for("static", filename=f"out/{output_name}", _external=False)
        
        return jsonify({
            "success": True,
            "url": file_url,
            "filename": output_name,
            "size": file_size,
            "quality": quality
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/batch-process", methods=["POST"])
def batch_process():
    files = request.files.getlist("files")
    if not files:
        return jsonify({"success": False, "error": "No files uploaded."}), 400

    manifest_raw = request.form.get("manifest")
    if not manifest_raw:
        return jsonify({"success": False, "error": "Missing manifest payload."}), 400

    try:
        manifest = json.loads(manifest_raw)
    except json.JSONDecodeError:
        return jsonify({"success": False, "error": "Malformed manifest."}), 400

    if len(manifest) != len(files):
        return jsonify({"success": False, "error": "Manifest and files mismatch."}), 400

    heic_present = any(
        normalise_extension(entry.get("original_extension", "")) == "heic" for entry in manifest
    )
    limit = MAX_HEIC_BATCH if heic_present else MAX_SINGLE_BATCH
    if len(files) > limit:
        return (
            jsonify({"success": False, "error": f"Batch limit is {limit} files for this selection."}),
            400,
        )

    operation = request.form.get("operation", "convert")
    options_raw = request.form.get("options", "{}")
    try:
        options = json.loads(options_raw)
    except json.JSONDecodeError:
        return jsonify({"success": False, "error": "Invalid options payload."}), 400

    enhance = request.form.get("enhance", "false").lower() == "true"
    job_id = uuid.uuid4().hex
    used_names: set = set()

    results = []
    try:
        for index, file_storage in enumerate(files):
            entry = manifest[index] if index < len(manifest) else {}
            result = handle_file(
                file_storage=file_storage,
                manifest_entry=entry,
                operation=operation,
                options=options,
                enhance=enhance,
                job_id=job_id,
                index=index,
                used_names=used_names,
            )
            results.append(result)
    except ValueError as err:
        return jsonify({"success": False, "error": str(err)}), 400
    except Exception as err:  # pragma: no cover - runtime guard
        return jsonify({"success": False, "error": f"Processing failed: {err}"}), 500

    if not results:
        return jsonify({"success": False, "error": "No files processed."}), 400

    if len(results) > 1:
        zip_name = f"{job_id}_bundle.zip"
        zip_path = CONVERTED_FOLDER / zip_name
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
            for item in results:
                archive.write(CONVERTED_FOLDER / item["display_name"], arcname=item["display_name"])
        bundle = {
            "type": "zip",
            "filename": zip_name,
            "label": "images (.zip)",
            "button_text": "Download all images",
            "download_url": url_for("download_file", filename=zip_name, download="true"),
        }
    else:
        single = results[0]
        bundle = {
            "type": "single",
            "filename": single["display_name"],
            "label": single["display_name"],
            "button_text": "Download image",
            "download_url": single["download_url"],
        }

    metadata = create_metadata(job_id, results, bundle)
    redirect_url = url_for("download_page", job_id=job_id)
    return jsonify({"success": True, "redirect_url": redirect_url, "job": metadata})


@app.route("/download/<path:filename>")
def download_file(filename: str):
    safe_name = secure_filename(filename)
    file_path = CONVERTED_FOLDER / safe_name
    if not file_path.exists():
        abort(404)
    as_attachment = request.args.get("download", "false").lower() == "true"
    return send_from_directory(CONVERTED_FOLDER, safe_name, as_attachment=as_attachment)


@app.route("/api/remove-bg", methods=["POST"])
def remove_background():
    """
    Simple background removal API endpoint.
    Note: This is a placeholder. For production, integrate rembg or similar library.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "Invalid file"}), 400
    
    try:
        from io import BytesIO
        from flask import send_file
        
        # Read the image
        img = Image.open(file.stream).convert("RGBA")
        
        # Simple placeholder: just return the image with transparent background
        # In production, you would use rembg or similar:
        # from rembg import remove
        # img_no_bg = remove(img)
        
        # For now, create a simple alpha mask based on white background detection
        data = img.getdata()
        new_data = []
        
        for item in data:
            # Change all white (also shades of whites) pixels to transparent
            if item[0] > 200 and item[1] > 200 and item[2] > 200:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        
        img.putdata(new_data)
        
        # Save to memory
        output = BytesIO()
        img.save(output, format="PNG")
        output.seek(0)
        
        return send_file(
            output,
            mimetype="image/png",
            as_attachment=False,
            download_name="removed_bg.png"
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":  # pragma: no cover
    app.run(debug=True, port=5004)
