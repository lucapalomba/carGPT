/**
 * Centralized API utility for CarGPT web application.
 * Handles fetch calls, error response normalization, and notification triggers.
 */
import { errorHandler } from './errorHandler';

class ApiClient {
  private static instance: ApiClient;
  
  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private async makeRequest<T>(
    url: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T | null> {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': navigator.language,
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        await errorHandler.handleResponseError(response, `${method} ${url}`);
        return null;
      }

      const data = await response.json();
      const validatedResponse = errorHandler.validateResponse<T>(data);
      
      if (!validatedResponse.success) {
        errorHandler.handleError(
          validatedResponse.error || validatedResponse.message || 'Operation failed',
          `${method} ${url}`
        );
        return null;
      }

      // Return the original data structure if it's a legacy API response
      // or return just the data field for new structured responses
      if (typeof data === 'object' && data !== null && 'success' in data) {
        return data as T;
      }
      
      return validatedResponse.data ?? (data as T);
    } catch (error) {
      errorHandler.handleError(error, `${method} ${url}`);
      return null;
    }
  }

  async post<T = unknown>(url: string, body: unknown): Promise<T | null> {
    return this.makeRequest<T>(url, 'POST', body);
  }

  async get<T = unknown>(url: string): Promise<T | null> {
    return this.makeRequest<T>(url, 'GET');
  }

  async put<T = unknown>(url: string, body: unknown): Promise<T | null> {
    return this.makeRequest<T>(url, 'PUT', body);
  }

  async delete<T = unknown>(url: string): Promise<T | null> {
    return this.makeRequest<T>(url, 'DELETE');
  }
}

export const api = ApiClient.getInstance();
