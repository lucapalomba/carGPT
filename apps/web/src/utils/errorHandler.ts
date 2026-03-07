import { toast } from 'react-hot-toast';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Normalizes error messages from backend or environment
   */
  private extractErrorMessage(error: unknown, response?: Response): string {
    if (error instanceof Error) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (response) {
      return response.statusText || 'Server communication error';
    }
    
    return 'Unknown error occurred';
  }

  /**
   * Extracts error from API response data
   */
  private extractResponseError(data: unknown): string {
    if (typeof data === 'object' && data !== null) {
      const apiData = data as Record<string, unknown>;
      return (apiData.message as string) || (apiData.error as string) || 'Operation failed';
    }
    
    return 'Operation failed';
  }

  /**
   * Handles API errors and displays appropriate notifications
   */
  handleError(error: unknown, context: string, response?: Response): void {
    const errorMessage = this.extractErrorMessage(error, response);
    const isConnectionError = errorMessage.includes('Connection') || 
                             errorMessage.includes('fetch') ||
                             errorMessage.includes('network');
    
    console.error(`[${context}] ${errorMessage}`, { error, response: response?.status });

    if (isConnectionError) {
      toast.error('Connection error. Please check if the server is running.');
    } else {
      toast.error(errorMessage);
    }
  }

  /**
   * Handles HTTP response errors
   */
  async handleResponseError(response: Response, context: string): Promise<void> {
    if (response.status === 429) {
      await this.handleRateLimitError(response, context);
      return;
    }

    if (response.status === 503) {
      await this.handleServiceUnavailableError(response, context);
      return;
    }

    try {
      const data = await response.json();
      const errorMessage = this.extractResponseError(data);
      this.handleError(errorMessage, context, response);
    } catch {
      const errorMessage = response.statusText || 'Server communication error';
      this.handleError(errorMessage, context, response);
    }
  }

  /**
   * Handles rate limit errors (HTTP 429)
   */
  private async handleRateLimitError(response: Response, context: string): Promise<void> {
    let errorMessage = 'Too many requests. Please wait before trying again.';
    let retryAfter: string | null = null;
    let tip: string | null = null;

    try {
      const data = await response.json();
      if (data.error) {
        errorMessage = data.error;
      }
      if (data.retryAfter) {
        retryAfter = data.retryAfter;
      }
      if (data.tip) {
        tip = data.tip;
      }
    } catch {
      retryAfter = response.headers.get('Retry-After');
    }

    console.warn(`[${context}] Rate limit exceeded`, { 
      status: response.status, 
      retryAfter,
      tip 
    });

    const displayMessage = retryAfter 
      ? `${errorMessage} Try again after ${retryAfter}.`
      : errorMessage;
    
    toast.error(displayMessage, {
      duration: 5000,
      id: 'rate-limit' // Prevent duplicate toasts
    });

    if (tip) {
      setTimeout(() => {
        toast(tip!, { icon: '💡', duration: 4000 });
      }, 1000);
    }
  }

  /**
   * Handles service unavailable errors (HTTP 503)
   */
  private async handleServiceUnavailableError(response: Response, context: string): Promise<void> {
    let errorMessage = 'Server is busy. Please try again later.';
    let retryAfter: string | null = null;

    try {
      const data = await response.json();
      if (data.error) {
        errorMessage = data.error;
      }
      if (data.retryAfter) {
        retryAfter = data.retryAfter;
      }
    } catch {
      retryAfter = response.headers.get('Retry-After');
    }

    console.warn(`[${context}] Service unavailable`, { 
      status: response.status, 
      retryAfter 
    });

    const displayMessage = retryAfter 
      ? `${errorMessage} Try again after ${retryAfter}.`
      : errorMessage;
    
    toast.error(displayMessage, {
      duration: 5000,
      id: 'service-unavailable'
    });
  }

  /**
   * Validates API response structure
   */
  validateResponse<T>(data: unknown): ApiResponse<T> {
    if (typeof data === 'object' && data !== null) {
      const apiData = data as ApiResponse<T>;
      return {
        success: apiData.success ?? true,
        data: apiData.data,
        message: apiData.message,
        error: apiData.error
      };
    }
    
    return {
      success: true,
      data: data as T
    };
  }
}

export const errorHandler = ErrorHandler.getInstance();