import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'ministral';

// Load Swagger documentation
const swaggerDocument = JSON.parse(readFileSync('./swagger.json', 'utf8'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cargpt-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1 hour
}));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CarGPT API Documentation'
}));

// Store conversations in memory
const conversations = new Map();

// Cleanup old conversations every hour
setInterval(() => {
  const now = new Date();
  for (const [key, conv] of conversations.entries()) {
    const diff = now - conv.createdAt;
    if (diff > 3600000) { // 1 hour
      conversations.delete(key);
    }
  }
}, 3600000);

// Helper function to call Ollama
async function callOllama(messages) {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2500
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    return data.message.content;

  } catch (error) {
    console.error('Error calling Ollama:', error);
    throw new Error('Unable to connect to Ollama. Make sure it is running (ollama serve)');
  }
}

// Helper function to clean and parse JSON from LLM response
function parseJsonResponse(text) {
  // Remove markdown code blocks
  let cleaned = text.trim();
  cleaned = cleaned.replace(/```json\s*/g, '');
  cleaned = cleaned.replace(/```\s*/g, '');
  cleaned = cleaned.trim();

  // Try to find JSON object in the text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // Fix common JSON issues from LLMs
  // 1. Replace single quotes with double quotes (but not inside strings)
  // This is a simple approach - replace single quotes around keys and simple values
  cleaned = cleaned.replace(/'/g, '"');

  // 2. Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // 3. Try to parse
  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    // If still failing, try more aggressive cleaning
    console.error('First parse attempt failed:', firstError.message);
    console.error('Attempting more aggressive cleaning...');

    // Try to extract just the JSON part more carefully
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (secondError) {
        console.error('Second parse attempt failed:', secondError.message);
        throw new Error(`Failed to parse JSON: ${firstError.message}`);
      }
    }
    throw firstError;
  }
}

// Verify Ollama is available
async function verifyOllama() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await response.json();

    const modelExists = data.models.some(m => m.name.includes(OLLAMA_MODEL));

    if (!modelExists) {
      console.warn(`⚠️  Model ${OLLAMA_MODEL} not found!`);
      console.warn(`   Run: ollama pull ${OLLAMA_MODEL}`);
      return false;
    }

    console.log(`✅ Ollama connected - Model: ${OLLAMA_MODEL}`);
    return true;
  } catch (error) {
    console.error('❌ Ollama not reachable!');
    console.error('   Make sure Ollama is running: ollama serve');
    return false;
  }
}

// Main endpoint - analyze requirements and suggest cars
app.post('/api/find-cars', async (req, res) => {
  try {
    const { requirements } = req.body;
    const sessionId = req.sessionID;

    if (!requirements || requirements.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Describe your needs in more detail (at least 10 characters)'
      });
    }

    // Prompt to analyze requirements and suggest cars
    const messages = [
      {
        role: "system",
        content: `You are an expert car consultant. Your task is:
1. Analyze the user's needs and identify their PRIMARY FOCUS (performance, space, economy, luxury, etc.)
2. Suggest EXACTLY 3 cars that match their requirements
3. For each car, provide core information AND 3-5 properties most relevant to the user's focus

CRITICAL: You MUST respond with ONLY a VALID JSON object in this EXACT format (no other text, no markdown):
{
  "analysis": "brief analysis of user needs (2-3 sentences)",
  "cars": [
    {
      "make": "Brand name",
      "model": "Model name",
      "year": "2023",
      "price": "25,000-30,000€",
      "type": "SUV/Sedan/Compact/Station Wagon/etc",
      "properties": {
        "property1Name": "value1",
        "property2Name": "value2",
        "property3Name": "value3"
      },
      "strengths": ["point 1", "point 2", "point 3"],
      "weaknesses": ["point 1", "point 2"],
      "reason": "brief explanation why it's suitable (1-2 sentences)"
    }
  ]
}

PROPERTY SELECTION GUIDELINES based on user focus:
- SPORTS/PERFORMANCE: horsepower, acceleration0to60, topSpeed, transmission, handling
- FAMILY/SPACE: seatingCapacity, trunkSize, cargoSpace, safetyRating, childSeatAnchors
- ECONOMY/BUDGET: fuelConsumption, maintenanceCost, insuranceCost, depreciation, taxCost
- LUXURY/COMFORT: interiorQuality, technologyFeatures, soundSystem, comfortFeatures, materials
- OFF-ROAD/ADVENTURE: groundClearance, fourWheelDrive, towingCapacity, offRoadCapability
- CITY/URBAN: parkingEase, turningRadius, cityFuelConsumption, compactSize
- ECO/ELECTRIC: batteryRange, chargingTime, electricMotor, emissions, ecoFeatures

Choose 3-5 properties that best match the user's PRIMARY focus. Use camelCase for property names.
After choosing property, all vehicles should have an answer for each property.

IMPORTANT:
- Suggest REAL and AVAILABLE cars on the market
- Vary proposals (different price ranges, different segments)
- Be specific with models and versions
- Consider the European market
- Use metric sistem and EURO currency
- ALL 3 cars should have the SAME property names (for comparison)
- Return ONLY the JSON, nothing else`
      },
      {
        role: "user",
        content: `My requirements are: ${requirements}`
      }
    ];

    console.log('📝 Request received:', requirements);

    const response = await callOllama(messages);

    console.log('🤖 Raw response from Ollama:', response.substring(0, 200) + '...');

    // Parse JSON from response
    let result;
    try {
      result = parseJsonResponse(response);

      console.log('🔍 Parsed result:', JSON.stringify(result, null, 2));

      // Validate structure
      const carsArray = result.cars || result.auto;

      if (!carsArray || !Array.isArray(carsArray) || carsArray.length !== 3) {
        throw new Error('Invalid JSON structure - expected 3 cars');
      }

      // Normalize field names
      result.cars = carsArray.map(car => {
        // Core properties (always present)
        const normalized = {
          make: car.make || car.marca,
          model: car.model || car.modello,
          year: car.year || car.anno,
          price: car.price || car.prezzo,
          type: car.type || car.tipo,
          strengths: car.strengths || car.puntiForza || [],
          weaknesses: car.weaknesses || car.puntiDeboli || [],
          reason: car.reason || car.motivazione
        };

        // Handle dynamic properties (new format)
        if (car.properties && typeof car.properties === 'object') {
          normalized.properties = car.properties;
        } else {
          // Backward compatibility: convert old hardcoded fields to properties object
          normalized.properties = {};
          if (car.trunkSize || car.bagagliaio) {
            normalized.properties.trunkSize = car.trunkSize || car.bagagliaio;
          }
          if (car.fuelConsumption || car.consumi) {
            normalized.properties.fuelConsumption = car.fuelConsumption || car.consumi;
          }
          if (car.reliability || car.affidabilita) {
            normalized.properties.reliability = car.reliability || car.affidabilita;
          }
        }

        return normalized;
      });

      result.analysis = result.analysis || result.analisi || 'Based on your requirements, here are the best options.';

    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      console.error('Raw response:', response);

      return res.status(500).json({
        success: false,
        error: 'Error analyzing requirements. Please try with a different description.',
        debug: process.env.NODE_ENV === 'development' ? response : undefined
      });
    }

    // Save conversation
    conversations.set(sessionId, {
      requirements: requirements,
      result: result,
      messages: messages,
      createdAt: new Date()
    });

    console.log('✅ Suggestions generated:', result.cars.map(c => `${c.make} ${c.model}`).join(', '));

    res.json({
      success: true,
      conversationId: sessionId,
      analysis: result.analysis,
      cars: result.cars
    });

  } catch (error) {
    console.error('Error in find-cars:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error retrieving suggestions'
    });
  }
});

// Endpoint for detailed comparison between two cars
app.post('/api/compare-cars', async (req, res) => {
  try {
    const { car1, car2 } = req.body;

    if (!car1 || !car2) {
      return res.status(400).json({
        success: false,
        error: 'Specify two cars to compare'
      });
    }

    console.log(`📊 Comparing: ${car1} VS ${car2}`);

    const messages = [
      {
        role: "system",
        content: `You are an expert who compares automobiles. Provide a detailed comparison between two specific cars.

Return ONLY this JSON format (no markdown, no other text):
{
  "comparison": "introduction to comparison (2-3 sentences)",
  "categories": [
    {
      "name": "Performance",
      "car1": "description and rating 1-10",
      "car2": "description and rating 1-10",
      "winner": "car1/car2/tie"
    },
    {
      "name": "Fuel Consumption",
      "car1": "...",
      "car2": "...",
      "winner": "..."
    },
    {
      "name": "Space and Practicality",
      "car1": "...",
      "car2": "...",
      "winner": "..."
    },
    {
      "name": "Reliability",
      "car1": "...",
      "car2": "...",
      "winner": "..."
    },
    {
      "name": "Cost of Ownership",
      "car1": "...",
      "car2": "...",
      "winner": "..."
    }
  ],
  "conclusion": "which to choose and why (3-4 sentences)"
}`
      },
      {
        role: "user",
        content: `Compare in detail: ${car1} VS ${car2}`
      }
    ];

    const response = await callOllama(messages);

    console.log('🤖 Raw comparison response:', response.substring(0, 200) + '...');

    let result;
    try {
      result = parseJsonResponse(response);

      console.log('🔍 Parsed comparison:', JSON.stringify(result, null, 2));

      // Validate structure
      if (!result.comparison || !result.categories || !result.conclusion) {
        throw new Error('Invalid comparison structure');
      }

    } catch (parseError) {
      console.error('Error parsing comparison:', parseError);
      console.error('Raw response:', response);

      return res.status(500).json({
        success: false,
        error: 'Error in comparison. Please try again.',
        debug: process.env.NODE_ENV === 'development' ? response : undefined
      });
    }

    console.log('✅ Comparison generated successfully');

    res.json({
      success: true,
      comparison: result
    });

  } catch (error) {
    console.error('Error in compare-cars:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error in comparison'
    });
  }
});

// Endpoint for specific questions about a suggested car
app.post('/api/ask-about-car', async (req, res) => {
  try {
    const { car, question } = req.body;

    if (!car || !question) {
      return res.status(400).json({
        success: false,
        error: 'Specify a car and a question'
      });
    }

    console.log(`❓ Question about ${car}: ${question}`);

    const messages = [
      {
        role: "system",
        content: `You are a car expert. Answer detailed and precise questions about ${car}.
        Provide concrete information, real numbers, and practical advice. Respond in 2-4 paragraphs.`
      },
      {
        role: "user",
        content: `About ${car}: ${question}`
      }
    ];

    const response = await callOllama(messages);

    res.json({
      success: true,
      car: car,
      question: question,
      answer: response
    });

  } catch (error) {
    console.error('Error in ask-about-car:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error in response'
    });
  }
});

// Endpoint to get similar alternatives
app.post('/api/get-alternatives', async (req, res) => {
  try {
    const { car, reason } = req.body;

    if (!car) {
      return res.status(400).json({
        success: false,
        error: 'Specify a car'
      });
    }

    console.log(`🔄 Finding alternatives for: ${car}`);

    const messages = [
      {
        role: "system",
        content: `You are an expert automotive consultant. Suggest 3 concrete alternatives to ${car}.
        ${reason ? `The user is looking for alternatives because: ${reason}` : ''}

Return ONLY this JSON format (no markdown):
{
  "alternatives": [
    {
      "make": "...",
      "model": "...",
      "reason": "brief explanation (1-2 sentences)",
      "advantages": "what makes it better/different"
    }
  ]
}`
      },
      {
        role: "user",
        content: `Suggest 3 alternatives to ${car}`
      }
    ];

    const response = await callOllama(messages);

    console.log('🤖 Raw alternatives response:', response.substring(0, 200) + '...');

    let result;
    try {
      result = parseJsonResponse(response);

      console.log('🔍 Parsed alternatives:', JSON.stringify(result, null, 2));

      if (!result.alternatives || result.alternatives.length === 0) {
        throw new Error('No alternatives found');
      }

    } catch (parseError) {
      console.error('Error parsing alternatives:', parseError);
      console.error('Raw response:', response);

      return res.status(500).json({
        success: false,
        error: 'Error retrieving alternatives',
        debug: process.env.NODE_ENV === 'development' ? response : undefined
      });
    }

    console.log('✅ Alternatives generated successfully');

    res.json({
      success: true,
      alternatives: result.alternatives
    });

  } catch (error) {
    console.error('Error in get-alternatives:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reset conversation
app.post('/api/reset-conversation', (req, res) => {
  const sessionId = req.sessionID;
  conversations.delete(sessionId);

  res.json({
    success: true,
    message: 'Conversation reset'
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  const ollamaOk = await verifyOllama();

  res.json({
    status: ollamaOk ? 'ok' : 'degraded',
    ollama: ollamaOk ? 'connected' : 'disconnected',
    model: OLLAMA_MODEL,
    active_conversations: conversations.size
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n🚗 CarGPT server started on http://localhost:${PORT}`);
  console.log(`🤖 AI Model: ${OLLAMA_MODEL} (Ollama)`);
  console.log(`📊 Active conversations: ${conversations.size}`);

  const ollamaOk = await verifyOllama();

  if (!ollamaOk) {
    console.log('\n⚠️  WARNING:');
    console.log('   1. Install Ollama: https://ollama.ai');
    console.log(`   2. Pull the model: ollama pull ${OLLAMA_MODEL}`);
    console.log('   3. Start Ollama: ollama serve');
    console.log('   4. Restart this server\n');
  } else {
    console.log('✅ All ready! Open http://localhost:3000\n');
  }
});
