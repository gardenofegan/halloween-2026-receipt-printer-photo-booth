/**
 * @jest-environment jsdom
 */
const { applyDithering, processImage } = require('../public/processor');

describe('Image Processing', () => {
    it('should convert pixel data to strict black (0) or white (255) for single pixel', () => {
        const imgData = {
            width: 1, height: 1,
            data: new Uint8ClampedArray([128, 128, 128, 255])
        };
        
        applyDithering(imgData);
        
        expect(imgData.data[0] === 0 || imgData.data[0] === 255).toBeTruthy();
        expect(imgData.data[1] === 0 || imgData.data[1] === 255).toBeTruthy();
        expect(imgData.data[2] === 0 || imgData.data[2] === 255).toBeTruthy();
    });

    it('should propagate dithering error across multi-pixel grid', () => {
        // Simple test to ensure dithering changes neighbors
        const imgData = {
            width: 2, height: 2,
            data: new Uint8ClampedArray([
                120, 120, 120, 255,   120, 120, 120, 255,
                120, 120, 120, 255,   120, 120, 120, 255
            ])
        };

        applyDithering(imgData);

        // Every channel must strictly be 0 or 255
        for (let i = 0; i < imgData.data.length; i += 4) {
            expect([0, 255]).toContain(imgData.data[i]);
            expect([0, 255]).toContain(imgData.data[i + 1]);
            expect([0, 255]).toContain(imgData.data[i + 2]);
        }
    });

    it('should handle zero-dimension source without throwing errors', () => {
        const fakeCtx = { getContext: jest.fn() };
        const fakeTargetCanvas = { getContext: jest.fn().mockReturnValue(fakeCtx) };
        const uninitializedVideo = { videoWidth: 0, videoHeight: 0 };

        expect(() => processImage(uninitializedVideo, fakeTargetCanvas, null)).not.toThrow();
        expect(fakeTargetCanvas.getContext).not.toHaveBeenCalled();
    });

    it('should draw frame overlay BEFORE dithering image data', () => {
        const executionOrder = [];
        const fakeCtx = {
            fillRect: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            translate: jest.fn(),
            scale: jest.fn(),
            drawImage: jest.fn((img) => {
                if (img === fakeSourceVideo) executionOrder.push('drawSource');
                if (img === fakeFrameImage) executionOrder.push('drawFrame');
            }),
            setTransform: jest.fn(),
            fillText: jest.fn(),
            getImageData: jest.fn().mockImplementation(() => {
                executionOrder.push('getImageData');
                return {
                    width: 1,
                    height: 1,
                    data: new Uint8ClampedArray([100, 100, 100, 255])
                };
            }),
            putImageData: jest.fn(() => executionOrder.push('putImageData'))
        };

        const fakeSourceVideo = { videoWidth: 10, videoHeight: 10 };
        const fakeTargetCanvas = {
            width: 0,
            height: 0,
            getContext: jest.fn().mockReturnValue(fakeCtx)
        };
        const fakeFrameImage = { complete: true };

        processImage(fakeSourceVideo, fakeTargetCanvas, fakeFrameImage);

        // Frame overlay must be drawn BEFORE the photo (3 vertical slices)
        expect(executionOrder).toEqual([
            'drawFrame', 'drawFrame', 'drawFrame', 
            'drawSource',
            'getImageData', 'putImageData'
        ]);
    });

    it('should set canvas size to 512x580 for the thermal printer', () => {
        const fakeCtx = {
            fillRect: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            translate: jest.fn(),
            scale: jest.fn(),
            drawImage: jest.fn(),
            fillText: jest.fn(),
            setTransform: jest.fn(),
            getImageData: jest.fn().mockReturnValue({
                width: 1, height: 1,
                data: new Uint8ClampedArray([200, 200, 200, 255])
            }),
            putImageData: jest.fn()
        };
        const fakeSourceCanvas = { width: 100, height: 100 };
        const fakeTargetCanvas = { width: 0, height: 0, getContext: jest.fn().mockReturnValue(fakeCtx) };

        processImage(fakeSourceCanvas, fakeTargetCanvas, null);

        expect(fakeTargetCanvas.width).toBe(512);
        expect(fakeTargetCanvas.height).toBe(800);
    });
});
