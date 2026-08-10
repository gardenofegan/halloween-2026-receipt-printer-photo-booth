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
});
