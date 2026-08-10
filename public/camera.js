async function startCamera(videoElement) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        videoElement.srcObject = stream;
        videoElement.play();
    } catch (err) {
        console.error('Error accessing webcam:', err);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { startCamera };
}
