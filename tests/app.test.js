/**
 * @jest-environment jsdom
 */
const { PhotoBoothApp } = require('../public/app');

describe('State Machine', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should transition from IDLE to COUNTDOWN to PREVIEW to COOLDOWN', () => {
        const app = new PhotoBoothApp();
        expect(app.state).toBe('IDLE');
        
        app.takePhoto();
        expect(app.state).toBe('COUNTDOWN');
        
        jest.advanceTimersByTime(3000); // 3 second countdown
        expect(app.state).toBe('PREVIEW');
        
        jest.advanceTimersByTime(4000); // 4 second preview
        expect(app.state).toBe('COOLDOWN');
        
        jest.advanceTimersByTime(15000); // 15 second cooldown
        expect(app.state).toBe('IDLE');
    });
});
