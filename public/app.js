class PhotoBoothApp {
    constructor() {
        this.state = 'IDLE'; // IDLE, COUNTDOWN, PREVIEW, COOLDOWN
        
        // Setup UI listeners if in browser
        if (typeof document !== 'undefined') {
            this.captureBtn = document.getElementById('capture-btn');
            this.statusOverlay = document.getElementById('status-overlay');
            if (this.captureBtn) {
                this.captureBtn.addEventListener('click', () => this.takePhoto());
            }
        }
    }

    updateUI(message) {
        if (this.statusOverlay) {
            this.statusOverlay.innerText = message;
            this.statusOverlay.style.display = message ? 'block' : 'none';
        }
    }

    takePhoto() {
        if (this.state !== 'IDLE') return;
        
        this.state = 'COUNTDOWN';
        this.updateUI('3...');
        
        setTimeout(() => {
            this.state = 'PREVIEW';
            this.updateUI('Previewing...');
            
            setTimeout(() => {
                this.state = 'COOLDOWN';
                this.updateUI('Printing... Please wait 15 seconds.');
                
                setTimeout(() => {
                    this.state = 'IDLE';
                    this.updateUI('');
                }, 15000);
            }, 4000);
        }, 3000);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PhotoBoothApp };
} else {
    document.addEventListener('DOMContentLoaded', () => {
        window.appInstance = new PhotoBoothApp();
    });
}
