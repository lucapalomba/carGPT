/**
 * Date utility functions
 */

/**
 * Returns the current date in standard ISO format (YYYY-MM-DD)
 * @returns {string} Current date in ISO format
 */
export const getCurrentDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Returns the current date and time in standard ISO format
 * @returns {string} Current date and time in ISO format
 */
export const getCurrentDateTime = (): string => {
  return new Date().toISOString();
};

/**
 * Returns a formatted date string for system messages
 * @returns {string} Formatted date message
 */
export const getDateSystemMessage = (): string => {
  return `Current date: ${getCurrentDate()}`;
};