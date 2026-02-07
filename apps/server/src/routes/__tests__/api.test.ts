import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import apiRoutes from '../api.js';

// Mock controllers
vi.mock('../../controllers/carsController.js', () => ({
  carsController: {
    findCars: (req: any, res: any) => res.json({ success: true, sessionId: 'test-session', cars: [] }),
    refineSearch: (req: any, res: any) => res.json({ success: true, sessionId: 'test-session', cars: [] }),
    resetConversation: (req: any, res: any) => res.json({ success: true }),
  },
}));

vi.mock('../../controllers/healthController.js', () => ({
  healthController: {
    checkHealth: (req: any, res: any) => res.json({ success: true, status: 'UP' }),
  },
}));



describe('API Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', apiRoutes);
  });

  it('GET /api/health should return UP', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, status: 'UP' });
  });

  it('POST /api/find-cars should return success', async () => {
    const response = await request(app)
      .post('/api/find-cars')
      .send({ prompt: 'I want a fast car' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('POST /api/refine-search should return success', async () => {
    const response = await request(app)
      .post('/api/refine-search')
      .send({ prompt: 'more doors', sessionId: 'test' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });



  it('POST /api/reset-conversation should return success', async () => {
    const response = await request(app)
      .post('/api/reset-conversation')
      .send({ sessionId: 'test' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });


});
