// Loading Modal Utility
const LoadingModal = {
    modal: null,
    title: null,
    message: null,
    progressBar: null,
    progressText: null,
    startTime: null,
    minDisplayTime: 3000, // 3 seconds minimum

    init() {
        this.modal = document.getElementById('loadingModal');
        this.title = document.getElementById('loadingTitle');
        this.message = document.getElementById('loadingMessage');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
    },

    show(title = 'Processing...', message = 'Please wait while we process your files') {
        if (!this.modal) this.init();
        
        this.startTime = Date.now();
        this.title.textContent = title;
        this.message.textContent = message;
        this.updateProgress(0);
        this.modal.style.display = 'flex';
        
        // Fade in animation
        setTimeout(() => {
            this.modal.style.opacity = '1';
        }, 10);
    },

    updateProgress(percent, message = null) {
        if (!this.modal) return;
        
        const clampedPercent = Math.min(100, Math.max(0, percent));
        this.progressBar.style.width = clampedPercent + '%';
        this.progressText.textContent = Math.round(clampedPercent) + '%';
        
        if (message) {
            this.message.textContent = message;
        }
    },

    updateTitle(title) {
        if (!this.modal) return;
        this.title.textContent = title;
    },

    updateMessage(message) {
        if (!this.modal) return;
        this.message.textContent = message;
    },

    async hide() {
        if (!this.modal) return;

        // Ensure minimum display time
        const elapsedTime = Date.now() - this.startTime;
        const remainingTime = Math.max(0, this.minDisplayTime - elapsedTime);
        
        if (remainingTime > 0) {
            await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        // Fade out animation
        this.modal.style.opacity = '0';
        
        setTimeout(() => {
            this.modal.style.display = 'none';
            this.updateProgress(0);
        }, 300);
    },

    // Simulate progress for operations without real progress tracking
    simulateProgress(duration = 3000, callback = null) {
        let progress = 0;
        const interval = 50; // Update every 50ms
        const increment = (interval / duration) * 100;
        
        const timer = setInterval(() => {
            progress += increment;
            
            if (progress >= 100) {
                progress = 100;
                clearInterval(timer);
                if (callback) callback();
            }
            
            this.updateProgress(progress);
        }, interval);
        
        return timer;
    }
};

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    LoadingModal.init();
});
