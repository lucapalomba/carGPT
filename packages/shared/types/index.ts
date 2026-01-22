/**
 * Shared types between frontend and backend
 */

export interface Car {
  make: string;
  model: string;
  year: number | string;
  type?: string;
  price?: string;
  strengths?: string[];
  weaknesses?: string[];
  reason?: string;
  pinned?: boolean;
  precise_model?: string;
  percentage?: number;
  vehicle_properties?: Record<string, {
    translatedLabel: string;
    value: string;
  }>;
  images?: Array<{
    url: string;
    thumbnailUrl?: string;
    source?: string;
    sourceUrl?: string;
  }>;
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