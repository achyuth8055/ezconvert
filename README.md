# ImageForge - Professional Image Processing Suite

A full-stack web application for converting, resizing, cropping, compressing images, removing backgrounds, and more with a modern UI.

## ✨ Features

- **� Convert** - Format conversion (PNG, JPG, WebP, **PDF**, GIF, HEIC, BMP, TIFF, ICO) with rotation
- **�📐 Resize** - By pixels, percentage, or social media presets
- **✂️ Crop** - Interactive cropping with aspect ratio presets
- **🗜️ Compress** - Quality-based compression with before/after comparison slider
- **🎨 Background Remover** - AI-powered background removal with design editor
- **📱 QR Generator** - Create QR codes with customization options
- **🌐 Responsive** - Works perfectly on desktop, tablet, and mobile devices
- **⚡ Real-time Processing** - Fast image processing with loading animations
- **� Privacy-Focused** - All processing done locally on your server

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/achyuth8055/ezconvert.git
cd ezconvert
```

### 2. Create Virtual Environment

```bash
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Application

```bash
python app.py
```

### 5. Open in Browser

```
http://localhost:5004
```

## � Dependencies

Core packages installed automatically:
- **Flask 3.0.3** - Web framework
- **Pillow 10.3.0** - Image processing
- **reportlab 4.0.7** - PDF generation
- **rembg 2.0.50** - AI background removal
- **qrcode 7.4.2** - QR code generation
- **Werkzeug 3.0.3** - WSGI utilities

Optional (installed if available):
- **numpy** - Enhanced image processing performance

## 📁 Project Structure

```
ImageForge/
├── app.py                    # Main Flask application
├── requirements.txt          # Python dependencies
├── README.md                 # This file
├── .gitignore               # Git ignore rules
├── static/
│   ├── css/                 # Stylesheets for each tool
│   │   ├── main.css
│   │   ├── converter.css
│   │   ├── resizer.css
│   │   ├── compressor.css
│   │   ├── cropper.css
│   │   └── canva.css
│   ├── js/                  # JavaScript for each tool
│   │   ├── loading.js       # Loading modal system
│   │   ├── converter.js
│   │   ├── resizer.js
│   │   ├── compressor.js
│   │   ├── cropper.js
│   │   └── canva.js
│   └── assets/              # Images and icons
├── templates/               # HTML templates
│   ├── index.html          # Homepage
│   ├── converter.html
│   ├── resizer.html
│   ├── compressor.html
│   ├── cropper.html
│   └── canva.html
├── uploads/                 # Temporary upload storage (auto-created)
├── converted/              # Processed files (auto-created)
└── venv/                   # Virtual environment (not committed)
```

## 🛠️ Tool Features

### Image Converter
- Convert between 9 formats: PNG, JPG, WebP, PDF, GIF, HEIC, BMP, TIFF, ICO
- Rotate images (90°, 180°, 270°)
- Adjust quality for lossy formats
- Bulk conversion support
- Maintains EXIF data where possible

### Image Resizer
- Resize by exact dimensions (width × height)
- Resize by percentage
- Social media presets (Instagram, Facebook, Twitter, etc.)
- Maintain or customize aspect ratio
- Format conversion during resize

### Image Compressor
- Quality-based compression (1-100%)
- Target file size compression (auto-adjust quality)
- Before/after comparison slider
- Real-time file size preview
- Multiple format support

### Image Cropper
- Interactive crop area selection
- Aspect ratio presets (Square, 16:9, 4:3, etc.)
- Custom aspect ratios
- Preview before crop
- Download in multiple formats

### Background Remover
- AI-powered background removal
- Design canvas editor
- Add text, shapes, and filters
- Layer management
- Export as PNG or JPG

### QR Code Generator
- URL, text, contact, WiFi, email QR codes
- Customizable colors and size
- Logo/icon embedding
- Multiple export formats

## 🌐 Deployment

### Local Development
Already covered in Quick Start above.

### Production Deployment

**Important**: Flask's built-in server is for development only. For production, use:

#### Option 1: Gunicorn (Linux/macOS)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5004 app:app
```

#### Option 2: Waitress (Windows/Cross-platform)
```bash
pip install waitress
waitress-serve --port=5004 app:app
```

#### Option 3: Docker
```bash
# Create Dockerfile
docker build -t imageforge .
docker run -p 5004:5004 imageforge
```

### Environment Variables (Optional)
Create `.env` file for custom configuration:
```env
FLASK_ENV=production
SECRET_KEY=your-secret-key-here
MAX_CONTENT_LENGTH=10485760  # 10MB
PORT=5004
```

## 🔒 Security Notes

- Maximum file size: 10MB (configurable in `app.py`)
- Uploaded files are temporarily stored and auto-cleaned
- No data is sent to external servers (except rembg AI model download on first use)
- CSRF protection recommended for production
- Consider adding rate limiting for public deployments

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port 5004
lsof -ti:5004 | xargs kill -9
```

### PIL/Pillow Issues
```bash
pip uninstall Pillow
pip install Pillow --no-cache-dir
```

### rembg Model Download
First background removal will download AI model (~176MB). Requires internet connection once.

### Virtual Environment Not Activating
```bash
# Ensure you're in the project directory
cd path/to/ezconvert

# Recreate venv
rm -rf venv
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate      # Windows
```

## � Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## � License

This project is open source and available under the MIT License.

## 👨‍💻 Author

**Achyuth**
- GitHub: [@achyuth8055](https://github.com/achyuth8055)
- Repository: [ezconvert](https://github.com/achyuth8055/ezconvert)

## 🙏 Acknowledgments

- PIL/Pillow for image processing
- rembg for AI background removal
- ReportLab for PDF generation
- Flask framework and community

## 🎨 Design

- **Color Scheme**: Dark theme with blue accents
- **Typography**: System fonts (SF Pro, Segoe UI)
- **Responsive**: Mobile-first approach
- **Animations**: Smooth transitions (200ms)

## 🔧 Development

### Run in Debug Mode
```bash
python app.py
```

### Access Different Pages
- Homepage: `http://localhost:5004/`
- Resizer: `http://localhost:5004/resizer`
- Cropper: `http://localhost:5004/cropper`
- Compressor: `http://localhost:5004/compressor`
- Converter: `http://localhost:5004/converter`

## 📝 Next Steps

1. **Update Tool UIs** - Match all tool pages to screenshots
2. **Add Fabric.js** - Integrate for crop tool
3. **Cloud APIs** - Configure Dropbox/Google Drive APIs
4. **Testing** - Cross-browser and mobile testing
5. **Optimization** - Performance and loading times

## 🤝 Contributing

1. Follow the design guidelines in `IMPLEMENTATION_GUIDE.md`
2. Maintain UI consistency across all tools
3. Use existing CSS variables and components
4. Test thoroughly before committing

## 📄 License

This project is for educational/portfolio purposes.

## 👤 Author

Built following professional design specifications.

---

**Homepage Status**: ✅ Complete  
**Tool Pages Status**: 🚧 In Progress  
**Last Updated**: October 31, 2025
