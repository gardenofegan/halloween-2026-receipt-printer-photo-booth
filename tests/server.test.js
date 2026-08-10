const request = require('supertest');
const { app } = require('../server');

describe('Static Server', () => {
    it('should serve index.html on GET /', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toContain('<title>Photo Booth - Dirty Saloon</title>');
    });
});
