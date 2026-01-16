import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import apiRoutes from '../api.js';
import { conversationService } from '../../services/conversationService.js';

// Mocking controllers to simulate history recording without real LLM calls
vi.mock('../../controllers/carsController.js', () => ({
  carsController: {
    findCars: (req: any, res: any) => {
      const sessionId = req.body.sessionId || 'test-session';
      const conv = conversationService.getOrInitialize(sessionId);
      conv.history.push({ type: 'find-cars', timestamp: new Date(), data: { requirements: req.body.requirements } });
      res.json({ success: true, sessionId, cars: [{ make: 'Fiat', model: '500' }, { make: 'Smart', model: 'Fortwo' }] });
    },
    refineSearch: (req: any, res: any) => {
      const sessionId = req.body.sessionId || 'test-session';
      const conv = conversationService.getOrInitialize(sessionId);
      conv.history.push({ type: 'refine-search', timestamp: new Date(), data: { feedback: req.body.feedback } });
      res.json({ success: true, sessionId, cars: [] });
    },
    compareCars: (req: any, res: any) => {
      const sessionId = req.body.sessionId || 'test-session';
      const conv = conversationService.getOrInitialize(sessionId);
      conv.history.push({ type: 'compare-cars', timestamp: new Date(), data: { car1: req.body.car1, car2: req.body.car2 } });
      res.json({ success: true, comparison: {} });
    },
    askAboutCar: (req: any, res: any) => {
      const sessionId = req.body.sessionId || 'test-session';
      const conv = conversationService.getOrInitialize(sessionId);
      conv.history.push({ type: 'ask-about-car', timestamp: new Date(), data: { car: req.body.car, question: req.body.question } });
      res.json({ success: true, answer: 'Safe.' });
    },
    getAlternatives: (req: any, res: any) => {
      const sessionId = req.body.sessionId || 'test-session';
      const conv = conversationService.getOrInitialize(sessionId);
      conv.history.push({ type: 'get-alternatives', timestamp: new Date(), data: { car: req.body.car, reason: req.body.reason } });
      res.json({ success: true, alternatives: [] });
    },
    resetConversation: (req: any, res: any) => {
      const sessionId = req.body.sessionId || 'test-session';
      conversationService.delete(sessionId);
      res.json({ success: true });
    }
  },
}));

vi.mock('../../controllers/qaController.js', () => ({
  qaController: {
    getConversations: (req: any, res: any) => {
      const all = conversationService.getAll().map(([id, conv]) => ({ id, ...conv }));
      res.json({ success: true, conversations: all });
    },
  },
}));

describe('Conversation History Flow', () => {
  let app: express.Application;
  const sessionId = 'history-test-session';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', apiRoutes);
    conversationService.delete(sessionId);
  });

  it('should capture all steps in conversation history', async () => {
    // 1. Find Cars
    const findRes = await request(app)
      .post('/api/find-cars')
      .send({ requirements: 'cheap city car', sessionId });
    expect(findRes.body.success).toBe(true);

    // 2. Compare Cars
    const compareRes = await request(app)
      .post('/api/compare-cars')
      .send({ car1: 'Fiat 500', car2: 'Smart Fortwo', sessionId });
    expect(compareRes.body.success).toBe(true);

    // 3. Ask about car
    const askRes = await request(app)
      .post('/api/ask-about-car')
      .send({ car: 'Fiat 500', question: 'Is it reliable?', sessionId });
    expect(askRes.body.success).toBe(true);

    // 4. Get alternatives
    const altRes = await request(app)
      .post('/api/get-alternatives')
      .send({ car: 'Fiat 500', reason: 'Too small', sessionId });
    expect(altRes.body.success).toBe(true);

    // 5. Verify History
    const histRes = await request(app).get('/api/get-conversations');
    expect(histRes.body.success).toBe(true);

    const myConv = histRes.body.conversations.find((c: any) => c.id === sessionId);
    expect(myConv).toBeDefined();
    expect(myConv.history.length).toBe(4);
    
    const types = myConv.history.map((h: any) => h.type);
    expect(types).toContain('find-cars');
    expect(types).toContain('compare-cars');
    expect(types).toContain('ask-about-car');
    expect(types).toContain('get-alternatives');
  });
});
