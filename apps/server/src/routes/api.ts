import express from 'express';
import { carsController } from '../controllers/carsController.js';
import { healthController } from '../controllers/healthController.js';
import {
  globalLimiter,
  findCarsLimiter,
  refineSearchLimiter,
  conversationLimiter,
  healthLimiter,
  apiSlowDown
} from '../middleware/rateLimiter.js';
import { queueOllamaRequest } from '../middleware/requestQueue.js';

const router = express.Router();

router.use(apiSlowDown);

router.post('/find-cars',
  globalLimiter,
  findCarsLimiter,
  queueOllamaRequest,
  carsController.findCars
);

router.post('/refine-search',
  globalLimiter,
  refineSearchLimiter,
  queueOllamaRequest,
  carsController.refineSearch
);

router.post('/reset-conversation',
  globalLimiter,
  conversationLimiter,
  carsController.resetConversation
);

router.get('/health', healthLimiter, healthController.checkHealth);

export default router;
