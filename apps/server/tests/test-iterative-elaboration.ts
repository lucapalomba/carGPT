import { aiService } from '../src/services/aiService.js';
import logger from '../src/utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Test script for iterative car elaboration
 */
async function testIterativeElaboration() {
  const requirements = "I'm looking for a reliable family SUV, hybrid, under 30k Euro, available in Italy. I like Toyota or Honda.";
  const language = "Italian";
  const sessionId = "test-session-" + Date.now();

  logger.info('Starting iterative elaboration test...');
  
  try {
    const isAvailable = await aiService.verify();
    if (!isAvailable) {
      logger.error('Ollama is not available. Please make sure it is running.');
      process.exit(1);
    }

    const response = await aiService.findCarsWithImages(requirements, language, sessionId);
    
    console.log('\n--- Test Result ---');
    console.log('Analysis:', response.analysis);
    console.log('Cars found:', response.cars?.length);
    
    if (response.cars && response.cars.length > 0) {
      response.cars.forEach((car, index) => {
        console.log(`\nCar ${index + 1}: ${car.make} ${car.model} (${car.year})`);
        console.log(`Price: ${car.price}`);
        console.log(`Reason: ${car.reason}`);
        console.log(`Images: ${car.images?.length || 0}`);
        
        if (car.properties) {
          console.log('Properties:', Object.keys(car.properties).join(', '));
        }
      });
    } else {
      console.log('No cars were returned in the response.');
    }
    
    console.log('\n--- End of Test ---');
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

testIterativeElaboration();
