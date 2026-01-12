# API Documentation

## Overview

CarGPT provides a RESTful API for interacting with the AI-powered car recommendation system. All endpoints communicate with a local Ollama instance.

## Interactive API Documentation

**🚀 Swagger UI**: For interactive API documentation with the ability to test endpoints directly in your browser (Development Only), visit:

```
http://localhost:3000/api-docs
```

The Swagger UI provides:
- Complete API reference with request/response schemas
- Interactive "Try it out" functionality
- Example requests and responses
- Automatic validation

## Base URL

```
http://localhost:3000/api
```

## Localization

CarGPT uses the `Accept-Language` HTTP header to determine the user's preferred language and regional market.

- **Language Detection**: The AI will respond in the language specified in the header.
- **Market Restriction**: The system automatically restricts car suggestions to the market corresponding to the detected language (e.g., `es-ES` will prioritize cars available in Spain).
- **Default**: If the header is missing, it defaults to English (`en`).

## Endpoints

### 1. Find Cars Based on Requirements

**Endpoint**: `POST /api/find-cars`

**Description**: Analyzes user requirements and returns 3 personalized car recommendations.

**Request Body**:
```json
{
  "requirements": "Looking for a spacious family car with large trunk for 3 suitcases"
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "conversationId": "session-id-here",
  "searchIntent": {
    "user_country": "USA",
    "primary_focus": "spacious, practical, economical",
    "constraints": {
      "budget": "20000 - 25000",
      "must_have": ["large trunk", "low consumption"]
    },
    "interesting_properties": ["trunk_volume", "fuel_consumption", "ncap_rating"]
  },
  "suggestions": {
    "analysis": "User needs a family car with large trunk...",
    "choices": [...]
  },
  "analysis": "Analysis of user requirements...",
  "cars": [
    {
      "make": "Skoda",
      "model": "Octavia Wagon",
      "year": 2023,
      "body_type": "Station Wagon",
      "configuration": "2.0 TDI Style",
      "precise_model": "Skoda Octavia Wagon 2.0 TDI 2023 Style",
      "price": "25,000-30,000€",
      "type": "Station Wagon",
      "market_availability": "Available in the US market",
      "constraints_satisfaction": {
        "budget": 85,
        "large_trunk": 95,
        "low_consumption": 80
      },
      "properties": {
        "trunk_volume": {
          "translatedLabel": "Trunk Size",
          "value": "640 liters"
        },
        "fuel_consumption": {
          "translatedLabel": "Fuel Consumption",
          "value": "5.2 l/100km"
        }
      },
      "strengths": ["Huge trunk", "Reliable", "Spacious"],
      "weaknesses": ["Conservative design", "Average resale value"],
      "reason": "Perfect for families thanks to the space...",
      "percentage": "95",
      "images": [
        {
          "url": "https://example.com/car.jpg",
          "thumbnail": "https://example.com/car-thumb.jpg",
          "title": "Skoda Octavia Wagon"
        }
      ]
    }
    // ... 2 more cars
  ]
}
```

**Response** (Error - 400/500):
```json
{
  "success": false,
  "error": "Error description"
}
```

**Validation**:
- `requirements` must be at least 10 characters

---

### 2. Refine Search

**Endpoint**: `POST /api/refine-search`

**Description**: Updates the list of car suggestions based on user feedback and pinned cars.

**Request Body**:
```json
{
  "feedback": "Too expensive, I want something under €20k",
  "pinnedCars": [
    {
      "make": "Skoda",
      "model": "Octavia Wagon",
      "year": "2023",
      "price": "25,000-30,000€",
      "type": "Station Wagon",
      "market_availability": "Available in the US market",
      "strengths": ["Huge trunk", "Reliable", "Spacious"],
      "weaknesses": ["Conservative design", "Average resale value"],
      "trunkSize": "640 liters",
      "fuelConsumption": "5.2 l/100km",
      "reliability": "High",
      "reason": "Perfect for families thanks to the space..."
    }
  ]
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "searchIntent": {
    "user_country": "USA",
    "primary_focus": "affordable, compact, efficient",
    "constraints": {
      "budget": "15000 - 20000",
      "must_have": ["low price"]
    },
    "interesting_properties": ["trunk_volume", "fuel_consumption"]
  },
  "suggestions": {
    "analysis": "User refined search to focus on budget...",
    "choices": [...],
    "pinned_cars": [...]
  },
  "analysis": "Based on your feedback...",
  "cars": [
    {
      "make": "Skoda",
      "model": "Fabia",
      "year": 2023,
      "body_type": "Compact",
      "configuration": "1.0 TSI Selection",
      "precise_model": "Skoda Fabia 1.0 TSI 2023 Selection",
      "price": "18,000-22,000€",
      "type": "Compact",
      "market_availability": "Available in the US market",
      "constraints_satisfaction": {
        "budget": 95,
        "low_price": 90
      },
      "properties": {
        "trunk_volume": {
          "translatedLabel": "Trunk Size",
          "value": "380 liters"
        },
        "fuel_consumption": {
          "translatedLabel": "Fuel Consumption",
          "value": "4.5 l/100km"
        }
      },
      "strengths": ["Affordable", "Compact", "Efficient"],
      "weaknesses": ["Smaller trunk", "Less power"],
      "reason": "A more affordable option fitting your budget...",
      "percentage": "90",
      "images": [
        {
          "url": "https://example.com/fabia.jpg",
          "thumbnail": "https://example.com/fabia-thumb.jpg",
          "title": "Skoda Fabia"
        }
      ]
    }
    // ... more cars (pinned ones included)
  ]
}
```

---

### 3. Compare Two Cars

**Endpoint**: `POST /api/compare-cars`

**Description**: Provides detailed comparison between two specific cars.

**Request Body**:
```json
{
  "car1": "Skoda Octavia Wagon",
  "car2": "Peugeot 5008"
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "comparison": {
    "comparison": "Introduction to the comparison...",
    "categories": [
      {
        "name": "Performance",
        "car1": "Car1 performance description (rating: 8/10)",
        "car2": "Car2 performance description (rating: 7/10)",
        "winner": "car1"
      }
      // ... other categories
    ],
    "conclusion": "Final comparison conclusion..."
  }
}
```

**Categories Compared**:
- Performance
- Fuel consumption
- Space and practicality
- Reliability
- Maintenance costs

---

### 4. Ask About a Specific Car

**Endpoint**: `POST /api/ask-about-car`

**Description**: Get detailed answer about a specific aspect of a car.

**Request Body**:
```json
{
  "car": "Skoda Octavia Wagon",
  "question": "How much does annual maintenance cost?"
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "car": "Skoda Octavia Wagon",
  "question": "How much does annual maintenance cost?",
  "answer": "Detailed answer from AI..."
}
```

---

### 5. Get Similar Alternatives

**Endpoint**: `POST /api/get-alternatives`

**Description**: Find 3 similar alternative cars to a given model.

**Request Body**:
```json
{
  "car": "Skoda Octavia Wagon",
  "reason": "Looking for something more affordable" // Optional
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "alternatives": [
    {
      "make": "Volkswagen",
      "model": "Golf Variant",
      "reason": "Same philosophy, slightly more compact",
      "advantages": "Lower price, easy to park"
    }
    // ... 2 more alternatives
  ]
}
```

---

### 6. Reset Conversation

**Endpoint**: `POST /api/reset-conversation`

**Description**: Clears the current session's conversation history.

**Request Body**: None

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "Conversation reset"
}
```

---

### 7. Health Check

**Endpoint**: `GET /api/health`

**Description**: Check if the server and Ollama are running correctly.

**Request**: None

**Response** (Success - 200):
```json
{
  "status": "ok",
  "ollama": "connected",
  "model": "ministral",
  "active_conversations": 3
}
```

**Response** (Degraded):
```json
{
  "status": "degraded",
  "ollama": "disconnected",
  "model": "ministral",
  "active_conversations": 0
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400  | Bad Request - Invalid or missing parameters |
| 404  | Not Found - Resource not found (e.g., conversation) |
| 500  | Internal Server Error - Ollama connection issue or processing error |

## Common Error Messages

- `"Unable to connect to Ollama. Make sure it is running (ollama serve)"`
  - Ollama is not running
  - Solution: Run `ollama serve`

- `"Model ministral not found"`
  - Model not installed
  - Solution: Run `ollama pull ministral`

- `"Error analyzing requirements. Please try with a different description."`
  - AI returned invalid JSON
  - Solution: Retry with slightly different input

- `"Conversation not found. Start over."`
  - Session expired or not found
  - Solution: Start a new search

## Rate Limiting

Currently, there are no rate limits. However, for production deployments, consider implementing:
- Per-IP rate limiting
- Per-session request limits
- Request size limits

## Session Management

- Sessions are stored in memory
- Sessions expire after 1 hour of inactivity
- Conversations are limited to 20 messages (10 exchanges)
- Older messages are automatically pruned

## Best Practices

### Client Implementation

```javascript
// Example: Robust API call with error handling
async function findCars(requirements) {
  try {
    const response = await fetch('/api/find-cars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': navigator.language // Important for localization
      },
      body: JSON.stringify({ requirements: requirements })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    // Handle error appropriately
    throw error;
  }
}
```

### Timeout Handling

Ollama responses can take 10-30 seconds. Implement appropriate timeouts:

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

try {
  const response = await fetch('/api/find-cars', {
    method: 'POST',
    signal: controller.signal,
    // ... rest of config
  });
} finally {
  clearTimeout(timeoutId);
}
```

## WebSocket Support

Currently not implemented. All communication is via REST API. Future versions may include WebSocket support for real-time streaming responses.

## Authentication

Currently not required. For production deployments with sensitive data, consider implementing:
- JWT-based authentication
- API keys
- OAuth 2.0

## CORS

CORS is enabled for all origins in development. For production:

```javascript
// Recommended production CORS config
app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true
}));
```

---

For more examples, see the [frontend implementation](../apps/web/src).
