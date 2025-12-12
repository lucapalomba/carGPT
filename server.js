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
// Check environment mode (dev/prod)
const MODE = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = MODE === 'production';

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
    console.log('📨 Sending prompt to Ollama:');
    console.log(JSON.stringify(messages, null, 2));
    console.log('-----------------------------------');

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
          temperature: 0,
          num_predict: 2500
        },
        format: "json"
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.message.content;

    console.log('📥 Received response from Ollama:');
    console.log(content);
    console.log('-----------------------------------');

    return content;

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
  cleaned = cleaned.replace(/'\s*/g, '');
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

    // Get or initialize conversation
    let conversation = conversations.get(sessionId);
    if (!conversation) {
      conversation = {
        sessionId,
        createdAt: new Date(),
        updatedAt: new Date(),
        history: []
      };
      conversations.set(sessionId, conversation);
    }

    // Prompt to analyze requirements and suggest cars
    // Add messages to the prompt before calling Ollama
    const findCarPromptTemplate = readFileSync('./prompt-templates/find-cars.md', 'utf8');
    const messages = [
      {
        role: "system",
        content: findCarPromptTemplate
      },
      {
        role: "user",
        content: requirements
      }
    ];
    console.log('📝 Request received:', requirements);

    const response = await callOllama(messages);

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


      // Store detected language
      if (result.userLanguage) {
        conversation.userLanguage = result.userLanguage;
      }

    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      console.error('Raw response:', response);

      return res.status(500).json({
        success: false,
        error: 'Error analyzing requirements. Please try with a different description.',
        debug: process.env.NODE_ENV === 'development' ? response : undefined
      });
    }

    // Save conversation interaction
    conversation.updatedAt = new Date();
    conversation.history.push({
      type: 'find-cars',
      timestamp: new Date(),
      data: {
        requirements: requirements,
        result: result,
        messages: messages
      }
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

    const sessionId = req.sessionID;

    console.log(`📊 Comparing: ${car1} VS ${car2}`);

    const comparePromptTemplate = readFileSync('./prompt-templates/compare-cars.md', 'utf8');
    const messages = [
      {
        role: "system",
        content: comparePromptTemplate
      },
      {
        role: "user",
        content: `Compare in detail: ${car1} VS ${car2}`
      }
    ];

    const response = await callOllama(messages);

    let result;
    try {
      result = parseJsonResponse(response);

      console.log('🔍 Parsed comparison:', JSON.stringify(result, null, 2));

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

    // Save interaction if conversation exists
    const conversation = conversations.get(sessionId);
    if (conversation) {
      conversation.updatedAt = new Date();
      conversation.history.push({
        type: 'compare-cars',
        timestamp: new Date(),
        data: {
          car1,
          car2,
          result,
          messages
        }
      });
    }

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

    const sessionId = req.sessionID;

    const askingPromptTemplate = readFileSync('./prompt-templates/asking-car.md', 'utf8');
    const messages = [
      {
        role: "system",
        content: askingPromptTemplate + ` ${car}`
      },
      {
        role: "user",
        content: `About ${car}: ${question}`
      }
    ];

    console.log(`❓ Question about ${car}: ${question}`);

    const response = await callOllama(messages);

    res.json({
      success: true,
      car: car,
      question: question,
      answer: JSON.parse(response).answer || "",
      metadata: JSON.parse(response).metadata || {}
    });

    // Save interaction if conversation exists
    const conversation = conversations.get(sessionId);
    if (conversation) {
      conversation.updatedAt = new Date();
      conversation.history.push({
        type: 'ask-about-car',
        timestamp: new Date(),
        data: {
          car,
          question,
          answer: JSON.parse(response).answer || "",
          messages
        }
      });
    }

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

    const sessionId = req.sessionID;

    console.log(`🔄 Finding alternatives for: ${car}`);

    const getAlternativePromptTemplate = readFileSync('./prompt-templates/get-alternative-car.md', 'utf8');
    const messages = [
      {
        role: "system",
        content: getAlternativePromptTemplate + `Car ${car}` + ` and Reason ${reason || 'The user is looking for alternatives because: ${reason}'}`
      },
      {
        role: "user",
        content: `Suggest 3 alternatives to ${car}`
      }
    ];

    const response = await callOllama(messages);

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

    // Save interaction if conversation exists
    const conversation = conversations.get(sessionId);
    if (conversation) {
      conversation.updatedAt = new Date();
      conversation.history.push({
        type: 'get-alternatives',
        timestamp: new Date(),
        data: {
          car,
          reason,
          alternatives: result.alternatives,
          messages
        }
      });
    }

  } catch (error) {
    console.error('Error in get-alternatives:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint to refine search based on feedback
app.post('/api/refine-search', async (req, res) => {
  try {
    const { feedback, pinnedCars } = req.body;
    const sessionId = req.sessionID;

    if (!feedback) {
      return res.status(400).json({
        success: false,
        error: 'Please provide some feedback to refine the search'
      });
    }

    const conversation = conversations.get(sessionId);
    if (!conversation) {
      return res.status(400).json({
        success: false,
        error: 'No active conversation found. Start a new search first.'
      });
    }

    // Find the original requirements from history or conversation root
    let originalRequirements = conversation.requirements || '';
    if (!originalRequirements && conversation.history) {
      const findAction = conversation.history.find(h => h.type === 'find-cars');
      if (findAction) {
        originalRequirements = findAction.data.requirements;
      }
    }

    if (!originalRequirements) {
      originalRequirements = "User is looking for a car.";
    }

    // Build full context from history
    let contextParts = [];

    // 1. Original requirement
    if (originalRequirements) {
      contextParts.push(`Original Request: "${originalRequirements}"`);
    }

    // 2. Previous refinements
    if (conversation.history) {
      conversation.history.forEach((h, index) => {
        if (h.type === 'refine-search' && h.data.feedback) {
          contextParts.push(`Refinement Step ${index + 1}: "${h.data.feedback}"`);
        }
      });
    }

    const fullContext = contextParts.join('\n');
    console.log('📜 Construction full context:', fullContext);

    console.log(`🔄 Refining search with feedback: "${feedback}"`);
    console.log(`📌 Pinned cars: ${pinnedCars ? pinnedCars.length : 0}`);

    const refinePromptTemplate = readFileSync('./prompt-templates/refine-cars.md', 'utf8');

    // Format pinned cars for prompt
    let pinnedCarsJson = 'None';
    if (pinnedCars && pinnedCars.length > 0) {
      pinnedCarsJson = JSON.stringify(pinnedCars);
    }

    const messages = [
      {
        role: "system",
        content: refinePromptTemplate
          .replace('${requirements}', fullContext)
          .replace('${pinnedCars}', pinnedCarsJson)
          .replace('${feedback}', feedback)
      },
      {
        role: "user",
        content: "Refine suggestions."
      }
    ];

    const response = await callOllama(messages);

    let result;
    try {
      result = parseJsonResponse(response);
      console.log('🔍 Parsed refinement:', JSON.stringify(result, null, 2));

      if (!result.cars || !Array.isArray(result.cars)) {
        throw new Error('Invalid JSON structure - expected cars array');
      }

      // Ensure specific structure
      result.cars = result.cars.map(car => ({
        make: car.make || car.marca,
        model: car.model || car.modello,
        year: car.year || car.anno,
        price: car.price || car.prezzo,
        type: car.type || car.tipo,
        strengths: car.strengths || car.puntiForza || [],
        weaknesses: car.weaknesses || car.puntiDeboli || [],
        reason: car.reason || car.motivazione,
        properties: car.properties || {}
      }));

    } catch (parseError) {
      console.error('Error parsing refinement:', parseError);
      return res.status(500).json({
        success: false,
        error: 'Error refining search. Please try again.',
        debug: process.env.NODE_ENV === 'development' ? response : undefined
      });
    }

    // Save interaction
    conversation.updatedAt = new Date();
    conversation.history.push({
      type: 'refine-search',
      timestamp: new Date(),
      data: {
        feedback,
        pinnedCars,
        result,
        messages
      }
    });

    res.json({
      success: true,
      analysis: result.analysis,
      cars: result.cars
    });

  } catch (error) {
    console.error('Error in refine-search:', error);
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

// New endpoint to retrieve all stored conversations
app.get('/api/get-conversations', async (req, res) => {
  try {
    // Return all conversations in the Map
    const conversationsList = Array.from(conversations.entries());

    res.json({
      success: true,
      conversations: conversationsList,
      count: conversationsList.length
    });
  } catch (error) {
    console.error('Error retrieving conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving conversations'
    });
  }
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

  // Modify console.log statements to conditionally log behavior
  if (IS_PRODUCTION) {
    console.log(`🚀 Running in ${MODE} mode (Ollama: ${OLLAMA_MODEL})`);
  } else {
    console.log(`🚀 Running in ${MODE} mode (Ollama: ${OLLAMA_MODEL})`);
    console.log(`⚠️  Note: This is a ${MODE} environment (not production)`);
  }
});
