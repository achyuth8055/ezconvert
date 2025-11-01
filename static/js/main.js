/**
 * ImageResizer - Main Homepage JavaScript
 * Handles file upload, dropdowns, modals, and cloud storage integrations
 */

// =====================================
// DOM Elements
// =====================================
const elements = {
  // Buttons
  btnSelect: document.getElementById('btn-select'),
  btnDropdown: document.getElementById('btn-dropdown'),
  
  // Upload
  fileInput: document.getElementById('file-input'),
  dropZone: document.getElementById('drop-zone'),
  uploadMenu: document.getElementById('upload-menu'),
  
  // Modal
  urlModal: document.getElementById('url-modal'),
  urlForm: document.getElementById('url-form'),
  imageUrlInput: document.getElementById('image-url'),
  
  // Menu items
  menuItems: document.querySelectorAll('.menu-item[data-source]'),
  modalCloseButtons: document.querySelectorAll('.modal-close'),
  
  // Chat button
  chatBtn: document.querySelector('.chat-btn')
};

// =====================================
// State
// =====================================
const state = {
  menuOpen: false,
  selectedFiles: []
};

// =====================================
// Initialization
// =====================================
function init() {
  setupEventListeners();
  console.log('ImageResizer initialized');
}

function setupEventListeners() {
  // Select Images button
  elements.btnSelect.addEventListener('click', () => {
    elements.fileInput.click();
  });
  
  // Dropdown toggle
  elements.btnDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleUploadMenu();
  });
  
 // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!elements.uploadMenu.contains(e.target) && 
        !elements.btnDropdown.contains(e.target)) {
      closeUploadMenu();
    }
  });
  
  // File input change
  elements.fileInput.addEventListener('change', handleFileSelect);
  
  // Drag and drop
  setupDragAndDrop();
  
  // Menu items
  elements.menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const source = item.dataset.source;
      handleUploadSource(source);
      closeUploadMenu();
    });
  });
  
  // Modal close buttons
  elements.modalCloseButtons.forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
  
  // Modal backdrop click
  if (elements.urlModal) {
    elements.urlModal.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);
  }
  
  // URL form submission
  if (elements.urlForm) {
    elements.urlForm.addEventListener('submit', handleUrlSubmit);
  }
  
  // Chat button
  if (elements.chatBtn) {
    elements.chatBtn.addEventListener('click', () => {
      NotificationModal.info('Chat feature coming soon!');
    });
  }
}

// =====================================
// Upload Menu
// =====================================
function toggleUploadMenu() {
  if (state.menuOpen) {
    closeUploadMenu();
  } else {
    openUploadMenu();
  }
}

function openUploadMenu() {
  elements.uploadMenu.classList.add('show');
  elements.uploadMenu.removeAttribute('hidden');
  state.menuOpen = true;
}

function closeUploadMenu() {
  elements.uploadMenu.classList.remove('show');
  state.menuOpen = false;
  setTimeout(() => {
    if (!state.menuOpen) {
      elements.uploadMenu.setAttribute('hidden', '');
    }
  }, 200);
}

// =====================================
// File Handling
// =====================================
function handleFileSelect(e) {
  const files = e.target.files;
  if (files && files.length > 0) {
    processFiles(Array.from(files));
  }
}

function processFiles(files) {
  // Filter for image files
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  
  if (imageFiles.length === 0) {
    NotificationModal.error('Please select valid image files.');
    return;
  }
  
  // Check file sizes (10 MB limit)
  const maxSize = 10 * 1024 * 1024;
  const oversized = imageFiles.filter(file => file.size > maxSize);
  
  if (oversized.length > 0) {
    NotificationModal.warning(`Some files exceed the 10 MB limit: ${oversized.map(f => f.name).join(', ')}`);
  }
  
  const validFiles = imageFiles.filter(file => file.size <= maxSize);
  
  if (validFiles.length > 0) {
    state.selectedFiles = validFiles;
    // Redirect to resizer page with files
    redirectToTool('resizer', validFiles);
  }
}

function redirectToTool(tool, files) {
  // Store files in sessionStorage for the tool page
  const fileData = files.map(file => ({
    name: file.name,
    size: file.size,
    type: file.type
  }));
  
  sessionStorage.setItem('pendingFiles', JSON.stringify(fileData));
  sessionStorage.setItem('fileObjects', JSON.stringify(files.map(f => ({
    name: f.name,
    lastModified: f.lastModified
  }))));
  
  // Redirect to tool page
  window.location.href = `/${tool}`;
}

// =====================================
// Drag and Drop
// =====================================
function setupDragAndDrop() {
  const dropZone = elements.dropZone;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('drag-over');
    });
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('drag-over');
    });
  });
  
  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  });
}

// =====================================
// Upload Sources
// =====================================
function handleUploadSource(source) {
  switch (source) {
    case 'device':
      elements.fileInput.click();
      break;
      
    case 'dropbox':
      handleDropboxUpload();
      break;
      
    case 'google-drive':
      handleGoogleDriveUpload();
      break;
      
    case 'url':
      openUrlModal();
      break;
      
    default:
      console.warn('Unknown upload source:', source);
  }
}

function handleDropboxUpload() {
  // Placeholder for Dropbox integration
  // In production, this would use the Dropbox Chooser API
  NotificationModal.info('Dropbox integration will be configured with your API keys in the .env file. For now, please use "From Device" option.');
}

function handleGoogleDriveUpload() {
  // Placeholder for Google Drive integration
  // In production, this would use the Google Picker API
  NotificationModal.info('Google Drive integration will be configured with your API keys in the .env file. For now, please use "From Device" option.');
}

// =====================================
// URL Modal
// =====================================
function openUrlModal() {
  if (elements.urlModal) {
    elements.urlModal.removeAttribute('hidden');
    elements.imageUrlInput?.focus();
  }
}

function closeModal() {
  if (elements.urlModal) {
    elements.urlModal.setAttribute('hidden', '');
    if (elements.urlForm) {
      elements.urlForm.reset();
    }
  }
}

async function handleUrlSubmit(e) {
  e.preventDefault();
  
  const url = elements.imageUrlInput?.value;
  
  if (!url) {
    NotificationModal.error('Please enter a valid URL.');
    return;
  }
  
  // Basic URL validation
  try {
    new URL(url);
  } catch (error) {
    NotificationModal.error('Please enter a valid URL.');
    return;
  }
  
  // Show loading state
  const submitBtn = elements.urlForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Loading...';
  
  try {
    // In production, this would fetch and validate the image
    // For now, we'll store the URL and redirect
    sessionStorage.setItem('imageUrl', url);
    
    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Redirect to resizer
    window.location.href = '/resizer';
    
  } catch (error) {
    NotificationModal.error('Failed to load image from URL. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// =====================================
// Keyboard Shortcuts
// =====================================
document.addEventListener('keydown', (e) => {
  // Escape to close modals/menus
  if (e.key === 'Escape') {
    closeModal();
    closeUploadMenu();
  }
});

// =====================================
// Start Application
// =====================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
