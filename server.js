const express = require('express');
const path = require('path');
const { printImage } = require('./print-service');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

app.post('/print', async (req, res) => {
    const { imageBase64 } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid image data' });
    }
    
    try {
        await printImage(imageBase64);
        res.json({ success: true });
    } catch (error) {
        console.error('Print error:', error);
        res.status(500).json({ error: 'Failed to print' });
    }
});

const port = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

module.exports = { app };
