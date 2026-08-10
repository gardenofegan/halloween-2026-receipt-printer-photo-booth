/**
 * @jest-environment jsdom
 */
const { applyDithering, processImage } = require('../public/processor');

describe('Image Processing', () => {
    it('should convert pixel data to strict black (0) or white (255)', () => {
        // Create a fake ImageData-like object with a gray pixel
        const imgData = {
            width: 1, height: 1,
            data: new Uint8ClampedArray([128, 128, 128, 255])
        };
        
        applyDithering(imgData);
        
        // Since it's exactly 128 (middle), standard threshold makes it white (255)
        // With Floyd-Steinberg, it might push errors, but this single pixel will round to 255
        expect(imgData.data[0] === 0 || imgData.data[0] === 255).toBeTruthy();
        expect(imgData.data[1] === 0 || imgData.data[1] === 255).toBeTruthy();
        expect(imgData.data[2] === 0 || imgData.data[2] === 255).toBeTruthy();
    });

    it('should process image by flipping, dithering and overlaying frame', () => {
        const fakeCtx = {
            translate: jest.fn(),
            scale: jest.fn(),
            drawImage: jest.fn(),
            setTransform: jest.fn(),
            getImageData: jest.fn().mockReturnValue({
                width: 2,
                height: 2,
                data: new Uint8ClampedArray([
                    100, 100, 100, 255,  200, 200, 200, 255,
                    50,  50,  50,  255,  150, 150, 150, 255
                ])
            }),
            putImageData: jest.fn()
        };

        const fakeSourceVideo = { videoWidth: 2, videoHeight: 2 };
        const fakeTargetCanvas = {
            width: 0,
            height: 0,
            getContext: jest.fn().mockReturnValue(fakeCtx)
        };
        const fakeFrameImage = { complete: true };

        processImage(fakeSourceVideo, fakeTargetCanvas, fakeFrameImage);

        expect(fakeTargetCanvas.width).toBe(2);
        expect(fakeTargetCanvas.height).toBe(2);
        expect(fakeCtx.translate).toHaveBeenCalledWith(2, 0);
        expect(fakeCtx.scale).toHaveBeenCalledWith(-1, 1);
        expect(fakeCtx.drawImage).toHaveBeenCalledTimes(2);
        expect(fakeCtx.putImageData).toHaveBeenCalled();
    });
});
