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
        });

        it('should fallback to simulation mode when printer is not connected', async () => {
            jest.doMock('node-thermal-printer', () => {
                return {
                    printer: jest.fn().mockImplementation(() => ({
                        isPrinterConnected: jest.fn().mockResolvedValue(false)
                    })),
                    types: { EPSON: 'epson' }
                };
            });
            const printServiceLocal = require('../print-service');
            
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            
            const printPromise = printServiceLocal.printImage('data:image/png;base64,iVBORw0KGgo...');
            
            const result = await printPromise;

            expect(result).toBe(true);
            expect(consoleWarnSpy).toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });
    });

    describe('printService device error handling', () => {
        beforeEach(() => {
            jest.resetModules();
            jest.unmock('../print-service');
        });

        it('should reject if printer execute fails', async () => {
            const mockPrinter = {
                isPrinterConnected: jest.fn().mockResolvedValue(true),
                alignCenter: jest.fn(),
                printImageBuffer: jest.fn().mockResolvedValue(true),
                println: jest.fn(),
                cut: jest.fn(),
                execute: jest.fn().mockRejectedValue(new Error('Execute failed'))
            };

            jest.doMock('node-thermal-printer', () => {
                return {
                    printer: jest.fn().mockImplementation(() => mockPrinter),
                    types: { EPSON: 'epson' }
                };
            });

            const printService = require('../print-service');
            await expect(printService.printImage('data:image/jpeg;base64,abc12345')).rejects.toThrow('Execute failed');
            expect(mockPrinter.printImageBuffer).toHaveBeenCalledWith(expect.any(Buffer));
        });

        it('should reject if printImageBuffer throws an error', async () => {
            const mockPrinter = {
                isPrinterConnected: jest.fn().mockResolvedValue(true),
                alignCenter: jest.fn(),
                printImageBuffer: jest.fn().mockRejectedValue(new Error('Corrupt image')),
                println: jest.fn(),
                cut: jest.fn(),
                execute: jest.fn()
            };

            jest.doMock('node-thermal-printer', () => {
                return {
                    printer: jest.fn().mockImplementation(() => mockPrinter),
                    types: { EPSON: 'epson' }
                };
            });

            const printService = require('../print-service');
            await expect(printService.printImage('data:image/png;base64,invalid')).rejects.toThrow('Corrupt image');
            expect(mockPrinter.execute).not.toHaveBeenCalled();
        });
    });
});
