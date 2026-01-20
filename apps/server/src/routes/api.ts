import express from 'express';
import { carsController } from '../controllers/carsController.js';
import { qaController } from '../controllers/qaController.js';
import { healthController } from '../controllers/healthController.js';
import { config } from '../config/index.js';

const router = express.Router();

/**
 * Car Operations (Search, Refine, Compare, Q&A)
 */
router.post('/find-cars', carsController.findCars);
router.post('/refine-search', carsController.refineSearch);
router.post('/reset-conversation', carsController.resetConversation);

/**
 * Management & Debug (Development only)
 */
if (!config.isProduction) {
  router.get('/get-conversations', qaController.getConversations);
}

/**
 * System Health
 */
router.get('/health', healthController.checkHealth);

export default router;
