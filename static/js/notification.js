// Notification Modal System
const NotificationModal = {
  show: function(message, type = 'info') {
    // Create modal if it doesn't exist
    let modal = document.getElementById('notification-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'notification-modal';
      modal.className = 'notification-modal';
      modal.innerHTML = `
        <div class="notification-content">
          <div class="notification-icon"></div>
          <div class="notification-message"></div>
          <button class="notification-close">×</button>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Close button handler
      modal.querySelector('.notification-close').addEventListener('click', () => {
        this.hide();
      });
    }
    
    // Set message and type
    const messageEl = modal.querySelector('.notification-message');
    const iconEl = modal.querySelector('.notification-icon');
    messageEl.textContent = message;
    
    // Set icon based on type
    const icons = {
      info: 'ℹ️',
      success: '✓',
      warning: '⚠️',
      error: '✕'
    };
    iconEl.textContent = icons[type] || icons.info;
    
    // Apply type class
    modal.className = 'notification-modal notification-' + type;
    
    // Show modal
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Auto hide after 4 seconds
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.hide(), 4000);
  },
  
  hide: function() {
    const modal = document.getElementById('notification-modal');
    if (modal) {
      modal.classList.remove('show');
    }
    if (this.timeout) clearTimeout(this.timeout);
  },
  
  error: function(message) {
    this.show(message, 'error');
  },
  
  success: function(message) {
    this.show(message, 'success');
  },
  
  warning: function(message) {
    this.show(message, 'warning');
  },
  
  info: function(message) {
    this.show(message, 'info');
  },
  
  confirm: function(message, onConfirm, onCancel) {
    // Create confirm modal if it doesn't exist
    let modal = document.getElementById('confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'confirm-modal';
      modal.className = 'confirm-modal';
      modal.innerHTML = `
        <div class="confirm-overlay"></div>
        <div class="confirm-dialog">
          <div class="confirm-icon">⚠️</div>
          <div class="confirm-message"></div>
          <div class="confirm-buttons">
            <button class="confirm-btn-cancel">Cancel</button>
            <button class="confirm-btn-ok">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    const messageEl = modal.querySelector('.confirm-message');
    const btnOk = modal.querySelector('.confirm-btn-ok');
    const btnCancel = modal.querySelector('.confirm-btn-cancel');
    const overlay = modal.querySelector('.confirm-overlay');
    
    messageEl.textContent = message;
    
    // Show modal
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Handle OK
    const handleOk = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 200);
      if (onConfirm) onConfirm();
      cleanup();
    };
    
    // Handle Cancel
    const handleCancel = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 200);
      if (onCancel) onCancel();
      cleanup();
    };
    
    // Cleanup listeners
    const cleanup = () => {
      btnOk.removeEventListener('click', handleOk);
      btnCancel.removeEventListener('click', handleCancel);
      overlay.removeEventListener('click', handleCancel);
    };
    
    // Add listeners
    btnOk.addEventListener('click', handleOk);
    btnCancel.addEventListener('click', handleCancel);
    overlay.addEventListener('click', handleCancel);
  }
};

// Add global function for backwards compatibility
window.showNotification = NotificationModal.show.bind(NotificationModal);
window.showConfirm = NotificationModal.confirm.bind(NotificationModal);
