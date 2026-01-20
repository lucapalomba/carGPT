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
  [key: string]: unknown;
}
