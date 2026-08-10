const request = require('supertest');

describe('Print API and Service', () => {
    describe('POST /print route', () => {
        let app;
        let printService;

        beforeEach(() => {
            jest.resetModules();
            jest.mock('../print-service', () => ({
                printImage: jest.fn().mockResolvedValue(true)
            }));
            app = require('../server').app;
            printService = require('../print-service');
        });

        it('should accept POST /print with image data and call print service', async () => {
            const response = await request(app)
                .post('/print')
                .send({ imageBase64: 'data:image/png;base64,iVBORw0KGgo...' })
                .set('Content-Type', 'application/json');
                
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ success: true });
            expect(printService.printImage).toHaveBeenCalledWith('data:image/png;base64,iVBORw0KGgo...');
        });

        it('should return 400 if image data is missing', async () => {
            const response = await request(app)
                .post('/print')
                .send({})
                .set('Content-Type', 'application/json');
                
            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'Missing or invalid image data' });
        });

        it('should return 400 if image data is not a string', async () => {
            const response = await request(app)
                .post('/print')
                .send({ imageBase64: { invalid: true } })
                .set('Content-Type', 'application/json');
                
            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'Missing or invalid image data' });
        });

        it('should return 500 if printService throws error', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            printService.printImage.mockRejectedValueOnce(new Error('Print failed'));
            
            const response = await request(app)
                .post('/print')
                .send({ imageBase64: 'data:image/png;base64,iVBORw0KGgo...' })
                .set('Content-Type', 'application/json');
                
            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Failed to print' });
            consoleSpy.mockRestore();
        });
    });

    describe('printService.printImage (actual implementation)', () => {
        let printService;

        beforeEach(() => {
            jest.resetModules();
            jest.unmock('../print-service');
            printService = require('../print-service');
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should fallback to simulation mode when printer is not connected', async () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            
            const printPromise = printService.printImage('data:image/png;base64,iVBORw0KGgo...');
            
            jest.advanceTimersByTime(1000);
            const result = await printPromise;

            expect(result).toBe(true);
            expect(consoleWarnSpy).toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });
    });

    describe('printService device error handling and mime type support', () => {
        beforeEach(() => {
            jest.resetModules();
            jest.unmock('../print-service');
        });

        it('should close USB device if device.open fails and pass extracted MIME type', async () => {
            const escpos = require('escpos');
            
            const mockDevice = {
                open: jest.fn((cb) => cb(new Error('Open failed'))),
                close: jest.fn()
            };
            const mockPrinter = {
                align: jest.fn().mockReturnThis(),
                raster: jest.fn().mockReturnThis(),
                cut: jest.fn().mockReturnThis(),
                close: jest.fn().mockReturnThis()
            };

            const escposUsbMock = jest.fn(() => mockDevice);
            escpos.USB = escposUsbMock;
            
            jest.spyOn(escpos, 'Printer').mockImplementation(() => mockPrinter);
            jest.spyOn(escpos.Image, 'load').mockImplementation((buffer, mime, cb) => cb({ toRaster: jest.fn() }));

            const printService = require('../print-service');
            await expect(printService.printImage('data:image/jpeg;base64,abc12345')).rejects.toThrow('Open failed');
            expect(mockDevice.close).toHaveBeenCalled();
            expect(escpos.Image.load).toHaveBeenCalledWith(expect.any(Buffer), 'image/jpeg', expect.any(Function));
        });

        it('should reject if Image.load yields an error or invalid image', async () => {
            const escpos = require('escpos');
            
            const mockDevice = {
                open: jest.fn(),
                close: jest.fn()
            };
            const escposUsbMock = jest.fn(() => mockDevice);
            escpos.USB = escposUsbMock;

            jest.spyOn(escpos.Image, 'load').mockImplementation((buffer, mime, cb) => cb(new Error('Corrupt image')));

            const printService = require('../print-service');
            await expect(printService.printImage('data:image/png;base64,invalid')).rejects.toThrow('Corrupt image');
            expect(mockDevice.open).not.toHaveBeenCalled();
        });
    });
});
