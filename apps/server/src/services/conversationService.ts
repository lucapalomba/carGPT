/**
 * Service to manage in-memory conversations
 */

export interface ConversationHistoryItem {
  type: string;
  timestamp: Date;
  data: any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
}

export interface Conversation {
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  userLanguage?: string;
  requirements?: string;
  history: ConversationHistoryItem[];
}

const conversations = new Map<string, Conversation>();

/**
 * Cleanup old conversations every hour
 */
setInterval(() => {
  const now = new Date();
  for (const [key, conv] of conversations.entries()) {
    const diff = now.getTime() - conv.createdAt.getTime();
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
   * @returns {Conversation|undefined} The conversation object or undefined if not found
   */
  get(sessionId: string): Conversation | undefined {
    return conversations.get(sessionId);
  },

  /**
   * Retrieves or initializes a conversation for a session.
   * 
   * @param {string} sessionId - The session identifier
   * @returns {Conversation} The conversation object
   */
  getOrInitialize(sessionId: string): Conversation {
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
  delete(sessionId: string) {
    conversations.delete(sessionId);
  },

  /**
   * Returns all stored conversations.
   * 
   * @returns {Array<[string, Conversation]>} Array of [sessionId, conversation] entries
   */
  getAll(): [string, Conversation][] {
    return Array.from(conversations.entries());
  },

  /**
   * Returns the count of active conversations.
   * 
   * @returns {number} The number of active conversations
   */
  count(): number {
    return conversations.size;
  }
};
