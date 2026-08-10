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

    it('should propagate Floyd-Steinberg dithering error across multi-pixel grid', () => {
        // 2x2 grid with initial values of 120 (dark gray)
        // Pixel (0,0): 120 -> threshold 0, error = +120
        // Error distributed:
        //   (1,0): + 120 * 7/16 = +52.5 => 120 + 52.5 = 172.5 >= 128 => threshold 255
        //   (0,1): + 120 * 5/16 = +37.5 => 120 + 37.5 = 157.5 >= 128 => threshold 255
        //   (1,1): + 120 * 1/16 = +7.5  => 120 + 7.5 = 127.5
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

        // Check that error distribution pushed neighbor (1,0) to white (255)
        expect(imgData.data[4]).toBe(255); // Pixel (1,0) R channel
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

        // Frame overlay must be drawn BEFORE getImageData & dithering
        expect(executionOrder).toEqual(['drawSource', 'drawFrame', 'getImageData', 'putImageData']);
    });

    it('should set canvas size to 512x512 for the thermal printer', () => {
        const fakeCtx = {
            fillRect: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            translate: jest.fn(),
            scale: jest.fn(),
            drawImage: jest.fn(),
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
        expect(fakeTargetCanvas.height).toBe(512);
    });
});
