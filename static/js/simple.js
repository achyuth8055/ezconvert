/**
 * Simple Image Processing App
 * Handles file selection, drag & drop, tool switching, and API conversion
 */

// ====================================
// State Management
// ====================================
const state = {
  files: [],
  tool: 'resize',
  opts: {
    fmt: 'jpg',
    quality: 80,
    width: '',
    height: '',
    keep: true
  }
};

// ====================================
// DOM Elements
// ====================================
const elements = {
  // Dropzone
  drop: document.getElementById('drop'),
  fileInput: document.getElementById('file-input'),
  btnPick: document.getElementById('btn-pick'),
  btnCaret: document.getElementById('btn-caret'),
  menu: document.getElementById('menu'),
  
  // Title
  pageTitle: document.getElementById('page-title'),
  
  // Options Panel
  controls: document.getElementById('controls'),
  fmt: document.getElementById('fmt'),
  quality: document.getElementById('quality'),
  qualityValue: document.getElementById('quality-value'),
  width: document.getElementById('width'),
  height: document.getElementById('height'),
  keep: document.getElementById('keep'),
  btnConvert: document.getElementById('btn-convert'),
  
  // Queue Panel
  queue: document.getElementById('queue'),
  list: document.getElementById('list')
};

// ====================================
// Tool Configuration
// ====================================
const TOOL_TITLES = {
  resize: 'Image Resizer',
  crop: 'Image Cropper',
  compress: 'Image Compressor',
  convert: 'Image Converter'
};

const TOOL_SUBTITLES = {
  resize: 'Easily resize images online for free.',
  crop: 'Crop images to the perfect size.',
  compress: 'Reduce image file size without losing quality.',
  convert: 'Convert images between formats.'
};

// ====================================
// Initialization
// ====================================
function init() {
  // File input click
  elements.btnPick.addEventListener('click', () => {
    elements.fileInput.click();
  });
  
  // Caret menu toggle
  elements.btnCaret.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!elements.menu.contains(e.target) && !elements.btnCaret.contains(e.target)) {
      closeMenu();
    }
  });
  
  // Menu item selection
  const menuItems = elements.menu.querySelectorAll('[data-tool]');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const tool = item.dataset.tool;
      setTool(tool);
      closeMenu();
    });
  });
  
  // Navigation menu buttons (for future dropdown menus)
  const navButtons = document.querySelectorAll('.menu .link[data-menu]');
  navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      // Future: open specific tool dropdown
      console.log('Menu clicked:', button.dataset.menu);
    });
  });
  
  // File input change
  elements.fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });
  
  // Drag & drop
  elements.drop.addEventListener('dragenter', handleDragEnter);
  elements.drop.addEventListener('dragover', handleDragOver);
  elements.drop.addEventListener('dragleave', handleDragLeave);
  elements.drop.addEventListener('drop', handleDrop);
  
  // Options panel inputs
  elements.fmt.addEventListener('change', (e) => {
    state.opts.fmt = e.target.value;
    updateQualityVisibility();
  });
  
  elements.quality.addEventListener('input', (e) => {
    state.opts.quality = parseInt(e.target.value);
    elements.qualityValue.textContent = e.target.value;
  });
  
  elements.width.addEventListener('input', (e) => {
    state.opts.width = e.target.value;
  });
  
  elements.height.addEventListener('input', (e) => {
    state.opts.height = e.target.value;
  });
  
  elements.keep.addEventListener('change', (e) => {
    state.opts.keep = e.target.checked;
  });
  
  // Convert button
  elements.btnConvert.addEventListener('click', handleConvert);
  
  // Initial quality visibility
  updateQualityVisibility();
}

// ====================================
// Menu Management
// ====================================
function toggleMenu() {
  const isOpen = elements.menu.classList.contains('show');
  if (isOpen) {
    closeMenu();
  } else {
    elements.menu.classList.add('show');
    elements.menu.removeAttribute('hidden');
    elements.btnCaret.setAttribute('aria-expanded', 'true');
  }
}

function closeMenu() {
  elements.menu.classList.remove('show');
  elements.btnCaret.setAttribute('aria-expanded', 'false');
  // Keep a small delay before hiding to allow animation
  setTimeout(() => {
    if (!elements.menu.classList.contains('show')) {
      elements.menu.setAttribute('hidden', '');
    }
  }, 200);
}

// ====================================
// Tool Selection
// ====================================
function setTool(tool) {
  state.tool = tool;
  
  // Update title and subtitle
  elements.pageTitle.textContent = TOOL_TITLES[tool] || 'Image Resizer';
  
  const subtitle = document.querySelector('.subtitle');
  if (subtitle) {
    subtitle.textContent = TOOL_SUBTITLES[tool] || 'Process your images easily.';
  }
}

// ====================================
// Quality Visibility
// ====================================
function updateQualityVisibility() {
  const lossyFormats = ['jpg', 'jpeg', 'webp', 'avif'];
  const qualityGroup = elements.quality.closest('.form-group');
  
  if (lossyFormats.includes(state.opts.fmt)) {
    qualityGroup.style.display = 'flex';
  } else {
    qualityGroup.style.display = 'none';
  }
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
  
  // Only remove if leaving the drop area entirely
  if (e.target === elements.drop || e.target === elements.drop.querySelector('.drop-inner')) {
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
  
  // Filter image files
  const imageFiles = Array.from(fileList).filter(file => {
    return file.type.startsWith('image/');
  });
  
  if (imageFiles.length === 0) {
    NotificationModal.error('Please select valid image files.');
    return;
  }
  
  // Check max file size (10 MB)
  const maxSize = 10 * 1024 * 1024;
  const oversized = imageFiles.filter(file => file.size > maxSize);
  
  if (oversized.length > 0) {
    NotificationModal.warning(`Some files exceed the 10 MB limit and will be skipped: ${oversized.map(f => f.name).join(', ')}`);
  }
  
  // Add valid files to state
  const validFiles = imageFiles.filter(file => file.size <= maxSize);
  
  validFiles.forEach(file => {
    const id = generateId();
    state.files.push({
      id,
      file,
      status: 'queued',
      url: null,
      preview: URL.createObjectURL(file)
    });
  });
  
  // Show panels
  showPanels();
  
  // Render queue
  renderQueue();
}

// ====================================
// UI State Management
// ====================================
function showPanels() {
  if (state.files.length > 0) {
    const wasHidden = elements.controls.hasAttribute('hidden');
    elements.controls.removeAttribute('hidden');
    elements.queue.removeAttribute('hidden');
    
    // Add animation on first show
    if (wasHidden) {
      elements.controls.setAttribute('data-animate', 'true');
      elements.queue.setAttribute('data-animate', 'true');
    }
  }
}

function hidePanels() {
  elements.controls.setAttribute('hidden', '');
  elements.queue.setAttribute('hidden', '');
  elements.controls.removeAttribute('data-animate');
  elements.queue.removeAttribute('data-animate');
}

// ====================================
// Queue Rendering
// ====================================
function renderQueue() {
  elements.list.innerHTML = '';
  
  state.files.forEach(fileData => {
    const item = createQueueItem(fileData);
    elements.list.appendChild(item);
  });
}

function createQueueItem(fileData) {
  const item = document.createElement('div');
  item.className = `item ${fileData.status}`;
  item.dataset.id = fileData.id;
  
  // Thumbnail
  const thumb = document.createElement('img');
  thumb.className = 'thumb';
  thumb.src = fileData.preview;
  thumb.alt = fileData.file.name;
  
  // Info
  const info = document.createElement('div');
  info.className = 'item-info';
  
  const name = document.createElement('div');
  name.className = 'item-name';
  name.textContent = fileData.file.name;
  name.title = fileData.file.name;
  
  const size = document.createElement('div');
  size.className = 'item-size';
  size.textContent = formatFileSize(fileData.file.size);
  
  info.appendChild(name);
  info.appendChild(size);
  
  // Status badge
  const badge = document.createElement('span');
  badge.className = `badge ${fileData.status}`;
  badge.textContent = fileData.status === 'done' ? 'completed' : fileData.status;
  
  // Actions
  const actions = document.createElement('div');
  actions.className = 'item-actions';
  
  // Download button (shown when done)
  if (fileData.status === 'done' && fileData.url) {
    const downloadBtn = createIconButton('download', 'Download', () => {
      downloadFile(fileData.url, fileData.file.name);
    });
    actions.appendChild(downloadBtn);
  }
  
  // Remove button
  const removeBtn = createIconButton('remove', 'Remove', () => {
    removeFile(fileData.id);
  });
  actions.appendChild(removeBtn);
  
  // Assemble
  item.appendChild(thumb);
  item.appendChild(info);
  item.appendChild(badge);
  item.appendChild(actions);
  
  return item;
}

function createIconButton(type, label, onClick) {
  const btn = document.createElement('button');
  btn.className = `btn-icon ${type}`;
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.addEventListener('click', onClick);
  
  const icons = {
    download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M7 10L12 15L17 10M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    remove: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  };
  
  btn.innerHTML = icons[type] || '';
  
  return btn;
}

// ====================================
// File Operations
// ====================================
function removeFile(id) {
  const index = state.files.findIndex(f => f.id === id);
  if (index !== -1) {
    // Revoke object URL
    if (state.files[index].preview) {
      URL.revokeObjectURL(state.files[index].preview);
    }
    
    state.files.splice(index, 1);
  }
  
  // Re-render queue
  renderQueue();
  
  // Hide panels if no files
  if (state.files.length === 0) {
    hidePanels();
  }
}

function downloadFile(url, originalName) {
  const a = document.createElement('a');
  a.href = url;
  a.download = originalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ====================================
// Conversion Processing
// ====================================
async function handleConvert() {
  if (state.files.length === 0) {
    NotificationModal.error('Please select files first.');
    return;
  }
  
  // Check if any files are already processing
  const processing = state.files.some(f => f.status === 'processing');
  if (processing) {
    NotificationModal.warning('Processing already in progress.');
    return;
  }
  
  // Show loading overlay
  const overlay = showLoadingOverlay();
  
  // Update all files to processing
  state.files.forEach(f => {
    if (f.status === 'queued') {
      f.status = 'processing';
    }
  });
  renderQueue();
  
  // Disable convert button with spinner
  elements.btnConvert.disabled = true;
  elements.btnConvert.innerHTML = `
    <span class="spinner"></span>
    Processing...
  `;
  
  // Build FormData
  const formData = new FormData();
  
  const processingFiles = state.files.filter(f => f.status === 'processing');
  processingFiles.forEach((fileData) => {
    formData.append('files[]', fileData.file);
  });
  
  formData.append('target_format', state.opts.fmt);
  formData.append('quality', state.opts.quality.toString());
  formData.append('width', state.opts.width || '');
  formData.append('height', state.opts.height || '');
  formData.append('keep_aspect', state.opts.keep ? 'true' : 'false');
  formData.append('fit', 'contain');
  
  try {
    updateLoadingMessage(overlay, `Processing ${processingFiles.length} file${processingFiles.length > 1 ? 's' : ''}...`);
    
    const response = await fetch('/api/convert', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    updateLoadingMessage(overlay, 'Finalizing...');
    
    const result = await response.json();
    
    if (result.success && result.items) {
      // Update file status and URLs
      result.items.forEach((item, index) => {
        const fileData = state.files.find(f => f.status === 'processing');
        if (fileData) {
          fileData.status = item.status === 'success' ? 'done' : 'error';
          fileData.url = item.url || null;
        }
      });
      
      // Show success message briefly
      updateLoadingMessage(overlay, '✓ Conversion complete!');
      await sleep(800);
    } else {
      throw new Error(result.error || 'Conversion failed');
    }
    
  } catch (error) {
    console.error('Conversion error:', error);
    hideLoadingOverlay(overlay);
    NotificationModal.error(`Conversion failed: ${error.message}`);
    
    // Mark processing files as error
    state.files.forEach(f => {
      if (f.status === 'processing') {
        f.status = 'error';
      }
    });
  } finally {
    // Hide loading overlay
    hideLoadingOverlay(overlay);
    
    // Re-enable convert button
    elements.btnConvert.disabled = false;
    elements.btnConvert.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Start Processing
    `;
    
    // Re-render queue
    renderQueue();
  }
}

// ====================================
// Loading Overlay
// ====================================
function showLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'processing-overlay';
  overlay.innerHTML = `
    <div class="processing-modal">
      <div class="spinner large"></div>
      <h3 class="title">Processing Images</h3>
      <p class="message">Please wait...</p>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function hideLoadingOverlay(overlay) {
  if (overlay && overlay.parentNode) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}

function updateLoadingMessage(overlay, message) {
  if (overlay) {
    const messageEl = overlay.querySelector('.message');
    if (messageEl) {
      messageEl.textContent = message;
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ====================================
// Utilities
// ====================================
function generateId() {
  return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

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
