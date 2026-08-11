// Atkinson Dithering with Contrast Boost for clear thermal prints
function applyDithering(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Contrast boost factor (e.g. +30)
    const contrast = 30;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale
        const grayOriginal = (data[i] * 0.3 + data[i+1] * 0.59 + data[i+2] * 0.11);
        
        // Apply contrast
        let gray = factor * (grayOriginal - 128) + 128;
        if (gray > 255) gray = 255;
        if (gray < 0) gray = 0;
        
        data[i] = data[i+1] = data[i+2] = gray;
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const oldPixel = data[idx];
            const newPixel = oldPixel < 128 ? 0 : 255; // Threshold
            
            data[idx] = data[idx+1] = data[idx+2] = newPixel;
            
            const err = Math.floor((oldPixel - newPixel) / 8);
            
            // Atkinson distribution
            const distribute = (dx, dy) => {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny < height) {
                    const i = (ny * width + nx) * 4;
                    data[i] = data[i+1] = data[i+2] = data[i] + err;
                }
            };

            distribute(1, 0);
            distribute(2, 0);
            distribute(-1, 1);
            distribute(0, 1);
            distribute(1, 1);
            distribute(0, 2);
        }
    }
}

function processImage(source, targetCanvas, frameImage) {
    if (!source || !targetCanvas) return;
    
    const srcWidth = source.width || source.videoWidth || 0;
    const srcHeight = source.height || source.videoHeight || 0;
    if (!srcWidth || !srcHeight) return;

    // Fixed 512px width for the thermal printer
    const canvasWidth = 512;
    
    // We want thin sides (32px) so the photo gets plenty of width
    const sideMargin = 32;
    const photoSize = canvasWidth - (sideMargin * 2); // 448
    
    // Maintain the same physical height for the top and bottom borders (28% of 512 = ~144px)
    const topMargin = 144;
    const bottomMargin = 144;
    
    const frameDrawHeight = topMargin + photoSize + bottomMargin; // 144 + 448 + 144 = 736
    const textSpace = 64; 
    const canvasHeight = frameDrawHeight + textSpace; // 800
    
    const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
    targetCanvas.width = canvasWidth;
    targetCanvas.height = canvasHeight;
    
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw the frame overlay first using 3-slice vertical scaling 
    // This perfectly preserves the top and bottom banners (including "WANTED") 
    // while stretching only the side cactus vertically to match the larger photo.
    if (frameImage && frameImage.complete) {
        // Original frame is typically 512x512
        const sw = frameImage.width || frameImage.naturalWidth || 512;
        const sh = frameImage.height || frameImage.naturalHeight || 512;
        
        // Inner window is roughly at 28% of the original asset
        const st = sh * 0.28; // ~143.36
        const sb = sh * 0.28;
        const sch = sh - st - sb;
        
        // Top Banner (1:1 ratio)
        ctx.drawImage(frameImage, 0, 0, sw, st, 0, 0, canvasWidth, topMargin);
        
        // Middle section (Cactus - Stretched vertically)
        ctx.drawImage(frameImage, 0, st, sw, sch, 0, topMargin, canvasWidth, photoSize);
        
        // Bottom Banner (1:1 ratio)
        ctx.drawImage(frameImage, 0, sh - sb, sw, sb, 0, topMargin + photoSize, canvasWidth, bottomMargin);
    }

    // Calculate source crop for 1:1 aspect ratio (center crop from video)
    const size = Math.min(srcWidth, srcHeight);
    const sx = (srcWidth - size) / 2;
    const sy = (srcHeight - size) / 2;

    // Draw mirrored source video/canvas OVER the frame, clipping the inner parts of the cactus
    // to create the super thin side margins!
    const destX = sideMargin;
    const destY = topMargin;
    const destW = photoSize;
    const destH = photoSize;

    ctx.save();
    ctx.translate(destX + destW, destY);
    ctx.scale(-1, 1);
    ctx.drawImage(source, sx, sy, size, size, 0, 0, destW, destH);
    ctx.restore();

    // Draw styled text at the bottom
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px "Rye", serif';
    ctx.fillText('HVL Hayride 2026', canvasWidth / 2, frameDrawHeight + 40);
    
    const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    applyDithering(imgData);
    ctx.putImageData(imgData, 0, 0);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { applyDithering, processImage };
}
