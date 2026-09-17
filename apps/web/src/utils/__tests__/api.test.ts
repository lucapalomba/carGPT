import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api.js';
import { toast } from 'react-hot-toast';

// Mock fetch and toast
const fetchMock = vi.fn();
Object.defineProperty(globalThis, 'fetch', {
  value: fetchMock,
  writable: true,
});

vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('api utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // navigator.language is needed by api.ts
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'en-US' },
      configurable: true,
    });
  });

  describe('post', () => {
    it('should return data on successful post', async () => {
      const mockData = { success: true, data: 'test' };
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await api.post('/test', { key: 'value' });

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith('/test', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
      }));
    });

    it('should handle non-ok response and toast error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        json: async () => ({ message: 'Custom error message' }),
      });

      const result = await api.post('/test', {});

      expect(result).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Custom error message');
    });

    it('should handle success: false in response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, message: 'Failed operation' }),
      });

      const result = await api.post('/test', {});

      expect(result).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Failed operation');
    });

it('should handle network errors', async () => {
      fetchMock.mockRejectedValue(new Error('Network failure'));
      console.error = vi.fn(); // Suppress log in test

      const result = await api.post('/test', {});

      expect(result).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Network failure');
    });
  });

  describe('get', () => {
    it('should return data on successful get', async () => {
      const mockData = { success: true, data: 'test' };
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await api.get('/test');

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith('/test', expect.objectContaining({
        method: 'GET',
      }));
    });
  });

  describe('put', () => {
    it('should send a PUT with the serialized body', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: 'updated' }),
      });

      const result = await api.put('/test', { key: 'value' });

      expect(result).toEqual({ success: true, data: 'updated' });
      expect(fetchMock).toHaveBeenCalledWith('/test', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ key: 'value' }),
      }));
    });

    it('should report failures like post does', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid payload' }),
      });

      const result = await api.put('/test', {});

      expect(result).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Invalid payload');
    });
  });

  describe('delete', () => {
    it('should send a DELETE with no body', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: 'gone' }),
      });

      const result = await api.delete('/test');

      expect(result).toEqual({ success: true, data: 'gone' });
      expect(fetchMock).toHaveBeenCalledWith('/test', expect.objectContaining({
        method: 'DELETE',
      }));
      expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
    });
  });

  describe('legacy responses', () => {
    it('should pass through a payload that has no success field', async () => {
      const legacy = { cars: [{ make: 'Tesla', model: '3' }] };
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => legacy,
      });

      const result = await api.post('/test', {});

      expect(result).toEqual(legacy);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should pass through a non-object payload', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => 'plain body',
      });

      const result = await api.post('/test', {});

      expect(result).toBe('plain body');
    });
  });
});
