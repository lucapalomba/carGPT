import { z } from 'zod';

/**
 * Ollama structured output schemas based on https://ollama.com/blog/structured-outputs
 */



// Car suggestions schema (based on cars_suggestions.md)
export const CarSuggestionsSchema = z.object({
  analysis: z.string(),
  choices: z.array(z.object({
    make: z.string(),
    model: z.string(),
    year: z.number(),
    configuration: z.string(),
    precise_model: z.string(),
    pinned: z.boolean(),
    constraints_satisfaction: z.record(z.string(), z.string()),
    percentage: z.string()
  })),
  pinned_cars: z.array(z.object({
    make: z.string(),
    model: z.string(),
    year: z.number(),
    configuration: z.string(),
    precise_model: z.string(),
    pinned: z.boolean(),
    constraints_satisfaction: z.record(z.string(), z.string()),
    percentage: z.string()
  }))
});

// Elaboration schema (based on elaborate_suggestion.md)
export const ElaborationSchema = z.object({
  price: z.string(),
  price_when_new: z.string(),
  type: z.string(),
  market_availability: z.string(),
  vehicle_properties: z.record(z.string(), z.object({
    translatedLabel: z.string(),
    value: z.string(),
  }).strict()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  reason: z.string(),
  pinned: z.boolean(),
  // Fields that must remain unchanged
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  percentage: z.string().optional(),
  precise_model: z.string().optional(),
  configuration: z.string().optional()
});

// Search intent schema (based on search_intent.md)
export const SearchIntentSchema = z.object({
  user_country: z.string(),
  user_country_reasoning: z.string().optional(),
  primary_focus: z.string(),
  constraints: z.object({
    budget: z.string().optional(),
    must_have: z.array(z.string()).optional(),
    preferred: z.array(z.string()).optional()
  }),
  interesting_properties: z.array(z.record(z.string(), z.any())).optional()
});

// Verify car schema (based on verify-car.md)
export const VerifyCarSchema = z.object({
  modelConfidence: z.number().min(0).max(1),
  textConfidence: z.number().min(0).max(1)
});

// Analysis translation schema (based on translate-analysis.md)
export const AnalysisTranslationSchema = z.object({
  analysis: z.string()
});

// Judge verdict schema (matches judge.md)
export const JudgeVerdictSchema = z.object({
  verdict: z.string(),
  vote: z.number().min(0).max(100)
});


// Union of all possible structured outputs
export const OllamaStructuredOutputSchema = z.union([
  CarSuggestionsSchema,
  ElaborationSchema,
  JudgeVerdictSchema,
  SearchIntentSchema,
  VerifyCarSchema,
  AnalysisTranslationSchema,
  // CarTranslationSchema is removed
]);

// Type exports
export type CarSuggestions = z.infer<typeof CarSuggestionsSchema>;
export type Elaboration = z.infer<typeof ElaborationSchema>;
export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;
export type SearchIntent = z.infer<typeof SearchIntentSchema>;
export type VerifyCar = z.infer<typeof VerifyCarSchema>;
export type AnalysisTranslation = z.infer<typeof AnalysisTranslationSchema>;
// export type CarTranslation = z.infer<typeof CarTranslationSchema>; // Removed
export type OllamaStructuredOutput = z.infer<typeof OllamaStructuredOutputSchema>;

// Car schema based on apps/server/src/services/ai/types.ts Car interface
export const CarSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.union([z.number(), z.string()]),
  type: z.string(),
  price: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  reason: z.string(),
  pinned: z.boolean(),
  precise_model: z.string(),
  vehicle_properties: z.record(z.string(), z.object({
    translatedLabel: z.string(),
    value: z.string(),
  }).strict()).optional(), 
  images: z.array(z.object({
    url: z.string(),
    thumbnailUrl: z.string().optional(),
    source: z.string().optional(),
    sourceUrl: z.string().optional(),
  })).optional(),
}).passthrough(); // Allow unknown keys, as the interface has `[key: string]: unknown;`

// SearchResponse schema based on apps/server/src/services/ai/types.ts SearchResponse interface
export const SearchResponseSchema = z.object({
  cars: z.array(CarSchema),
  analysis: z.string().optional(),
  ui_suggestions: z.any().optional(), 
  userLanguage: z.string().optional(),
  user_market: z.string().optional(),
}).passthrough(); // Allow unknown keys, as the interface has `[key: string]: unknown;`

// Schema for the input to ITranslationService.translateResults
// This corresponds to { analysis: suggestions.analysis, cars: elaboratedCars } from AIService.findCarsWithImages
export const TranslationServiceInputSchema = z.object({
  analysis: z.string(),
  cars: z.array(CarSchema),
});

// Configuration schema
export const ConfigSchema = z.object({
  port: z.number(),
  aiProvider: z.string(),
  mode: z.string(),
  isProduction: z.boolean(),
  aiRetryCount: z.number().min(0).max(10),
  sequentialPromiseExecution: z.boolean(),
  carouselImageLength: z.number().min(1).max(10),
  maxInterestingPropertiesCount: z.number().min(1).max(5),
});

// New Type exports for the new schemas
export type Car = z.infer<typeof CarSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type TranslationServiceInput = z.infer<typeof TranslationServiceInputSchema>;
export type Config = z.infer<typeof ConfigSchema>;