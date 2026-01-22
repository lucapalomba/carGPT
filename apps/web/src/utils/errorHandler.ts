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