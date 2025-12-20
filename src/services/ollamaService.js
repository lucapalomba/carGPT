import { config } from '../config/index.js';

/**
 * Service to handle communication with Ollama
 */
export const ollamaService = {
  /**
   * Sends a list of messages to Ollama and returns the content of the response.
   * 
   * @param {Array<Object>} messages - Array of message objects {role, content}
   * @returns {Promise<string>} The response content from Ollama
   * @throws {Error} If the connection fails or Ollama returns an error
   */
  async callOllama(messages) {
    try {
      const response = await fetch(`${config.ollama.url}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.ollama.model,
          messages: messages,
          stream: false,
          options: {
            temperature: 0,
            num_predict: 2500
          },
          format: "json"
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data.message.content;

    } catch (error) {
      console.error('Error calling Ollama:', error);
      throw new Error('Unable to connect to Ollama. Make sure it is running (ollama serve)');
    }
  },

  /**
   * Attempts to parse a JSON response from the LLM, cleaning it of common issues.
   * 
   * @param {string} text - The raw text response from the LLM
   * @returns {Object} The parsed JSON object
   * @throws {Error} If parsing fails after cleaning attempts
   */
  parseJsonResponse(text) {
    // Remove markdown code blocks
    let cleaned = text.trim();
    cleaned = cleaned.replace(/```json\s*/g, '');
    cleaned = cleaned.replace(/```\s*/g, '');
    cleaned = cleaned.replace(/'\s*/g, '');
    cleaned = cleaned.trim();

    // Try to find JSON object in the text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    // Fix common JSON issues from LLMs
    // 1. Replace single quotes with double quotes (but not inside strings)
    cleaned = cleaned.replace(/'/g, '"');

    // 2. Remove trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    // 3. Try to parse
    try {
      return JSON.parse(cleaned);
    } catch (firstError) {
      // If still failing, try more aggressive cleaning
      console.error('First parse attempt failed:', firstError.message);
      console.error('Attempting more aggressive cleaning...');

      // Try to extract just the JSON part more carefully
      const objectMatch = cleaned.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch (secondError) {
          console.error('Second parse attempt failed:', secondError.message);
          throw new Error(`Failed to parse JSON: ${firstError.message}`);
        }
      }
      throw firstError;
    }
  },

  /**
   * Verifies if the configured Ollama model is available.
   * 
   * @returns {Promise<boolean>} True if the model is available, false otherwise
   */
  async verifyOllama() {
    try {
      const response = await fetch(`${config.ollama.url}/api/tags`);
      const data = await response.json();

      const modelExists = data.models.some(m => m.name.includes(config.ollama.model));

      if (!modelExists) {
        console.warn(`⚠️  Model ${config.ollama.model} not found!`);
        console.warn(`   Run: ollama pull ${config.ollama.model}`);
        return false;
      }

      console.log(`✅ Ollama connected - Model: ${config.ollama.model}`);
      return true;
    } catch (error) {
      console.error('❌ Ollama not reachable!');
      console.error('   Make sure Ollama is running: ollama serve');
      return false;
    }
  }
};
