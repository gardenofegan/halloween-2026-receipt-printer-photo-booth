/**
 * @jest-environment jsdom
 */
const { PhotoBoothApp } = require('../public/app');

describe('State Machine', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        global.fetch = jest.fn(() => Promise.resolve());
        
        // Mock DOM elements
        document.body.innerHTML = `
            <video id="webcam"></video>
            <canvas id="preview-canvas"></canvas>
            <img id="frame-img">
            <button id="capture-btn"></button>
            <div id="status-overlay"></div>
            <div id="flash-overlay"></div>
        `;
        
        // Mock canvas toDataURL
        const canvas = document.getElementById('preview-canvas');
        canvas.toDataURL = jest.fn(() => 'data:image/png;base64,12345');
        
        // Mock processImage
        global.processImage = jest.fn();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('should transition from IDLE to COUNTDOWN to COOLDOWN and call processImage', async () => {
        const app = new PhotoBoothApp();
        expect(app.state).toBe('IDLE');
        
        const takePhotoPromise = app.takePhoto();
        expect(app.state).toBe('COUNTDOWN');
        
        // Advance 3 seconds for countdown
        await jest.advanceTimersByTimeAsync(3000); 
        
        // At this point it should have flashed, processed image, and entered COOLDOWN
        expect(app.state).toBe('COOLDOWN');
        expect(global.processImage).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith('/print', expect.any(Object));
        
        // Advance 15 seconds for cooldown
        await jest.advanceTimersByTimeAsync(15000);
        expect(app.state).toBe('IDLE');
        
        await takePhotoPromise;
    });
});
