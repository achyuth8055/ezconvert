// Cropper State
let canvas = null;
let originalImage = null;
let cropRect = null;
let currentFile = null;
let aspectRatioLocked = false;

// Aspect ratio presets
const aspectRatios = {
    'freeform': null,
    '1:1': 1,
    '16:9': 16/9,
    '4:3': 4/3,
    '3:2': 3/2,
    '21:9': 21/9,
    '9:16': 9/16,
    '3:4': 3/4,
    '2:3': 2/3
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeUploadView();
});

// Upload View
function initializeUploadView() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const btnSelect = document.querySelector('.btn-select');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    // File input handler
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });
    
    // Dropzone click
    dropzone.addEventListener('click', (e) => {
        if (!e.target.closest('.upload-dropdown')) {
            fileInput.click();
        }
    });
    
    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });
    
    // Dropdown toggle
    btnSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        btnSelect.classList.toggle('active');
        dropdownMenu.classList.toggle('show');
    });
    
    // Close dropdown on outside click
    document.addEventListener('click', () => {
        btnSelect.classList.remove('active');
        dropdownMenu.classList.remove('show');
    });
    
    // Dropdown items
    const fromDeviceBtn = document.querySelector('.dropdown-item[onclick*="fileInput"]');
    if (fromDeviceBtn) {
        fromDeviceBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    const dropboxBtn = document.getElementById('dropboxBtn');
    if (dropboxBtn) {
        dropboxBtn.addEventListener('click', () => {
            handleDropboxUpload();
        });
    }
    
    const googleDriveBtn = document.getElementById('googleDriveBtn');
    if (googleDriveBtn) {
        googleDriveBtn.addEventListener('click', () => {
            handleGoogleDriveUpload();
        });
    }
    
    const oneDriveBtn = document.getElementById('oneDriveBtn');
    if (oneDriveBtn) {
        oneDriveBtn.addEventListener('click', () => {
            handleOneDriveUpload();
        });
    }
    
    const urlBtn = document.getElementById('urlBtn');
    if (urlBtn) {
        urlBtn.addEventListener('click', () => {
            showURLModal();
        });
    }
}

// Handle files
function handleFiles(files) {
    const file = files[0];
    
    // Validate file type (including HEIC)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/heic', 'image/heif'];
    const isValid = validTypes.includes(file.type) || file.type.startsWith('image/');
    if (!isValid) {
        NotificationModal.error('Please select a valid image file (PNG, JPG, GIF, WebP, BMP, HEIC)');
        return;
    }
    
    // Validate file size (10 MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        NotificationModal.error('File size exceeds 10 MB limit. Please sign up for larger files.');
        return;
    }
    
    currentFile = file;
    loadImageToEditor(file);
}

// Load image to editor
function loadImageToEditor(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        // Hide upload view, show editor
        document.querySelector('.cropper-upload').style.display = 'none';
        document.querySelector('.crop-editor').style.display = 'grid';
        
        // Initialize Fabric.js canvas
        initializeCanvas(e.target.result);
    };
    
    reader.readAsDataURL(file);
}

// Initialize Fabric.js Canvas
function initializeCanvas(imageDataUrl) {
    const canvasEl = document.getElementById('cropCanvas');
    
    // Create canvas with enhanced settings
    canvas = new fabric.Canvas('cropCanvas', {
        backgroundColor: '#2d3139',
        selection: true,
        enableRetinaScaling: true,
        preserveObjectStacking: true,
        renderOnAddRemove: true,
        controlsAboveOverlay: true
    });
    
    // Load image
    fabric.Image.fromURL(imageDataUrl, (img) => {
        originalImage = img;
        
        // Calculate canvas size to fit viewport
        const maxWidth = window.innerWidth - 310 - 48; // Sidebar + padding
        const maxHeight = window.innerHeight - 56 - 48; // Navbar + padding
        
        let scale = 1;
        if (img.width > maxWidth || img.height > maxHeight) {
            const scaleX = maxWidth / img.width;
            const scaleY = maxHeight / img.height;
            scale = Math.min(scaleX, scaleY, 1);
        }
        
        // Set canvas dimensions
        canvas.setWidth(img.width * scale);
        canvas.setHeight(img.height * scale);
        
        // Add image to canvas
        img.set({
            left: 0,
            top: 0,
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: false
        });
        
        canvas.add(img);
        
        // Create crop rectangle
        createCropRectangle(canvas.width, canvas.height, scale);
        
        // Initialize editor controls
        initializeEditorControls(scale);
        
        canvas.renderAll();
    });
}

// Create crop rectangle
function createCropRectangle(canvasWidth, canvasHeight, scale) {
    // Default crop: 80% of canvas
    const width = canvasWidth * 0.8;
    const height = canvasHeight * 0.8;
    const left = (canvasWidth - width) / 2;
    const top = (canvasHeight - height) / 2;
    
    // Create grid lines (rule of thirds)
    const gridGroup = new fabric.Group([], {
        left: left,
        top: top,
        width: width,
        height: height,
        selectable: false,
        evented: false
    });
    
    // Vertical grid lines
    for (let i = 1; i <= 2; i++) {
        const line = new fabric.Line([width * i / 3, 0, width * i / 3, height], {
            stroke: 'rgba(255, 255, 255, 0.4)',
            strokeWidth: 1,
            selectable: false,
            evented: false
        });
        gridGroup.addWithUpdate(line);
    }
    
    // Horizontal grid lines
    for (let i = 1; i <= 2; i++) {
        const line = new fabric.Line([0, height * i / 3, width, height * i / 3], {
            stroke: 'rgba(255, 255, 255, 0.4)',
            strokeWidth: 1,
            selectable: false,
            evented: false
        });
        gridGroup.addWithUpdate(line);
    }
    
    cropRect = new fabric.Rect({
        left: left,
        top: top,
        width: width,
        height: height,
        fill: 'rgba(0, 0, 0, 0.3)',
        stroke: '#6ea8fe',
        strokeWidth: 2,
        cornerColor: '#6ea8fe',
        cornerSize: 12,
        transparentCorners: false,
        lockRotation: true,
        hasRotatingPoint: false,
        cornerStyle: 'circle',
        borderColor: '#6ea8fe',
        borderScaleFactor: 2
    });
    
    canvas.add(gridGroup);
    canvas.add(cropRect);
    canvas.setActiveObject(cropRect);
    
    // Update grid when rectangle changes
    const updateGrid = () => {
        gridGroup.set({
            left: cropRect.left,
            top: cropRect.top,
            scaleX: cropRect.scaleX,
            scaleY: cropRect.scaleY
        });
        canvas.renderAll();
        updateInputsFromRect(scale);
    };
    
    cropRect.on('modified', updateGrid);
    cropRect.on('scaling', updateGrid);
    cropRect.on('moving', updateGrid);
    
    // Store grid reference for cleanup
    cropRect.gridGroup = gridGroup;
    
    // Update inputs initially
    updateInputsFromRect(scale);
}

// Update inputs from rectangle
function updateInputsFromRect(scale) {
    const width = Math.round(cropRect.width * cropRect.scaleX / scale);
    const height = Math.round(cropRect.height * cropRect.scaleY / scale);
    const x = Math.round(cropRect.left / scale);
    const y = Math.round(cropRect.top / scale);
    
    document.getElementById('cropWidth').value = width;
    document.getElementById('cropHeight').value = height;
    document.getElementById('positionX').value = x;
    document.getElementById('positionY').value = y;
}

// Initialize editor controls
function initializeEditorControls(scale) {
    const widthInput = document.getElementById('cropWidth');
    const heightInput = document.getElementById('cropHeight');
    const aspectRatioSelect = document.getElementById('aspectRatio');
    const positionXInput = document.getElementById('positionX');
    const positionYInput = document.getElementById('positionY');
    const resetBtn = document.getElementById('resetBtn');
    const cropBtn = document.getElementById('cropBtn');
    
    // Width input
    widthInput.addEventListener('input', () => {
        const width = parseInt(widthInput.value) || 0;
        cropRect.set({
            width: width * scale,
            scaleX: 1
        });
        
        // Maintain aspect ratio if locked
        const currentRatio = aspectRatios[aspectRatioSelect.value];
        if (currentRatio) {
            const height = width / currentRatio;
            cropRect.set({
                height: height * scale,
                scaleY: 1
            });
            heightInput.value = Math.round(height);
        }
        
        canvas.renderAll();
    });
    
    // Height input
    heightInput.addEventListener('input', () => {
        const height = parseInt(heightInput.value) || 0;
        cropRect.set({
            height: height * scale,
            scaleY: 1
        });
        
        // Maintain aspect ratio if locked
        const currentRatio = aspectRatios[aspectRatioSelect.value];
        if (currentRatio) {
            const width = height * currentRatio;
            cropRect.set({
                width: width * scale,
                scaleX: 1
            });
            widthInput.value = Math.round(width);
        }
        
        canvas.renderAll();
    });
    
    // Aspect ratio select
    aspectRatioSelect.addEventListener('change', () => {
        const ratio = aspectRatios[aspectRatioSelect.value];
        
        if (ratio) {
            // Lock to aspect ratio
            const currentWidth = cropRect.width * cropRect.scaleX;
            const newHeight = currentWidth / ratio;
            cropRect.set({
                height: newHeight,
                scaleY: 1
            });
            
            updateInputsFromRect(scale);
            canvas.renderAll();
        }
    });
    
    // Position X input
    positionXInput.addEventListener('input', () => {
        const x = parseInt(positionXInput.value) || 0;
        cropRect.set({
            left: x * scale
        });
        canvas.renderAll();
    });
    
    // Position Y input
    positionYInput.addEventListener('input', () => {
        const y = parseInt(positionYInput.value) || 0;
        cropRect.set({
            top: y * scale
        });
        canvas.renderAll();
    });
    
    // Reset button
    resetBtn.addEventListener('click', () => {
        createCropRectangle(canvas.width, canvas.height, scale);
        aspectRatioSelect.value = 'freeform';
        canvas.renderAll();
    });
    
    // Crop button
    cropBtn.addEventListener('click', () => {
        handleCrop(scale);
    });
}

// Handle crop
async function handleCrop(scale) {
    try {
        // Get crop coordinates in original image dimensions
        const cropX = Math.round(cropRect.left / scale);
        const cropY = Math.round(cropRect.top / scale);
        const cropWidth = Math.round(cropRect.width * cropRect.scaleX / scale);
        const cropHeight = Math.round(cropRect.height * cropRect.scaleY / scale);
        
        // Create FormData
        const formData = new FormData();
        formData.append('image', currentFile);
        formData.append('x', cropX);
        formData.append('y', cropY);
        formData.append('width', cropWidth);
        formData.append('height', cropHeight);
        
        // Show loading modal
        LoadingModal.show('Cropping Image', 'Please wait while we crop your image');
        LoadingModal.simulateProgress(2000);
        
        const cropBtn = document.getElementById('cropBtn');
        cropBtn.textContent = 'Cropping...';
        cropBtn.disabled = true;
        
        // Send to backend
        const response = await fetch('/api/crop', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Crop failed');
        }
        
        const result = await response.json();
        
        // Update loading progress
        LoadingModal.updateProgress(100);
        LoadingModal.updateMessage('✓ Crop complete!');
        
        // Download cropped image
        const link = document.createElement('a');
        link.href = result.url;
        link.download = result.filename;
        link.click();
        
        // Hide loading and reset button
        await LoadingModal.hide();
        cropBtn.textContent = 'Crop →';
        cropBtn.disabled = false;
        
        // Show success message
        NotificationModal.success('Image cropped successfully!');
        
    } catch (error) {
        console.error('Crop error:', error);
        await LoadingModal.hide();
        NotificationModal.error('Failed to crop image. Please try again.');
        
        const cropBtn = document.getElementById('cropBtn');
        cropBtn.textContent = 'Crop →';
        cropBtn.disabled = false;
    }
}

// Cloud upload handlers
function handleDropboxUpload() {
    if (typeof Dropbox !== 'undefined') {
        Dropbox.choose({
            success: (files) => {
                fetch(files[0].link)
                    .then(res => res.blob())
                    .then(blob => {
                        const file = new File([blob], files[0].name, { type: blob.type });
                        handleFiles([file]);
                    });
            },
            linkType: 'direct',
            multiselect: false,
            extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
        });
    } else {
        NotificationModal.info('Dropbox integration not configured');
    }
}

function handleGoogleDriveUpload() {
    NotificationModal.info('Google Drive integration coming soon!');
}

function handleOneDriveUpload() {
    NotificationModal.info('OneDrive integration coming soon!');
}

// URL Modal
function showURLModal() {
    const modal = document.getElementById('urlModal');
    modal.style.display = 'flex';
    
    const urlInput = document.getElementById('urlInput');
    const cancelBtn = document.getElementById('cancelURL');
    const loadBtn = document.getElementById('loadURL');
    
    urlInput.value = '';
    urlInput.focus();
    
    // Cancel handler
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    // Load handler
    loadBtn.onclick = () => {
        const url = urlInput.value.trim();
        if (!url) {
            NotificationModal.error('Please enter a valid URL');
            return;
        }
        
        loadImageFromURL(url);
        modal.style.display = 'none';
    };
    
    // Close on overlay click
    modal.querySelector('.modal-overlay').onclick = () => {
        modal.style.display = 'none';
    };
}

function loadImageFromURL(url) {
    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error('Failed to load image');
            return res.blob();
        })
        .then(blob => {
            const file = new File([blob], 'image.jpg', { type: blob.type });
            handleFiles([file]);
        })
        .catch(error => {
            console.error('URL load error:', error);
            NotificationModal.error('Failed to load image from URL. Please check the URL and try again.');
        });
}
