// State
let currentImage = null;
let originalWidth = 0;
let originalHeight = 0;
let aspectRatio = 1;

// Social media presets
const socialPresets = {
    facebook: {
        profile: { width: 170, height: 170, name: 'Profile (170 X 170)' },
        cover: { width: 820, height: 312, name: 'Cover Photo (820 X 312)' },
        post: { width: 1200, height: 630, name: 'Post (1200 X 630)' },
        event: { width: 1920, height: 1080, name: 'Event (1920 X 1080)' }
    },
    instagram: {
        profile: { width: 110, height: 110, name: 'Profile (110 X 110)' },
        post: { width: 1080, height: 1080, name: 'Post (1080 X 1080)' },
        story: { width: 1080, height: 1920, name: 'Story (1080 X 1920)' },
        landscape: { width: 1080, height: 566, name: 'Landscape (1080 X 566)' }
    },
    twitter: {
        profile: { width: 400, height: 400, name: 'Profile (400 X 400)' },
        header: { width: 1500, height: 500, name: 'Header (1500 X 500)' },
        post: { width: 1200, height: 675, name: 'Post (1200 X 675)' }
    },
    youtube: {
        profile: { width: 800, height: 800, name: 'Profile (800 X 800)' },
        banner: { width: 2560, height: 1440, name: 'Banner (2560 X 1440)' },
        thumbnail: { width: 1280, height: 720, name: 'Thumbnail (1280 X 720)' }
    },
    linkedin: {
        profile: { width: 400, height: 400, name: 'Profile (400 X 400)' },
        banner: { width: 1584, height: 396, name: 'Banner (1584 X 396)' },
        post: { width: 1200, height: 627, name: 'Post (1200 X 627)' }
    }
};

// DOM Elements
const uploadView = document.getElementById('uploadView');
const editorView = document.getElementById('editorView');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const uploadMenu = document.getElementById('uploadMenu');
const previewImage = document.getElementById('previewImage');
const fileName = document.getElementById('fileName');
const originalSize = document.getElementById('originalSize');
const newSize = document.getElementById('newSize');

// Tab elements
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// By Size inputs
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const lockAspect = document.getElementById('lockAspect');
const unitSelect = document.getElementById('unitSelect');

// Percentage input
const percentageInput = document.getElementById('percentageInput');

// Social media inputs
const platformSelect = document.getElementById('platformSelect');
const presetSelect = document.getElementById('presetSelect');
const socialWidthInput = document.getElementById('socialWidthInput');
const socialHeightInput = document.getElementById('socialHeightInput');
const lockSocialAspect = document.getElementById('lockSocialAspect');

// Export inputs
const exportToggle = document.getElementById('exportToggle');
const exportContent = document.getElementById('exportContent');
const exportBtn = document.getElementById('exportBtn');
const saveFormat = document.getElementById('saveFormat');

// Toolbar buttons
const addMoreBtn = document.getElementById('addMoreBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const refreshBtn = document.getElementById('refreshBtn');
const removeBtn = document.getElementById('removeBtn');

// Event Listeners - Upload
selectBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    uploadMenu?.classList.toggle('show');
    selectBtn?.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (uploadMenu && !uploadMenu.contains(e.target) && e.target !== selectBtn) {
        uploadMenu.classList.remove('show');
        selectBtn?.classList.remove('active');
    }
});

dropzone?.addEventListener('click', () => {
    fileInput?.click();
});

dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone?.classList.add('drag-over');
});

dropzone?.addEventListener('dragleave', () => {
    dropzone?.classList.remove('drag-over');
});

dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone?.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Event Listeners - Tabs
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active content
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');
    });
});

// Event Listeners - By Size
widthInput?.addEventListener('input', () => {
    if (lockAspect?.checked && currentImage) {
        const newHeight = Math.round(widthInput.value / aspectRatio);
        if (heightInput) heightInput.value = newHeight;
        updatePreviewSize();
    }
});

heightInput?.addEventListener('input', () => {
    if (lockAspect?.checked && currentImage) {
        const newWidth = Math.round(heightInput.value * aspectRatio);
        if (widthInput) widthInput.value = newWidth;
        updatePreviewSize();
    }
});

lockAspect?.addEventListener('change', () => {
    if (lockAspect.checked && widthInput?.value && currentImage) {
        const newHeight = Math.round(widthInput.value / aspectRatio);
        if (heightInput) heightInput.value = newHeight;
        updatePreviewSize();
    }
});

// Event Listeners - Percentage
percentageInput?.addEventListener('input', () => {
    if (currentImage) {
        const percentage = parseFloat(percentageInput.value) || 100;
        const newWidth = Math.round(originalWidth * (percentage / 100));
        const newHeight = Math.round(originalHeight * (percentage / 100));
        updatePreviewSize(newWidth, newHeight);
    }
});

// Event Listeners - Social Media
platformSelect?.addEventListener('change', updateSocialPresets);
presetSelect?.addEventListener('change', updateSocialDimensions);

// Event Listeners - Export
exportToggle?.addEventListener('click', () => {
    exportContent?.classList.toggle('hidden');
    exportToggle?.classList.toggle('collapsed');
});

exportBtn?.addEventListener('click', handleExport);

// Event Listeners - Toolbar
addMoreBtn?.addEventListener('click', () => {
    fileInput.click();
});

clearAllBtn?.addEventListener('click', () => {
    NotificationModal.confirm('Are you sure you want to clear all images?', () => {
        resetEditor();
    });
});

refreshBtn?.addEventListener('click', () => {
    if (currentImage) {
        loadImagePreview(currentImage);
    }
});

removeBtn?.addEventListener('click', () => {
    NotificationModal.confirm('Remove this image?', () => {
        resetEditor();
    });
});

// Functions
function handleFile(file) {
    // Support HEIC format
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    const isValid = file.type.startsWith('image/') || validTypes.some(t => file.type === t);
    
    if (!isValid) {
        NotificationModal.error('Please select a valid image file');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        NotificationModal.error('File size must be less than 10 MB');
        return;
    }

    currentImage = file;
    loadImagePreview(file);
}

function loadImagePreview(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalWidth = img.width;
            originalHeight = img.height;
            aspectRatio = img.width / img.height;
            
            previewImage.src = e.target.result;
            fileName.textContent = file.name;
            originalSize.textContent = `${img.width} X ${img.height}`;
            
            // Initialize inputs
            widthInput.value = img.width;
            heightInput.value = img.height;
            percentageInput.value = 100;
            
            updatePreviewSize(img.width, img.height);
            
            // Switch to editor view
            uploadView.style.display = 'none';
            editorView.style.display = 'flex';
        };
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

function updatePreviewSize(width, height) {
    if (!width) width = parseInt(widthInput.value) || originalWidth;
    if (!height) height = parseInt(heightInput.value) || originalHeight;
    
    newSize.textContent = `${width} X ${height}`;
}

function updateSocialPresets() {
    const platform = platformSelect.value;
    const presets = socialPresets[platform];
    
    // Clear and populate preset dropdown
    presetSelect.innerHTML = '';
    Object.keys(presets).forEach(key => {
        const preset = presets[key];
        const option = document.createElement('option');
        option.value = key;
        option.textContent = preset.name;
        presetSelect.appendChild(option);
    });
    
    updateSocialDimensions();
}

function updateSocialDimensions() {
    const platform = platformSelect.value;
    const preset = presetSelect.value;
    const dimensions = socialPresets[platform][preset];
    
    socialWidthInput.value = dimensions.width;
    socialHeightInput.value = dimensions.height;
    
    updatePreviewSize(dimensions.width, dimensions.height);
}

async function handleExport() {
    if (!currentImage) {
        NotificationModal.error('Please select an image first');
        return;
    }

    const activeTab = document.querySelector('.tab.active').dataset.tab;
    let targetWidth, targetHeight;

    if (activeTab === 'bySize') {
        targetWidth = parseInt(widthInput.value);
        targetHeight = parseInt(heightInput.value);
    } else if (activeTab === 'asPercentage') {
        const percentage = parseFloat(percentageInput.value) || 100;
        targetWidth = Math.round(originalWidth * (percentage / 100));
        targetHeight = Math.round(originalHeight * (percentage / 100));
    } else if (activeTab === 'socialMedia') {
        targetWidth = parseInt(socialWidthInput.value);
        targetHeight = parseInt(socialHeightInput.value);
    }

    if (!targetWidth || !targetHeight) {
        NotificationModal.error('Please enter valid dimensions');
        return;
    }

    try {
        exportBtn.disabled = true;
        exportBtn.textContent = 'Processing...';

        // Show loading modal
        LoadingModal.show('Resizing Image', 'Please wait while we resize your image');
        LoadingModal.simulateProgress(2500);

        const formData = new FormData();
        formData.append('image', currentImage);
        formData.append('width', targetWidth);
        formData.append('height', targetHeight);
        
        const format = saveFormat.value === 'original' 
            ? currentImage.name.split('.').pop().toLowerCase() 
            : saveFormat.value;
        formData.append('format', format);

        const response = await fetch('/api/resize', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Resize failed');
        }

        const result = await response.json();
        
        if (result.success && result.file) {
            // Update loading progress
            LoadingModal.updateProgress(100);
            LoadingModal.updateMessage('✓ Resize complete!');
            
            // Download the resized image
            const a = document.createElement('a');
            a.href = result.file;
            a.download = result.filename || 'resized_image.' + format;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Hide loading after download
            await LoadingModal.hide();
            NotificationModal.success('Image resized successfully!');
        } else {
            throw new Error(result.error || 'Resize failed');
        }

    } catch (error) {
        console.error('Export error:', error);
        await LoadingModal.hide();
        NotificationModal.error('Failed to resize image: ' + error.message);
    } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = 'Export →';
    }
}

function resetEditor() {
    currentImage = null;
    originalWidth = 0;
    originalHeight = 0;
    aspectRatio = 1;
    
    previewImage.src = '';
    fileName.textContent = '';
    originalSize.textContent = '';
    newSize.textContent = '';
    
    widthInput.value = '';
    heightInput.value = '';
    percentageInput.value = 100;
    
    uploadView.style.display = 'block';
    editorView.style.display = 'none';
    
    fileInput.value = '';
}

// Initialize social media presets
updateSocialPresets();



// === URL Import Modal (shared) ===
(function(){
  const urlModal = document.getElementById('urlModal');
  const openBtn = document.getElementById('openUrlModal');
  const closeBtn = document.getElementById('closeUrlModal');
  const cancelBtn = document.getElementById('cancelUrl');
  const importBtn = document.getElementById('importUrlBtn');
  const urlInput = document.getElementById('imageUrl');
  const fileInput = document.getElementById('fileInput');

  function openModal(){
    if(!urlModal) return;
    urlModal.hidden = false;
    if (urlInput) { urlInput.value=''; urlInput.focus(); }
  }
  function closeModal(){
    if(!urlModal) return;
    urlModal.hidden = true;
  }
  if (openBtn){ openBtn.addEventListener('click', (e)=>{ e.stopPropagation(); closeAllMenus(); openModal(); }); }

  if (closeBtn){ closeBtn.addEventListener('click', closeModal); }
  if (cancelBtn){ cancelBtn.addEventListener('click', closeModal); }
  document.addEventListener('keydown', (e)=>{ if(!urlModal?.hidden && e.key==='Escape') closeModal(); });

  async function fetchAsFile(url){
    const res = await fetch(url, { mode:'cors' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error('Not an image');
    const name = (()=>{
      try { return new URL(url).pathname.split('/').pop() || 'image'; } catch { return 'image'; }
    })();
    return new File([blob], name, { type: blob.type });
  }

  if (importBtn){
    importBtn.addEventListener('click', async () => {
      const url = (urlInput?.value || '').trim();
      if (!url) return;
      try{
        importBtn.disabled = true;
        importBtn.textContent = 'Importing...';
        const file = await fetchAsFile(url);
        closeModal();
        if (typeof handleFile === 'function') {
          handleFile(file);
        } else if (fileInput) {
          // Fallback: use DataTransfer to trigger change
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch(err){
        NotificationModal.error('Could not import that URL. Try a direct link to JPG, PNG, or WebP.');
      } finally {
        importBtn.disabled = false;
        importBtn.textContent = 'Import';
      }
    });
  }

  // helper to close upload menu if present
  function closeAllMenus(){
    const selectBtn = document.getElementById('selectBtn');
    const uploadMenu = document.getElementById('uploadMenu');
    if (uploadMenu && selectBtn){
      uploadMenu.classList.remove('show');
      selectBtn.classList.remove('active');
      selectBtn.setAttribute('aria-expanded','false');
    }
  }
})();