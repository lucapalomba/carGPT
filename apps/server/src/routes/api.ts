import express from 'express';
import { carsController } from '../controllers/carsController.js';

import { healthController } from '../controllers/healthController.js';


const router = express.Router();

/**
 * Car Operations (Search, Refine, Compare, Q&A)
 */
router.post('/find-cars', carsController.findCars);
router.post('/refine-search', carsController.refineSearch);
router.post('/reset-conversation', carsController.resetConversation);



/**
 * System Health
 */
router.get('/health', healthController.checkHealth);

export default router;
