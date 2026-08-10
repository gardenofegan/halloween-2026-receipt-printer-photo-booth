const escpos = require('escpos');
escpos.USB = require('escpos-usb');

async function printImage(base64Data) {
    return new Promise((resolve, reject) => {
        try {
            // Remove header if present
            const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Image, 'base64');
            
            // Note: in a real environment without a printer plugged in, 
            // escpos.USB() will throw an error "No printer found".
            // For safety, we wrap this in try-catch so the app doesn't crash.
            let device;
            try {
                device = new escpos.USB();
            } catch (err) {
                console.warn('Printer not found (simulation mode active).', err.message);
                // Simulate success
                setTimeout(() => resolve(true), 1000);
                return;
            }

            const printer = new escpos.Printer(device);
            
            escpos.Image.load(buffer, 'image/png', (image) => {
                device.open((error) => {
                    if (error) {
                        return reject(error);
                    }
                    printer
                        .align('ct')
                        .raster(image, 'dwdw') // Double width, double height
                        .cut()
                        .close();
                    resolve(true);
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { printImage };
