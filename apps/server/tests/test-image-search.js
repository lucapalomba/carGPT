/* eslint-disable no-console */
/**
 * Manual test script for image search functionality
 * 
 * Usage:
 *   1. Make sure server is running: npm run dev
 *   2. Run this script: node tests/test-image-search.js
 */

const API_URL = 'http://localhost:3000';

async function testHealthCheck() {
  console.log('\n🔍 Testing health check endpoint...\n');
  
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    
    console.log('✅ Health check response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.status === 'healthy') {
      console.log('\n✅ Server is healthy');
    } else {
      console.log('\n⚠️  Server is degraded');
    }
    
    if (!data.googleSearchConfigured) {
      console.log('⚠️  WARNING: Google Search API key or CX not configured!');
      console.log('   Images will not be fetched.');
    }
    
    return data.status === 'healthy';
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testFindCars() {
  console.log('\n🔍 Testing find-cars endpoint with image search...\n');
  
  try {
    const response = await fetch(`${API_URL}/api/find-cars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requirements: 'I need a family SUV under €40,000 with good fuel economy'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Find cars response:');
    console.log(`   Provider: ${data.provider}`);
    console.log(`   Cars found: ${data.cars?.length || 0}`);
    console.log();
    
    if (data.cars && data.cars.length > 0) {
      data.cars.forEach((car, index) => {
        console.log(`   ${index + 1}. ${car.make} ${car.model} (${car.year})`);
        console.log(`      Price: ${car.price}`);
        console.log(`      Images: ${car.images?.length || 0}`);
        
        if (car.images && car.images.length > 0) {
          car.images.forEach((img, imgIndex) => {
            console.log(`         ${imgIndex + 1}) ${img.title}`);
            console.log(`            URL: ${img.url.substring(0, 60)}...`);
          });
        } else {
          console.log('         ⚠️  No images found');
        }
        console.log();
      });
      
      // Check if images were found
      const totalImages = data.cars.reduce((sum, car) => sum + (car.images?.length || 0), 0);
      
      if (totalImages === 0) {
        console.log('⚠️  WARNING: No images were found for any cars!');
        console.log('   Check:');
        console.log('   1. GOOGLE_API_KEY and GOOGLE_CX are set in .env');
        console.log('   2. Google API key is valid and has quota');
        console.log('   3. Server logs for errors');
      } else {
        console.log(`✅ Successfully found ${totalImages} images across all cars`);
      }
      
    } else {
      console.log('⚠️  No cars returned in response');
    }
    
    return data.success;
    
  } catch (error) {
    console.error('❌ Find cars test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CarGPT Image Search Integration Test');
  console.log('═══════════════════════════════════════════════════════');
  
  const healthOk = await testHealthCheck();
  
  if (!healthOk) {
    console.log('\n❌ Server health check failed. Make sure:');
    console.log('   1. Server is running: npm run dev');
    console.log('   2. AI provider is configured (Ollama or Anthropic)');
    console.log('   3. Check .env configuration');
    return;
  }
  
  await testFindCars();
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Test completed');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Run tests
runTests().catch(console.error);
