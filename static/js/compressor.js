// Compressor State
let currentFile = null;
let originalImage = null;
let compressedBlob = null;
let zoomScale = 1;
let isDragging = false;
let sliderPosition = 50; // percentage

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
    document.getElementById('fromDevice').addEventListener('click', () => {
        fileInput.click();
    });
    
    document.getElementById('fromDropbox').addEventListener('click', () => {
        handleDropboxUpload();
    });
    
    document.getElementById('fromGoogleDrive').addEventListener('click', () => {
        handleGoogleDriveUpload();
    });
    
    document.getElementById('fromOneDrive').addEventListener('click', () => {
        handleOneDriveUpload();
    });
    
    document.getElementById('fromURL').addEventListener('click', () => {
        showURLModal();
    });
}

// Handle files
function handleFiles(files) {
    const file = files[0];
    
    // Validate file type (including HEIC)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    const isValid = validTypes.includes(file.type) || file.type.startsWith('image/');
    if (!isValid) {
        NotificationModal.error('Please select a valid image file (PNG, JPG, GIF, WebP, HEIC)');
        return;
    }
    
    // Validate file size (10 MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        NotificationModal.error('File size exceeds 10 MB limit. Please sign up for larger files.');
        return;
    }
    
    currentFile = file;
    
    // Show loading modal
    LoadingModal.show('Uploading Image...', 'Please wait while we load your image');
    LoadingModal.simulateProgress(2000, () => {
        loadImageToEditor(file);
    });
}

// Load image to editor
function loadImageToEditor(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        originalImage = e.target.result;
        
        // Hide loading modal
        LoadingModal.hide();
        
        // Hide upload view, show editor
        document.querySelector('.compress-upload').style.display = 'none';
        document.querySelector('.compress-editor').style.display = 'grid';
        
        // Initialize editor
        initializeEditor();
    };
    
    reader.readAsDataURL(file);
}

// Initialize Editor
function initializeEditor() {
    // Set thumbnail
    const thumbnailImg = document.getElementById('thumbnailImg');
    thumbnailImg.src = originalImage;
    
    // Set original preview
    const originalImg = document.getElementById('originalImage');
    originalImg.src = originalImage;
    
    // Update file info
    updateFileInfo();
    
    // Initialize controls
    initializeControls();
    
    // Initialize comparison slider (hidden initially)
    initializeComparisonSlider();
}

// Update file info
function updateFileInfo() {
    const originalSizeEl = document.getElementById('originalSize');
    const dimensionsEl = document.getElementById('imageDimensions');
    
    // Original size
    originalSizeEl.textContent = formatFileSize(currentFile.size);
    
    // Dimensions
    const img = new Image();
    img.onload = () => {
        dimensionsEl.textContent = `${img.width} × ${img.height}`;
    };
    img.src = originalImage;
}

// Initialize controls
function initializeControls() {
    const qualitySlider = document.getElementById('qualitySlider');
    const qualityValue = document.getElementById('qualityValue');
    const maxSizeToggle = document.getElementById('maxSizeToggle');
    const maxSizeControls = document.getElementById('maxSizeControls');
    const compressBtn = document.getElementById('compressBtn');
    const newImageBtn = document.getElementById('newImageBtn');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const fitScreenBtn = document.getElementById('fitScreen');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Quality slider
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = `${e.target.value}%`;
    });
    
    // Max size toggle
    maxSizeToggle.addEventListener('change', (e) => {
        maxSizeControls.style.display = e.target.checked ? 'block' : 'none';
        // If toggled on, disable quality slider as we'll calculate it
        if (e.target.checked) {
            qualitySlider.disabled = true;
            qualitySlider.style.opacity = '0.5';
        } else {
            qualitySlider.disabled = false;
            qualitySlider.style.opacity = '1';
        }
    });
    
    // Compress button
    compressBtn.addEventListener('click', () => {
        handleCompress();
    });
    
    // New image button
    newImageBtn.addEventListener('click', () => {
        resetToUpload();
    });
    
    // Zoom controls
    zoomInBtn.addEventListener('click', () => {
        zoomIn();
    });
    
    zoomOutBtn.addEventListener('click', () => {
        zoomOut();
    });
    
    fitScreenBtn.addEventListener('click', () => {
        fitToScreen();
    });
    
    // Download button
    downloadBtn.addEventListener('click', () => {
        downloadCompressedImage();
    });
}

// Handle compress
async function handleCompress() {
    try {
        const quality = parseInt(document.getElementById('qualitySlider').value);
        const format = document.getElementById('formatSelect').value;
        const maxSizeToggle = document.getElementById('maxSizeToggle').checked;
        const maxSize = maxSizeToggle ? parseInt(document.getElementById('maxSizeInput').value) : null;
        const sizeUnit = document.getElementById('sizeUnitSelect').value;
        
        // Show loading modal
        LoadingModal.show('Compressing Image...', 'Please wait while we compress your image to your desired size');
        const progressTimer = LoadingModal.simulateProgress(3000);
        
        // Show loading on button too
        const compressBtn = document.getElementById('compressBtn');
        compressBtn.textContent = 'Compressing...';
        compressBtn.disabled = true;
        
        // Create FormData
        const formData = new FormData();
        formData.append('image', currentFile);
        
        if (maxSizeToggle && maxSize) {
            // Target size mode - let backend calculate quality
            const targetBytes = sizeUnit === 'mb' ? maxSize * 1024 * 1024 : maxSize * 1024;
            formData.append('target_size', targetBytes);
            if (format !== 'original') {
                formData.append('format', format);
            }
        } else {
            // Quality mode
            formData.append('quality', quality);
            if (format !== 'original') {
                formData.append('format', format);
            }
        }
        
        // Send to backend
        const response = await fetch('/api/compress', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Compression failed');
        }
        
        LoadingModal.updateMessage('Preparing your compressed image...');
        
        const result = await response.json();
        
        // Load compressed image
        const compressedImg = document.getElementById('compressedImage');
        compressedImg.src = result.url;
        
        // Wait for image to load before showing comparison
        await new Promise((resolve) => {
            compressedImg.onload = resolve;
        });
        
        // Update compressed size
        const compressedSizeEl = document.getElementById('compressedSize');
        compressedSizeEl.textContent = formatFileSize(result.size);
        
        // Update compression badge
        const compressionPercent = Math.round((1 - result.size / currentFile.size) * 100);
        document.getElementById('compressionBadge').textContent = `-${compressionPercent}%`;
        
        // Store blob for download
        fetch(result.url)
            .then(res => res.blob())
            .then(blob => {
                compressedBlob = blob;
            });
        
        // Show comparison view
        showComparisonView();
        
        // Show download button
        document.getElementById('downloadBtn').style.display = 'block';
        
        // Hide loading modal
        await LoadingModal.hide();
        
        // Reset button
        compressBtn.textContent = 'Compress Image →';
        compressBtn.disabled = false;
        
    } catch (error) {
        console.error('Compression error:', error);
        
        // Hide loading modal
        await LoadingModal.hide();
        
        NotificationModal.error('Failed to compress image. Please try again.');
        
        const compressBtn = document.getElementById('compressBtn');
        compressBtn.textContent = 'Compress Image →';
        compressBtn.disabled = false;
    }
}

// Show comparison view
function showComparisonView() {
    const afterSide = document.getElementById('afterSide');
    const comparisonSlider = document.getElementById('comparisonSlider');
    const comparisonHint = document.getElementById('comparisonHint');
    
    afterSide.style.display = 'flex';
    comparisonSlider.style.display = 'block';
    
    // Show hint for 3 seconds
    if (comparisonHint) {
        comparisonHint.style.display = 'block';
        setTimeout(() => {
            comparisonHint.style.display = 'none';
        }, 3000);
    }
    
    // Reset slider to middle
    updateSliderPosition(50);
}

// Initialize comparison slider
function initializeComparisonSlider() {
    const slider = document.getElementById('comparisonSlider');
    const container = document.getElementById('comparisonContainer');
    
    if (!slider || !container) return;
    
    slider.addEventListener('mousedown', startDragging);
    container.addEventListener('mousedown', (e) => {
        if (e.target === container || e.target.closest('.comparison-view')) {
            startDragging(e);
        }
    });
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDragging);
    
    // Touch support
    slider.addEventListener('touchstart', startDragging);
    container.addEventListener('touchstart', (e) => {
        if (e.target === container || e.target.closest('.comparison-view')) {
            startDragging(e);
        }
    });
    
    document.addEventListener('touchmove', onDrag);
    document.addEventListener('touchend', stopDragging);
}

function startDragging(e) {
    // Only allow dragging if comparison is visible
    const afterSide = document.getElementById('afterSide');
    if (afterSide.style.display === 'none') return;
    
    isDragging = true;
    e.preventDefault();
}

function stopDragging() {
    isDragging = false;
}

function onDrag(e) {
    if (!isDragging) return;
    
    e.preventDefault(); // Prevent scrolling on touch devices
    
    const container = document.getElementById('comparisonContainer');
    const rect = container.getBoundingClientRect();
    
    let clientX;
    if (e.type.includes('touch')) {
        clientX = e.touches[0].clientX;
    } else {
        clientX = e.clientX;
    }
    
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    updateSliderPosition(percentage);
}

function updateSliderPosition(percentage) {
    sliderPosition = percentage;
    
    const slider = document.getElementById('comparisonSlider');
    const afterSide = document.getElementById('afterSide');
    
    slider.style.left = `${percentage}%`;
    afterSide.style.clipPath = `inset(0 0 0 ${percentage}%)`;
}

// Switch tab (removed - using comparison view now)
function switchTab(tab) {
    // This function is no longer used but kept for compatibility
    console.log('Tab switching disabled - using comparison view');
}

// Zoom controls
function zoomIn() {
    zoomScale = Math.min(zoomScale * 1.2, 3);
    updateZoom();
}

function zoomOut() {
    zoomScale = Math.max(zoomScale / 1.2, 0.5);
    updateZoom();
}

function fitToScreen() {
    zoomScale = 1;
    updateZoom();
}

function resetZoom() {
    zoomScale = 1;
    updateZoom();
}

function updateZoom() {
    const images = document.querySelectorAll('.comparison-side img');
    images.forEach(img => {
        img.style.transform = `scale(${zoomScale})`;
    });
    
    document.getElementById('zoomLevel').textContent = `${Math.round(zoomScale * 100)}%`;
}

// Download compressed image
async function downloadCompressedImage() {
    if (!compressedBlob) {
        NotificationModal.error('No compressed image available');
        return;
    }
    
    // Show loading modal
    LoadingModal.show('Preparing Download...', 'Your compressed image is ready');
    LoadingModal.updateProgress(50);
    
    const format = document.getElementById('formatSelect').value;
    const extension = format === 'original' ? currentFile.name.split('.').pop() : format;
    const filename = `${currentFile.name.split('.')[0]}_compressed.${extension}`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(compressedBlob);
    link.download = filename;
    
    LoadingModal.updateProgress(100);
    
    // Small delay for user feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    link.click();
    
    // Hide loading modal
    await LoadingModal.hide();
}

// Reset to upload
function resetToUpload() {
    document.querySelector('.compress-upload').style.display = 'block';
    document.querySelector('.compress-editor').style.display = 'none';
    
    // Reset state
    currentFile = null;
    originalImage = null;
    compressedBlob = null;
    zoomScale = 1;
    isDragging = false;
    sliderPosition = 50;
    
    // Reset controls
    document.getElementById('qualitySlider').value = 85;
    document.getElementById('qualityValue').textContent = '85%';
    document.getElementById('qualitySlider').disabled = false;
    document.getElementById('qualitySlider').style.opacity = '1';
    document.getElementById('maxSizeToggle').checked = false;
    document.getElementById('maxSizeControls').style.display = 'none';
    document.getElementById('formatSelect').value = 'original';
    document.getElementById('downloadBtn').style.display = 'none';
    
    // Hide comparison view
    document.getElementById('afterSide').style.display = 'none';
    document.getElementById('comparisonSlider').style.display = 'none';
    
    // Clear file input
    document.getElementById('fileInput').value = '';
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
            extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
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

// Utility: Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
