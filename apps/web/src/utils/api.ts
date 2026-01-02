/**
 * Centralized API utility for CarGPT web application.
 * Handles fetch calls, error response normalization, and notification triggers.
 */
import { toast } from 'react-hot-toast';

/**
 * Normalizes error messages from the backend or the environment.
 * Priority: data.message -> data.error (legacy) -> data.statusText -> generic fallback
 */
async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.message || data.error || response.statusText || 'Unknown server error';
  } catch {
    return response.statusText || 'Server communication error';
  }
}

export const api = {
  async post<T = unknown>(url: string, body: unknown): Promise<T | null> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': navigator.language,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        toast.error(errorMsg);
        return null;
      }

      const data = await response.json();
      
      if (!data.success) {
        toast.error(data.message || data.error || 'Operation failed');
        return null;
      }

      return data;
    } catch (error) {
      console.error(`API Error [POST ${url}]:`, error);
      toast.error('Connection error. Please check if the server is running.');
      return null;
    }
  },

  async get<T = unknown>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept-Language': navigator.language,
        },
      });

      if (!response.ok) {
        const errorMsg = await getErrorMessage(response);
        toast.error(errorMsg);
        return null;
      }

      const data = await response.json();
      
      if (!data.success) {
        toast.error(data.message || data.error || 'Operation failed');
        return null;
      }

      return data;
    } catch (error) {
      console.error(`API Error [GET ${url}]:`, error);
      toast.error('Connection error.');
      return null;
    }
  }
};
