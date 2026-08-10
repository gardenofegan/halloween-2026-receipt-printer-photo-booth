// Basic Floyd-Steinberg Dithering
function applyDithering(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    
    for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale
        const gray = (data[i] + data[i+1] + data[i+2]) / 3;
        data[i] = data[i+1] = data[i+2] = gray;
    }

    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const oldPixel = data[idx];
            const newPixel = oldPixel < 128 ? 0 : 255; // Threshold
            
            data[idx] = data[idx+1] = data[idx+2] = newPixel;
            
            const err = oldPixel - newPixel;
            
            // Distribute error
            const distribute = (dx, dy, factor) => {
                if (x + dx >= 0 && x + dx < width && y + dy < imageData.height) {
                    const i = ((y + dy) * width + (x + dx)) * 4;
                    data[i] = data[i+1] = data[i+2] = data[i] + err * factor;
                }
            };
            
            distribute(1, 0, 7/16);
            distribute(-1, 1, 3/16);
            distribute(0, 1, 5/16);
            distribute(1, 1, 1/16);
        }
    }
}

function processImage(sourceVideo, targetCanvas, frameImage) {
    const ctx = targetCanvas.getContext('2d');
    targetCanvas.width = sourceVideo.videoWidth;
    targetCanvas.height = sourceVideo.videoHeight;
    
    // Draw mirrored video
    ctx.translate(targetCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(sourceVideo, 0, 0, targetCanvas.width, targetCanvas.height);
    
    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Get data and dither
    const imgData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
    applyDithering(imgData);
    ctx.putImageData(imgData, 0, 0);
    
    // Draw frame overlay
    if (frameImage && frameImage.complete) {
        ctx.drawImage(frameImage, 0, 0, targetCanvas.width, targetCanvas.height);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { applyDithering, processImage };
}
