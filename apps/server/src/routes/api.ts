import express from 'express';
import { carsController } from '../controllers/carsController.js';
import { qaController } from '../controllers/qaController.js';
import { healthController } from '../controllers/healthController.js';

const router = express.Router();

/**
 * Car Operations (Search, Refine, Compare, Q&A)
 */
router.post('/find-cars', carsController.findCars);
router.post('/refine-search', carsController.refineSearch);
router.post('/compare-cars', carsController.compareCars);
router.post('/get-alternatives', carsController.getAlternatives);
router.post('/ask-about-car', carsController.askAboutCar);

/**
 * Management & Debug
 */
router.get('/get-conversations', qaController.getConversations);

/**
 * System Health
 */
router.get('/health', healthController.checkHealth);
router.post('/reset-conversation', healthController.resetConversation);

export default router;
