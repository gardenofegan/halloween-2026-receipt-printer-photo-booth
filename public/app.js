class PhotoBoothApp {
    constructor() {
        this.state = 'IDLE'; // IDLE, COUNTDOWN, COOLDOWN
        
        // Setup UI listeners if in browser
        if (typeof document !== 'undefined') {
            this.video = document.getElementById('webcam');
            this.canvas = document.getElementById('preview-canvas');
            this.frameImg = document.getElementById('frame-img');
            this.captureBtn = document.getElementById('capture-btn');
            this.statusOverlay = document.getElementById('status-overlay');
            this.flashOverlay = document.getElementById('flash-overlay');
            this.printerStatusLabel = document.getElementById('printer-status');

            if (this.captureBtn) {
                this.captureBtn.addEventListener('click', () => this.takePhoto());
            }

            // Start polling printer status
            this.pollPrinterStatus();
            setInterval(() => this.pollPrinterStatus(), 5000);
        }
    }

    async pollPrinterStatus() {
        if (!this.printerStatusLabel) return;
        try {
            const res = await fetch('/status');
            const data = await res.json();
            
            const status = data.status || 'Unknown';
            if (status === 'Normal') {
                this.printerStatusLabel.innerText = 'Printer: READY';
                this.printerStatusLabel.style.color = '#a8e6cf'; // light green
                this.captureBtn.disabled = this.state !== 'IDLE';
            } else if (status === 'PaperOut') {
                this.printerStatusLabel.innerText = 'PRINTER OUT OF PAPER!';
                this.printerStatusLabel.style.color = '#ff6b6b'; // red
                this.captureBtn.disabled = true;
            } else if (status === 'Offline') {
                this.printerStatusLabel.innerText = 'PRINTER OFFLINE';
                this.printerStatusLabel.style.color = '#ff6b6b';
                this.captureBtn.disabled = true;
            } else {
                this.printerStatusLabel.innerText = `Printer: ${status}`;
                this.printerStatusLabel.style.color = '#f4d093'; // default yellow
                // Don't disable button on unknown statuses, it might just be printing
            }
        } catch (err) {
            this.printerStatusLabel.innerText = 'PRINTER DISCONNECTED';
            this.printerStatusLabel.style.color = '#ff6b6b';
            this.captureBtn.disabled = true;
        }
    }

    updateUI(message, stateClass = '') {
        if (this.statusOverlay) {
            this.statusOverlay.innerText = message;
            this.statusOverlay.style.display = message ? 'block' : 'none';
            if (stateClass === 'countdown') {
                this.statusOverlay.style.fontSize = '15rem';
                this.statusOverlay.style.color = '#ffecd2';
            } else {
                this.statusOverlay.style.fontSize = '4rem';
                this.statusOverlay.style.color = '#fff';
            }
        }
    }

    async takePhoto() {
        if (this.state !== 'IDLE') return;
        
        this.state = 'COUNTDOWN';
        this.captureBtn.disabled = true;
        
        // 3, 2, 1 Countdown
        for (let i = 3; i > 0; i--) {
            this.updateUI(i.toString(), 'countdown');
            await new Promise(r => setTimeout(r, 1000));
        }
        
        // Flash!
        this.updateUI('');
        this.flashOverlay.classList.add('flash-active');
        
        // Process image synchronously to grab the exact moment
        // processImage is defined in processor.js (loaded globally in index.html)
        if (typeof processImage === 'function') {
            processImage(this.video, this.canvas, this.frameImg);
        }

        setTimeout(() => {
            this.flashOverlay.classList.remove('flash-active');
        }, 100);

        // Show preview
        this.video.style.display = 'none';
        this.canvas.style.display = 'block';
        this.state = 'COOLDOWN';
        this.updateUI('PRINTING...', 'printing');

        try {
            const dataUrl = this.canvas.toDataURL('image/png');
            // Send to backend
            await fetch('/print', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ imageBase64: dataUrl })
            });
            this.updateUI('READY SOON...', 'printing');
        } catch (err) {
            console.error('Failed to print', err);
            this.updateUI('PRINTER ERROR!', 'printing');
        }

        // Wait for cooldown to prevent spam (15 seconds)
        setTimeout(() => {
            this.state = 'IDLE';
            this.updateUI('');
            this.video.style.display = 'block';
            this.canvas.style.display = 'none';
            this.captureBtn.disabled = false;
        }, 15000);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PhotoBoothApp };
} else {
    document.addEventListener('DOMContentLoaded', () => {
        window.appInstance = new PhotoBoothApp();
    });
}
