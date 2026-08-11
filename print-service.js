const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

async function printImage(base64Data) {
    return new Promise(async (resolve, reject) => {
        try {
            // Remove header if present
            const base64Image = base64Data.replace(/^data:image\/\w+;base64,/i, "");
            const buffer = Buffer.from(base64Image, 'base64');
            
            let printer = new ThermalPrinter({
                type: PrinterTypes.EPSON,
                interface: 'printer:escape_printer', // Connect via standard OS print spooler
                driver: require('@thiagoelg/node-printer'),
            });

            // Check if the printer is actually available via OS
            let isConnected = false;
            try {
                isConnected = await printer.isPrinterConnected();
            } catch (err) {
                // node-thermal-printer throws false if not connected
                isConnected = false;
            }

            if (!isConnected) {
                console.warn('Printer not found (simulation mode active).');
                // Simulate success
                setTimeout(() => resolve(true), 1000);
                return;
            }

            printer.alignCenter();
            // node-thermal-printer supports printing directly from a buffer
            await printer.printImageBuffer(buffer);
            printer.cut();
            
            await printer.execute();
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function getPrinterStatus() {
    try {
        const { stdout } = await execAsync(`powershell -Command "Get-Printer -Name 'escape_printer' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty PrinterStatus"`);
        const status = stdout.trim();
        return status ? status : 'Offline';
    } catch (err) {
        return 'Offline';
    }
}

module.exports = {
    printImage,
    getPrinterStatus
};
