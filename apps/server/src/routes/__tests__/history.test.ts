import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import apiRoutes from '../api.js';
import { ConversationService } from '../../services/conversationService.js';

const mockConversationService = new ConversationService();

// Mocking controllers to simulate history recording without real LLM calls
vi.mock('../../controllers/carsController.js', () => ({
  carsController: {
    findCars: (req: any, res: any) => {
      const sessionId = req.body.sessionId || 'test-session';
      const conv = mockConversationService.getOrInitialize(sessionId);
      conv.history.push({ type: 'find-cars', timestamp: new Date(), data: { requirements: req.body.requirements } });
      res.json({ success: true, sessionId, cars: [{ make: 'Fiat', model: '500' }, { make: 'Smart', model: 'Fortwo' }] });
    },
    refineSearch: (req: any, res: any) => {
      const sessionId = req.body.sessionId || 'test-session';
      const conv = mockConversationService.getOrInitialize(sessionId);
      conv.history.push({ type: 'refine-search', timestamp: new Date(), data: { feedback: req.body.feedback } });
      res.json({ success: true, sessionId, cars: [] });
    },
    resetConversation: (req: any, res: any) => {
      const sessionId = req.body.sessionId || 'test-session';
      mockConversationService.delete(sessionId);
      res.json({ success: true });
    }
  },
}));

vi.mock('../../controllers/qaController.js', () => ({
  qaController: {
    getConversations: (req: any, res: any) => {
      const all = mockConversationService.getAll().map(([id, conv]) => ({ id, ...conv }));
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
    mockConversationService.delete(sessionId);
  });

  it('should capture all steps in conversation history', async () => {
    // 1. Find Cars
    const findRes = await request(app)
      .post('/api/find-cars')
      .send({ requirements: 'cheap city car', sessionId });
    expect(findRes.body.success).toBe(true);

    // 2. Verify History
    const histRes = await request(app).get('/api/get-conversations');
    expect(histRes.body.success).toBe(true);

    const myConv = histRes.body.conversations.find((c: any) => c.id === sessionId);
    expect(myConv).toBeDefined();
    expect(myConv.history.length).toBe(1);
    
    const types = myConv.history.map((h: any) => h.type);
    expect(types).toContain('find-cars');
  });
});
