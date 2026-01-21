/**
 * Shared types for AI services
 */
export interface Car {
  make: string;
  model: string;
  year: number | string;
  pinned?: boolean;
  [key: string]: unknown;
}

export interface SearchResponse {
  cars: Car[];
  analysis?: string;
  auto?: Car[]; // For some LLM responses that might stick to 'auto' key
  userLanguage?: string;
  user_market?: string;
  ui_suggestions?: UISuggestion[];
  [key: string]: unknown;
}

export interface UISuggestion {
  component: string;
  label: string;
  unit: string | null;
  priority: number;
  details?: Record<string, unknown>;
}
