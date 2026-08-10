// Basic Floyd-Steinberg Dithering
function applyDithering(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale
        const gray = (data[i] + data[i+1] + data[i+2]) / 3;
        data[i] = data[i+1] = data[i+2] = gray;
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const oldPixel = data[idx];
            const newPixel = oldPixel < 128 ? 0 : 255; // Threshold
            
            data[idx] = data[idx+1] = data[idx+2] = newPixel;
            
            const err = oldPixel - newPixel;
            
            // Inlined error distribution (no closure allocation per pixel)
            // Distribute to (x + 1, y) [7/16]
            if (x + 1 < width) {
                const i = (y * width + (x + 1)) * 4;
                const v = data[i] + err * (7 / 16);
                data[i] = data[i+1] = data[i+2] = v;
            }
            // Distribute to (x - 1, y + 1) [3/16]
            if (x - 1 >= 0 && y + 1 < height) {
                const i = ((y + 1) * width + (x - 1)) * 4;
                const v = data[i] + err * (3 / 16);
                data[i] = data[i+1] = data[i+2] = v;
            }
            // Distribute to (x, y + 1) [5/16]
            if (y + 1 < height) {
                const i = ((y + 1) * width + x) * 4;
                const v = data[i] + err * (5 / 16);
                data[i] = data[i+1] = data[i+2] = v;
            }
            // Distribute to (x + 1, y + 1) [1/16]
            if (x + 1 < width && y + 1 < height) {
                const i = ((y + 1) * width + (x + 1)) * 4;
                const v = data[i] + err * (1 / 16);
                data[i] = data[i+1] = data[i+2] = v;
            }
        }
    }
}

function processImage(source, targetCanvas, frameImage) {
    if (!source || !targetCanvas) return;
    
    const srcWidth = source.width || source.videoWidth || 0;
    const srcHeight = source.height || source.videoHeight || 0;
    if (!srcWidth || !srcHeight) return;

    // Use a fixed 512x512 square canvas for the thermal printer
    const canvasSize = 512;
    const ctx = targetCanvas.getContext('2d');
    targetCanvas.width = canvasSize;
    targetCanvas.height = canvasSize;
    
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Calculate source crop for 1:1 aspect ratio (center crop from video)
    const size = Math.min(srcWidth, srcHeight);
    const sx = (srcWidth - size) / 2;
    const sy = (srcHeight - size) / 2;

    // Bounding box for the photo inside the WANTED poster
    const destX = canvasSize * 0.28;
    const destY = canvasSize * 0.28;
    const destW = canvasSize * 0.44;
    const destH = canvasSize * 0.44;

    // Draw mirrored source video/canvas into the bounding box
    ctx.save();
    ctx.translate(destX + destW, destY);
    ctx.scale(-1, 1);
    ctx.drawImage(source, sx, sy, size, size, 0, 0, destW, destH);
    ctx.restore();

    // Draw frame overlay BEFORE dithering so frame artwork is dithered along with photo
    if (frameImage && frameImage.complete) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(frameImage, 0, 0, canvasSize, canvasSize);
        ctx.globalCompositeOperation = 'source-over';
    }
    
    // Get data, apply dithering to entire composite frame, and put back
    const imgData = ctx.getImageData(0, 0, srcWidth, srcHeight);
    applyDithering(imgData);
    ctx.putImageData(imgData, 0, 0);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { applyDithering, processImage };
}
