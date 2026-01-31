import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentDate, getCurrentDateTime, getDateSystemMessage } from '../dateUtils.js';

describe('dateUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getCurrentDate', () => {
    it('should return current date in YYYY-MM-DD format', () => {
      // Set a specific date
      const testDate = new Date('2023-12-25T10:30:00Z');
      vi.setSystemTime(testDate);

      const result = getCurrentDate();

      expect(result).toBe('2023-12-25');
    });

    it('should handle different dates correctly', () => {
      // Test with different dates
      const testDates = [
        '2023-01-01T00:00:00Z',
        '2023-06-15T12:30:45Z',
        '2023-12-31T23:59:59Z'
      ];

      const expectedDates = ['2023-01-01', '2023-06-15', '2023-12-31'];

      testDates.forEach((dateStr, index) => {
        vi.setSystemTime(new Date(dateStr));
        expect(getCurrentDate()).toBe(expectedDates[index]);
      });
    });

    it('should return string type', () => {
      vi.setSystemTime(new Date('2023-05-10T14:20:30Z'));
      const result = getCurrentDate();
      expect(typeof result).toBe('string');
    });
  });

  describe('getCurrentDateTime', () => {
    it('should return current date and time in ISO format', () => {
      const testDate = new Date('2023-12-25T10:30:45.123Z');
      vi.setSystemTime(testDate);

      const result = getCurrentDateTime();

      expect(result).toBe('2023-12-25T10:30:45.123Z');
    });

    it('should include time component', () => {
      const testDate = new Date('2023-07-04T15:45:30.500Z');
      vi.setSystemTime(testDate);

      const result = getCurrentDateTime();

      expect(result).toContain('T');
      expect(result).toContain(':');
      expect(result).toContain('Z');
    });

    it('should return string type', () => {
      vi.setSystemTime(new Date('2023-09-15T08:00:00Z'));
      const result = getCurrentDateTime();
      expect(typeof result).toBe('string');
    });

    it('should handle different date times correctly', () => {
      const testDates = [
        '2023-01-01T00:00:00.000Z',
        '2023-06-15T12:30:45.999Z',
        '2023-12-31T23:59:59.500Z'
      ];

      testDates.forEach(dateStr => {
        vi.setSystemTime(new Date(dateStr));
        expect(getCurrentDateTime()).toBe(dateStr);
      });
    });
  });

  describe('getDateSystemMessage', () => {
    it('should return formatted system message with current date', () => {
      const testDate = new Date('2023-08-20T14:25:00Z');
      vi.setSystemTime(testDate);

      const result = getDateSystemMessage();

      expect(result).toBe('Current date: 2023-08-20');
    });

    it('should include "Current date:" prefix', () => {
      vi.setSystemTime(new Date('2023-03-10T09:15:30Z'));

      const result = getDateSystemMessage();

      expect(result).toEqual(expect.stringContaining('Current date:'));
    });

    it('should return string type', () => {
      vi.setSystemTime(new Date('2023-11-30T16:45:00Z'));
      const result = getDateSystemMessage();
      expect(typeof result).toBe('string');
    });

    it('should use getCurrentDate internally', () => {
      const testDate = new Date('2023-02-14T12:00:00Z');
      vi.setSystemTime(testDate);

      const result = getDateSystemMessage();
      const currentDate = getCurrentDate();

      expect(result).toBe(`Current date: ${currentDate}`);
    });
  });
});