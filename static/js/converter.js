/**
 * Image Converter - Full Functionality with Bulk Support
 */

// State
const state = {
  currentImage: null,
  originalFile: null,
  originalFiles: [], // For bulk conversion
  originalFormat: '',
  targetFormat: 'png',
  quality: 100,
  isBulkMode: false,
  rotationAngle: 0 // Track rotation
};

// DOM Elements
const elements = {
  // Upload view
  uploadView: document.getElementById('upload-view'),
  drop: document.getElementById('drop'),
  fileInput: document.getElementById('file-input'),
  btnPick: document.getElementById('btn-pick'),
  btnSelect: document.querySelector('.btn-select'),
  dropdownMenu: document.getElementById('dropdown-menu'),
  btnFromDevice: document.getElementById('btn-from-device'),
  btnFromUrl: document.getElementById('btn-from-url'),
  
  // Editor view
  editorView: document.getElementById('editor-view'),
  btnBack: document.getElementById('btn-back'),
  outputFormat: document.getElementById('output-format'),
  qualitySlider: document.getElementById('quality-slider'),
  qualityDisplay: document.getElementById('quality-display'),
  qualityGroup: document.getElementById('quality-group'),
  btnConvert: document.getElementById('btn-convert'),
  
  // Preview
  previewImage: document.getElementById('preview-image'),
  imageName: document.getElementById('image-name'),
  originalFormatBadge: document.getElementById('original-format'),
  targetFormatBadge: document.getElementById('target-format'),
  
  // Preview controls
  btnRotateLeft: document.getElementById('btn-rotate-left'),
  btnRotateRight: document.getElementById('btn-rotate-right'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnInfo: document.getElementById('btn-info'),
  btnClose: document.getElementById('btn-close'),
  
  // Bulk mode
  fileList: document.getElementById('file-list'),
  bulkModeIndicator: document.getElementById('bulk-mode-indicator')
};

// ====================================
// Initialization
// ====================================
function init() {
  // Set default format if provided from URL/template
  const urlParams = new URLSearchParams(window.location.search);
  const defaultFormat = urlParams.get('format') || window.DEFAULT_FORMAT || 'jpg';
  if (defaultFormat && elements.outputFormat) {
    elements.outputFormat.value = defaultFormat;
    state.targetFormat = defaultFormat;
    if (elements.targetFormatBadge) {
      elements.targetFormatBadge.textContent = defaultFormat.toUpperCase();
    }
    updateQualityVisibility();
  }
  
  // Main button - toggle dropdown OR direct pick
  if (elements.btnPick && elements.dropdownMenu) {
    elements.btnPick.addEventListener('click', (e) => {
      e.stopPropagation();
      // Check if dropdown has options, if yes toggle dropdown, else direct pick
      if (elements.btnFromDevice || elements.btnFromUrl) {
        elements.dropdownMenu.classList.toggle('show');
      } else {
        elements.fileInput.click();
      }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      elements.dropdownMenu.classList.remove('show');
    });
  }
  
  // File input click - from device button
  if (elements.btnFromDevice) {
    elements.btnFromDevice.addEventListener('click', () => {
      elements.fileInput.click();
      elements.dropdownMenu.classList.remove('show');
    });
  }
  
  // From URL button
  if (elements.btnFromUrl) {
    elements.btnFromUrl.addEventListener('click', () => {
      const url = prompt('Enter image URL:');
      if (url) {
        fetch(url)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'image.jpg', { type: blob.type });
            handleFiles([file]);
          })
          .catch(err => NotificationModal.error('Failed to load image from URL'));
      }
      elements.dropdownMenu.classList.remove('show');
    });
  }
  
  // File input change
  elements.fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });
  
  // Drag & drop
  elements.drop.addEventListener('dragenter', handleDragEnter);
  elements.drop.addEventListener('dragover', handleDragOver);
  elements.drop.addEventListener('dragleave', handleDragLeave);
  elements.drop.addEventListener('drop', handleDrop);
  
  // Output format change
  elements.outputFormat.addEventListener('change', (e) => {
    state.targetFormat = e.target.value;
    elements.targetFormatBadge.textContent = e.target.value.toUpperCase();
    updateQualityVisibility();
  });
  
  // Quality slider
  elements.qualitySlider.addEventListener('input', (e) => {
    state.quality = parseInt(e.target.value);
    elements.qualityDisplay.textContent = e.target.value;
  });
  
  // Convert button
  elements.btnConvert.addEventListener('click', handleConvert);
  
  // Back button
  elements.btnBack.addEventListener('click', () => {
    showUploadView();
  });
  
  // Preview controls
  elements.btnClose.addEventListener('click', () => {
    showUploadView();
  });
  
  elements.btnRefresh.addEventListener('click', () => {
    if (state.originalFile) {
      state.rotationAngle = 0;
      loadImagePreview(state.originalFile);
    }
  });
  
  elements.btnRotateLeft.addEventListener('click', () => {
    rotateImage(-90);
  });
  
  if (elements.btnRotateRight) {
    elements.btnRotateRight.addEventListener('click', () => {
      rotateImage(90);
    });
  }
  
  elements.btnInfo.addEventListener('click', () => {
    if (state.originalFile && state.currentImage) {
      const info = `
File: ${state.originalFile.name}
Size: ${formatFileSize(state.originalFile.size)}
Type: ${state.originalFile.type}
Dimensions: ${state.currentImage.naturalWidth} × ${state.currentImage.naturalHeight}px
      `.trim();
      NotificationModal.info(info);
    }
  });
  
  // Initial quality visibility
  updateQualityVisibility();
}

// ====================================
// Drag & Drop Handlers
// ====================================
function handleDragEnter(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.drop.classList.add('drag-over');
}

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  
  // Only remove drag-over if leaving the dropzone itself
  if (e.target === elements.drop) {
    elements.drop.classList.remove('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  elements.drop.classList.remove('drag-over');
  
  const files = e.dataTransfer.files;
  handleFiles(files);
}

// ====================================
// File Handling
// ====================================
function handleFiles(fileList) {
  if (!fileList || fileList.length === 0) return;
  
  // Filter image files (allow HEIC/HEIF files too)
  const imageFiles = Array.from(fileList).filter(file => {
    return file.type.startsWith('image/') || 
           file.name.toLowerCase().endsWith('.heic') || 
           file.name.toLowerCase().endsWith('.heif');
  });
  
  if (imageFiles.length === 0) {
    NotificationModal.error('Please select valid image files.');
    return;
  }
  
  // Check max file size (10 MB)
  const maxSize = 10 * 1024 * 1024;
  const validFiles = imageFiles.filter(file => file.size <= maxSize);
  const oversized = imageFiles.filter(file => file.size > maxSize);
  
  if (oversized.length > 0) {
    NotificationModal.warning(`${oversized.length} file(s) exceed 10 MB limit and will be skipped.`);
  }
  
  if (validFiles.length === 0) {
    NotificationModal.error('No valid files to process.');
    return;
  }
  
  // Determine mode: single or bulk
  if (validFiles.length === 1) {
    // Single file mode
    state.isBulkMode = false;
    state.originalFile = validFiles[0];
    state.originalFiles = [validFiles[0]];
    state.originalFormat = getFileExtension(validFiles[0].name);
    state.rotationAngle = 0;
    
    loadImagePreview(validFiles[0]);
    showEditorView();
  } else {
    // Bulk mode
    state.isBulkMode = true;
    state.originalFiles = validFiles;
    state.originalFile = validFiles[0]; // First file for preview
    state.originalFormat = getFileExtension(validFiles[0].name);
    state.rotationAngle = 0;
    
    loadImagePreview(validFiles[0]);
    showEditorView();
    updateBulkModeUI();
  }
}

function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function updateBulkModeUI() {
  if (state.isBulkMode && elements.bulkModeIndicator) {
    elements.bulkModeIndicator.textContent = `Batch: ${state.originalFiles.length} files`;
    elements.bulkModeIndicator.style.display = 'block';
  } else if (elements.bulkModeIndicator) {
    elements.bulkModeIndicator.style.display = 'none';
  }
}

// ====================================
// View Management
// ====================================
function showEditorView() {
  elements.uploadView.setAttribute('hidden', '');
  elements.editorView.removeAttribute('hidden');
}

function showUploadView() {
  elements.editorView.setAttribute('hidden', '');
  elements.uploadView.removeAttribute('hidden');
  
  // Reset state
  state.currentImage = null;
  state.originalFile = null;
  elements.fileInput.value = '';
}

// ====================================
// Image Preview
// ====================================
function loadImagePreview(file) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.currentImage = img;
      elements.previewImage.src = e.target.result;
      elements.previewImage.style.transform = `rotate(${state.rotationAngle}deg)`;
      elements.imageName.textContent = file.name;
      elements.originalFormatBadge.textContent = state.originalFormat.toUpperCase();
      elements.targetFormatBadge.textContent = state.targetFormat.toUpperCase();
    };
    img.src = e.target.result;
  };
  
  reader.readAsDataURL(file);
}

function rotateImage(degrees) {
  state.rotationAngle = (state.rotationAngle + degrees) % 360;
  if (elements.previewImage) {
    elements.previewImage.style.transform = `rotate(${state.rotationAngle}deg)`;
    elements.previewImage.style.transition = 'transform 0.3s ease';
  }
}

// ====================================
// Quality Visibility
// ====================================
function updateQualityVisibility() {
  const lossyFormats = ['jpg', 'jpeg', 'webp'];
  const formatsThatIgnoreQuality = ['pdf', 'bmp', 'png', 'gif', 'tiff', 'ico'];
  
  if (lossyFormats.includes(state.targetFormat)) {
    elements.qualityGroup.style.display = 'block';
  } else {
    elements.qualityGroup.style.display = 'none';
  }
}

// ====================================
// Conversion
// ====================================
async function handleConvert() {
  if (!state.originalFile && state.originalFiles.length === 0) {
    NotificationModal.error('No file selected.');
    return;
  }
  
  // Show loading state
  LoadingModal.show(
    state.isBulkMode ? 'Converting Images' : 'Converting Image', 
    state.isBulkMode ? `Processing ${state.originalFiles.length} images...` : 'Please wait while we convert your image'
  );
  const progressTimer = LoadingModal.simulateProgress(3000);
  
  elements.btnConvert.disabled = true;
  elements.btnConvert.innerHTML = `
    <span class="spinner"></span>
    Converting...
  `;
  
  try {
    // Build FormData
    const formData = new FormData();
    
    // Add all files (single or bulk)
    const filesToConvert = state.isBulkMode ? state.originalFiles : [state.originalFile];
    filesToConvert.forEach(file => {
      formData.append('files[]', file);
    });
    
    formData.append('target_format', state.targetFormat);
    formData.append('quality', state.quality.toString());
    formData.append('rotation', state.rotationAngle.toString());
    formData.append('width', '');
    formData.append('height', '');
    formData.append('keep_aspect', 'true');
    formData.append('fit', 'contain');
    
    // Send to API
    const response = await fetch('/api/convert', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.items && result.items.length > 0) {
      const successItems = result.items.filter(item => item.status === 'success');
      
      if (successItems.length > 0) {
        // Success - trigger downloads
        LoadingModal.updateMessage(`✓ ${successItems.length} file(s) converted!`);
        LoadingModal.updateProgress(100);
        await sleep(500);
        
        // Download all successful files
        for (const item of successItems) {
          downloadFile(item.url, item.filename);
          await sleep(300); // Small delay between downloads
        }
        
        // Hide loading and show success
        await LoadingModal.hide();
        NotificationModal.success(`Successfully converted ${successItems.length} file(s)!`);
        
        // Show rating modal after download
        setTimeout(() => showRatingModal(), 1500);
      } else {
        throw new Error('Conversion failed for all files');
      }
    } else {
      throw new Error(result.error || 'Conversion failed');
    }
    
  } catch (error) {
    console.error('Conversion error:', error);
    await LoadingModal.hide();
    NotificationModal.error(`Conversion failed: ${error.message}`);
  } finally {
    // Re-enable convert button
    elements.btnConvert.disabled = false;
    elements.btnConvert.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Convert
    `;
  }
}

// ====================================
// Utility Functions
// ====================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ====================================
// Download
// ====================================
function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'converted_image';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ====================================
// Rating Modal
// ====================================
function showRatingModal() {
  // Create rating modal
  const modal = document.createElement('div');
  modal.id = 'rating-modal';
  modal.className = 'rating-modal show';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10002;display:flex;align-items:center;justify-content:center;';
  
  modal.innerHTML = `
    <div class="rating-overlay" style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);"></div>
    <div class="rating-dialog" style="position:relative;background:var(--panel,#2a2d34);border:1px solid var(--border,#3e424a);border-radius:16px;padding:32px;max-width:450px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);text-align:center;">
      <div class="rating-header" style="margin-bottom:20px;">
        <div style="font-size:48px;margin-bottom:12px;">🎉</div>
        <h3 style="color:var(--text,#e0e0e0);font-size:20px;margin-bottom:8px;">Conversion Complete!</h3>
        <p style="color:var(--text-muted,#9ca3af);font-size:14px;">How was your experience?</p>
      </div>
      <div class="rating-stars" style="display:flex;gap:12px;justify-content:center;margin:24px 0;">
        <button class="star-btn" data-rating="1" style="background:none;border:none;font-size:36px;cursor:pointer;transition:transform 0.2s;">⭐</button>
        <button class="star-btn" data-rating="2" style="background:none;border:none;font-size:36px;cursor:pointer;transition:transform 0.2s;">⭐</button>
        <button class="star-btn" data-rating="3" style="background:none;border:none;font-size:36px;cursor:pointer;transition:transform 0.2s;">⭐</button>
        <button class="star-btn" data-rating="4" style="background:none;border:none;font-size:36px;cursor:pointer;transition:transform 0.2s;">⭐</button>
        <button class="star-btn" data-rating="5" style="background:none;border:none;font-size:36px;cursor:pointer;transition:transform 0.2s;">⭐</button>
      </div>
      <textarea id="rating-feedback" placeholder="Tell us more about your experience (optional)" style="width:100%;min-height:80px;padding:12px;border:1px solid var(--border,#3e424a);border-radius:8px;background:var(--bg,#1a1d23);color:var(--text,#e0e0e0);font-family:inherit;font-size:14px;margin-bottom:20px;resize:vertical;"></textarea>
      <div class="rating-buttons" style="display:flex;gap:12px;justify-content:center;">
        <button class="rating-btn-skip" style="padding:10px 24px;border:1px solid var(--border,#3e424a);border-radius:8px;background:var(--bg,#1a1d23);color:var(--text,#e0e0e0);cursor:pointer;font-size:14px;">Skip</button>
        <button class="rating-btn-submit" style="padding:10px 32px;border:none;border-radius:8px;background:var(--accent,#6ea8fe);color:white;cursor:pointer;font-size:14px;font-weight:500;">Submit</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  let selectedRating = 0;
  const starBtns = modal.querySelectorAll('.star-btn');
  
  // Star hover and click effects
  starBtns.forEach((btn, index) => {
    btn.addEventListener('mouseenter', () => {
      starBtns.forEach((b, i) => {
        b.style.filter = i <= index ? 'grayscale(0)' : 'grayscale(1)';
        b.style.transform = i <= index ? 'scale(1.1)' : 'scale(1)';
      });
    });
    
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.dataset.rating);
      starBtns.forEach((b, i) => {
        b.style.filter = i < selectedRating ? 'grayscale(0)' : 'grayscale(1)';
      });
    });
  });
  
  modal.querySelector('.rating-stars').addEventListener('mouseleave', () => {
    starBtns.forEach((b, i) => {
      b.style.filter = i < selectedRating ? 'grayscale(0)' : 'grayscale(1)';
      b.style.transform = 'scale(1)';
    });
  });
  
  // Initialize all stars as grayscale
  starBtns.forEach(b => b.style.filter = 'grayscale(1)');
  
  // Submit rating
  modal.querySelector('.rating-btn-submit').addEventListener('click', async () => {
    if (selectedRating === 0) {
      NotificationModal.warning('Please select a rating');
      return;
    }
    
    const feedback = modal.querySelector('#rating-feedback').value;
    
    try {
      // Submit to backend (which will store in Google Sheets)
      await fetch('/api/submit-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: selectedRating,
          feedback: feedback,
          page: 'converter',
          timestamp: new Date().toISOString()
        })
      });
      
      NotificationModal.success('Thank you for your feedback!');
      document.body.removeChild(modal);
    } catch (error) {
      NotificationModal.error('Failed to submit feedback');
    }
  });
  
  // Skip button
  modal.querySelector('.rating-btn-skip').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Close on overlay click
  modal.querySelector('.rating-overlay').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

// ====================================
// Utilities
// ====================================
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// ====================================
// Start App
// ====================================
document.addEventListener('DOMContentLoaded', init);
