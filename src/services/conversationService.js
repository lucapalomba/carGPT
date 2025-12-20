/**
 * Service to manage in-memory conversations
 */
const conversations = new Map();

/**
 * Cleanup old conversations every hour
 */
setInterval(() => {
  const now = new Date();
  for (const [key, conv] of conversations.entries()) {
    const diff = now - conv.createdAt;
    if (diff > 3600000) { // 1 hour
      conversations.delete(key);
    }
  }
}, 3600000);

export const conversationService = {
  /**
   * Retrieves a conversation by session ID.
   * 
   * @param {string} sessionId - The session identifier
   * @returns {Object|undefined} The conversation object or undefined if not found
   */
  get(sessionId) {
    return conversations.get(sessionId);
  },

  /**
   * Retrieves or initializes a conversation for a session.
   * 
   * @param {string} sessionId - The session identifier
   * @returns {Object} The conversation object
   */
  getOrInitialize(sessionId) {
    let conversation = conversations.get(sessionId);
    if (!conversation) {
      conversation = {
        sessionId,
        createdAt: new Date(),
        updatedAt: new Date(),
        history: []
      };
      conversations.set(sessionId, conversation);
    }
    return conversation;
  },

  /**
   * Deletes a conversation by session ID.
   * 
   * @param {string} sessionId - The session identifier
   */
  delete(sessionId) {
    conversations.delete(sessionId);
  },

  /**
   * Returns all stored conversations.
   * 
   * @returns {Array<[string, Object]>} Array of [sessionId, conversation] entries
   */
  getAll() {
    return Array.from(conversations.entries());
  },

  /**
   * Returns the count of active conversations.
   * 
   * @returns {number} The number of active conversations
   */
  count() {
    return conversations.size;
  }
};
