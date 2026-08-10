/**
 * @jest-environment jsdom
 */
const { startCamera } = require('../public/camera');

describe('Webcam Integration', () => {
    it('should assign a media stream to the video element', async () => {
        const dummyStream = { id: 'test-stream' };
        
        // Mock navigator.mediaDevices.getUserMedia
        global.navigator.mediaDevices = {
            getUserMedia: jest.fn().mockResolvedValue(dummyStream)
        };

        const videoElement = document.createElement('video');
        videoElement.play = jest.fn(); // ensure play method exists on JSDOM element if called

        await startCamera(videoElement);

        expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true, audio: false });
        expect(videoElement.srcObject).toBe(dummyStream);
    });
});
