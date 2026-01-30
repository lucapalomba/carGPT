import * as z from 'zod';


/**
 * Ollama structured output schemas based on https://ollama.com/blog/structured-outputs
 */

/**
 * Utility functions for validating structured outputs with Zod schemas
 */

/**
 * Validates and parses structured output from LLM responses
 */
export class StructuredOutputValidator {
  /**
   * Converts a Zod schema to a JSON schema for Ollama
   */
  static convertSchema(schema: any): object {
    try {
      // Use Zod's built-in JSON schema conversion for all schemas
      const jsonSchema = z.toJSONSchema(schema) as any;
      
      // Ensure that schema has proper structure for Ollama
      if (jsonSchema && typeof jsonSchema === 'object' && !jsonSchema.type) {
        jsonSchema.type = 'object';
      }
      
      // Remove circular references and problematic properties
      return this.cleanSchema(jsonSchema);
    } catch (error) {
      console.error('Schema conversion error:', error);
      throw new Error(`Failed to convert schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Clean schema to remove problematic properties that Ollama doesn't support
   */
  private static cleanSchema(schema: any): any {
    if (typeof schema !== 'object' || schema === null) {
      return schema;
    }
    
    const cleaned: any = {};
    
    for (const [key, value] of Object.entries(schema)) {
      // Skip problematic properties
      if (key === '$schema' || key === 'additionalProperties' && value === false) {
        continue;
      }
      
      if (typeof value === 'object' && value !== null) {
        cleaned[key] = this.cleanSchema(value);
      } else {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  }

  

  

  

  

  
}

/**
 * Common schema descriptions for prompts
 */
export const SCHEMA_DESCRIPTIONS = {
  CAR_RECOMMENDATION: `
Car recommendation response with the following structure:
{
  "response": "Natural language explanation",
  "cars": [
    {
      "id": "unique_identifier",
      "make": "car_manufacturer", 
      "model": "model_name",
      "year": 2024,
      "price": 25000,
      "fuel_type": "gasoline|hybrid|electric",
      "transmission": "manual|automatic|cvt",
      "seats": 5,
      "image_url": "https://example.com/car.jpg",
      "confidence_score": 0.95,
      "match_reasons": ["matches_budget", "matches_fuel_type"],
      "specifications": {
        "engine": "2.0L",
        "horsepower": 150
      }
    }
  ],
  "search_criteria": {
    "budget_range": { "min": 20000, "max": 30000 },
    "fuel_preference": "hybrid",
    "transmission_preference": "automatic",
    "seats_required": 5,
    "primary_use_case": "family_commuting"
  },
  "confidence_score": 0.92,
  "total_results": 3,
  "search_metadata": {
    "total_searched": 150,
    "filtered_count": 12,
    "search_time_ms": 2500,
    "model_used": "mistral-large-3"
  }
}`,

  INTENT_ANALYSIS: `
Intent analysis response with the following structure:
{
  "response": "Natural language explanation of detected intent",
  "intent_type": "search_cars|get_recommendations|compare_cars|get_car_info|general_inquiry",
  "confidence": 0.89,
  "extracted_entities": [
    {
      "type": "make|model|year|price_range|fuel_type|transmission|seats|features",
      "value": "extracted_value",
      "confidence": 0.95
    }
  ],
  "suggested_parameters": {
    "search_filters": { "fuel_type": "hybrid" },
    "model_options": { "include_images": true },
    "output_format": "detailed|summary|comparison"
  },
  "reasoning": "Explanation of how intent was determined"
}`,

  VISION_VERIFICATION: `
Vision verification response with the following structure:
{
  "response": "Natural language explanation of vision analysis",
  "analysis": {
    "is_car_present": true,
    "confidence_score": 0.87,
    "detected_make": "Toyota",
    "detected_model": "Camry", 
    "detected_year": 2023,
    "color": "blue",
    "additional_objects": ["road", "trees"]
  },
  "image_metadata": {
    "analyzed_at": "2024-01-20T10:30:00Z",
    "image_quality": "high|medium|low",
    "processing_time_ms": 1500,
    "model_version": "vision-v2.1"
  },
  "verification_result": {
    "matches_expected": true,
    "confidence_explanation": "Car matches expected make and model",
    "accuracy_score": 0.92
  }
}`,

  CAR_SUGGESTIONS: `
Car suggestions response with the following structure:
{
  "analysis": "Brief analysis of the user's needs OR explanation of the adaptation (2-3 sentences)",
  "choices": [
    {
      "make": "Toyota",
      "model": "Corolla",
      "year": 2019,
      "configuration": "1.8 HB Active",
      "precise_model": "Toyota Corolla 1.8 HB Active 2019",
      "pinned": false,
      "constraints_satisfaction": {
        "budget": "100, it can be found in budget",
        "red_color": "70, does not exist in red but some orange tonalities"
      },
      "percentage": "100"
    }
  ],
  "pinned_cars": [
    {
      "make": "Honda",
      "model": "CR-V",
      "year": 2022,
      "configuration": "e:HEV Executive",
      "precise_model": "Honda CR-V e:HEV Executive 2022",
      "pinned": true,
      "constraints_satisfaction": {
        "budget": "10, it's out of budget by 20%",
        "red_color": "90, it exists in red"
      },
      "percentage": "95"
    }
  ]
}`,

  ELABORATION: `
Car elaboration response with the following structure:
{
  "price": "25000 EUR | USD | No information",
  "price_when_new": "35000 EUR | USD | No information",
  "type": "SUV",
  "market_availability": "Yes in France",
  "vehicle_properties": [
    {
      "translatedLabel": "Engine displacement",
      "value": "1.6 liters (1598 cc)"
    },
    {
      "translatedLabel": "Euro NCAP Safety Rating", 
      "value": "4 stars (Excellent for passenger safety)"
    }
  ],
  "strengths": ["Excellent family safety features", "Spacious rear cargo area", "Good fuel efficiency"],
  "weaknesses": ["Engine may lack power", "Interior materials basic compared to premium"],
  "reason": "Brief explanation why it's suitable (1-2 sentences)",
  "pinned": false,
  "make": "Hyundai",
  "model": "Tucson",
  "year": 2019,
  "configuration": "1.6 GDI",
  "precise_model": "Hyundai Tucson 1.6 GDI 2019",
  "percentage": "99"
}`,

  SEARCH_INTENT: `
Search intent analysis response with the following structure:
{
  "user_country": "USA",
  "user_country_reasoning": "Language code 'en-US' maps to USA (United States)",
  "primary_focus": "family reliability, space, safety",
  "constraints": {
    "budget": "25000 - 35000 USD",
    "must_have": ["family safety technology features", "trunk_volume_minimum_3_suitcases"],
    "preferred": ["high_ncap_rating"]
  },
  "interesting_properties": [
    {
      "property_name": "trunk_volume",
      "unit": "liters"
    },
    {
      "property_name": "ncap_rating", 
      "unit": "stars"
    }
  ]
}`,

  VERIFY_CAR: `
Car verification response with the following structure:
{
  "modelConfidence": 0.9,
  "textConfidence": 0.1
}`,

  ANALYSIS_TRANSLATION: `
Analysis translation response with the following structure:
{
  "analysis": "Translated analysis text"
}`,

  JUDGE_VERDICT: `
Judge verdict response with the following structure:
{
  "verdict": "string",
  "vote": number
}`
};

/**
 * Default validation options
 */
export const DEFAULT_VALIDATION_OPTIONS = {
  enableStrictMode: false,
  logValidationErrors: true,
  maxRetries: 3,
  fallbackToText: true
};