import type { Car } from '../hooks/useCarSearch';

/**
 * Interface for a single conversation message
 */
export interface ConversationMessage {
  id: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    carCount?: number;
    searchIntent?: string;
      feedback?: string;
    pinnedCars?: Car[];
    processingTime?: number;
  };
}

/**
 * Interface for conversation context and history
 */
export interface Conversation {
  id: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  userLanguage?: string;
  messages: ConversationMessage[];
  currentCars?: Car[];
  analysisHistory: string[];
  pinnedIndices: Set<number>;
  metadata?: {
    userAgent?: string;
    referrer?: string;
    searchCount?: number;
    lastSearchIntent?: string;
  };
}

/**
 * Interface for conversation search filters
 */
export interface ConversationFilters {
  sessionId?: string;
  userLanguage?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasCars?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Interface for conversation statistics
 */
export interface ConversationStats {
  totalConversations: number;
  totalMessages: number;
  averageMessagesPerConversation: number;
  topLanguages: Array<{ language: string; count: number }>;
  topIntents: Array<{ intent: string; count: number }>;
  averageSessionDuration: number;
}

/**
 * Repository pattern implementation for conversation data management
 * Handles all conversation-related data operations with localStorage as backend
 */
export class ConversationRepository {
  private static instance: ConversationRepository;
  private readonly STORAGE_KEY = 'cargpt_conversations';
  private readonly MAX_CONVERSATIONS = 50; // Limit stored conversations
  private readonly MAX_MESSAGES_PER_CONVERSATION = 100; // Limit messages per conversation

  private constructor() {}

  /**
   * Singleton pattern to ensure one repository instance
   */
  public static getInstance(): ConversationRepository {
    if (!ConversationRepository.instance) {
      ConversationRepository.instance = new ConversationRepository();
    }
    return ConversationRepository.instance;
  }

  /**
   * Save a conversation to localStorage
   * @param conversation - Conversation object to save
   * @returns Promise<void>
   */
  async save(conversation: Conversation): Promise<void> {
    try {
      const conversations = await this.findAll();
      
      // Update existing conversation or add new one
      const existingIndex = conversations.findIndex(c => c.id === conversation.id);
      const updatedConversation = {
        ...conversation,
        updatedAt: new Date()
      };

      if (existingIndex >= 0) {
        conversations[existingIndex] = updatedConversation;
      } else {
        conversations.push(updatedConversation);
      }

      // Keep only the most recent conversations
      const sortedConversations = conversations
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, this.MAX_CONVERSATIONS);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sortedConversations));
    } catch (error) {
      console.error('ConversationRepository: Error saving conversation', error);
      throw new Error('Failed to save conversation', { cause: error });
    }
  }

  /**
   * Find a conversation by its ID
   * @param id - Conversation ID to search for
   * @returns Promise<Conversation | null>
   */
  async findById(id: string): Promise<Conversation | null> {
    try {
      const conversations = await this.findAll();
      const conversation = conversations.find(c => c.id === id);
      
      if (!conversation) return null;

      // Convert string dates back to Date objects
      return {
        ...conversation,
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
        messages: conversation.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      };
    } catch (error) {
      console.error('ConversationRepository: Error finding conversation by ID', error);
      throw new Error('Failed to find conversation', { cause: error });
    }
  }

  /**
   * Find conversations by session ID
   * @param sessionId - Session ID to search for
   * @returns Promise<Conversation[]>
   */
  async findBySessionId(sessionId: string): Promise<Conversation[]> {
    try {
      const conversations = await this.findAll();
      return conversations
        .filter(c => c.sessionId === sessionId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map(c => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
    } catch (error) {
      console.error('ConversationRepository: Error finding conversations by session ID', error);
      throw new Error('Failed to find conversations by session', { cause: error });
    }
  }

  /**
   * Find all conversations with optional filtering
   * @param filters - Optional filters to apply
   * @returns Promise<Conversation[]>
   */
  async findAll(filters?: ConversationFilters): Promise<Conversation[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      let conversations: Conversation[] = stored ? JSON.parse(stored) : [];

      // Convert string dates back to Date objects
      conversations = conversations.map(c => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        messages: c.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));

      // Apply filters
      if (filters) {
        if (filters.sessionId) {
          conversations = conversations.filter(c => c.sessionId === filters.sessionId);
        }
        if (filters.userLanguage) {
          conversations = conversations.filter(c => c.userLanguage === filters.userLanguage);
        }
        if (filters.dateFrom) {
          conversations = conversations.filter(c => new Date(c.createdAt) >= filters.dateFrom!);
        }
        if (filters.dateTo) {
          conversations = conversations.filter(c => new Date(c.createdAt) <= filters.dateTo!);
        }
        if (filters.hasCars !== undefined) {
          conversations = conversations.filter(c => 
            (filters.hasCars && c.currentCars && c.currentCars.length > 0) ||
            (!filters.hasCars && (!c.currentCars || c.currentCars.length === 0))
          );
        }
        if (filters.limit) {
          conversations = conversations.slice(filters.offset || 0, (filters.offset || 0) + filters.limit);
        }
      }

      return conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('ConversationRepository: Error finding all conversations', error);
      throw new Error('Failed to retrieve conversations', { cause: error });
    }
  }

  /**
   * Add a message to an existing conversation
   * @param conversationId - ID of the conversation
   * @param message - Message to add
   * @returns Promise<void>
   */
  async addMessage(conversationId: string, message: Omit<ConversationMessage, 'id'>): Promise<void> {
    try {
      const conversation = await this.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const newMessage: ConversationMessage = {
        ...message,
        id: `${conversationId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      // Limit messages per conversation
      const updatedMessages = [...conversation.messages, newMessage]
        .slice(-this.MAX_MESSAGES_PER_CONVERSATION);

      const updatedConversation = {
        ...conversation,
        messages: updatedMessages,
        updatedAt: new Date()
      };

      await this.save(updatedConversation);
    } catch (error) {
      console.error('ConversationRepository: Error adding message', error);
      throw new Error('Failed to add message to conversation', { cause: error });
    }
  }

  /**
   * Update conversation metadata
   * @param conversationId - ID of the conversation
   * @param currentCars - Current cars state
   * @param analysisHistory - Analysis history
   * @param pinnedIndices - Pinned indices set
   * @returns Promise<void>
   */
  async updateConversationData(
    conversationId: string, 
    currentCars?: Car[], 
    analysisHistory?: string[], 
    pinnedIndices?: Set<number>
  ): Promise<void> {
    try {
      const conversation = await this.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const updatedConversation = {
        ...conversation,
        ...(currentCars && { currentCars }),
        ...(analysisHistory && { analysisHistory }),
        ...(pinnedIndices && { pinnedIndices }),
        updatedAt: new Date()
      };

      await this.save(updatedConversation);
    } catch (error) {
      console.error('ConversationRepository: Error updating conversation data', error);
      throw new Error('Failed to update conversation data', { cause: error });
    }
  }

  /**
   * Delete a conversation by ID
   * @param id - ID of the conversation to delete
   * @returns Promise<boolean>
   */
  async delete(id: string): Promise<boolean> {
    try {
      const conversations = await this.findAll();
      const filteredConversations = conversations.filter(c => c.id !== id);
      
      if (filteredConversations.length === conversations.length) {
        return false; // No conversation was deleted
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredConversations));
      return true;
    } catch (error) {
      console.error('ConversationRepository: Error deleting conversation', error);
      throw new Error('Failed to delete conversation', { cause: error });
    }
  }

  /**
   * Clear all conversations
   * @returns Promise<void>
   */
  async clearAll(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('ConversationRepository: Error clearing all conversations', error);
      throw new Error('Failed to clear all conversations', { cause: error });
    }
  }

  /**
   * Get conversation statistics
   * @returns Promise<ConversationStats>
   */
  async getStats(): Promise<ConversationStats> {
    try {
      const conversations = await this.findAll();
      const allMessages = conversations.flatMap(c => c.messages);
      
      const languageCount = conversations.reduce((acc, c) => {
        const lang = c.userLanguage || 'unknown';
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topLanguages = Object.entries(languageCount)
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const intentCount = conversations.reduce((acc, c) => {
        const intent = c.metadata?.lastSearchIntent || 'unknown';
        acc[intent] = (acc[intent] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topIntents = Object.entries(intentCount)
        .map(([intent, count]) => ({ intent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const sessionDurations = conversations.map(c => 
        new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()
      );
      const averageSessionDuration = sessionDurations.length > 0 
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
        : 0;

      return {
        totalConversations: conversations.length,
        totalMessages: allMessages.length,
        averageMessagesPerConversation: conversations.length > 0 ? allMessages.length / conversations.length : 0,
        topLanguages,
        topIntents,
        averageSessionDuration
      };
    } catch (error) {
      console.error('ConversationRepository: Error getting stats', error);
      throw new Error('Failed to get conversation statistics', { cause: error });
    }
  }

  /**
   * Create a new conversation
   * @param sessionId - Session identifier
   * @param userLanguage - User's preferred language
   * @returns Promise<Conversation>
   */
  async create(sessionId: string, userLanguage?: string): Promise<Conversation> {
    const now = new Date();
    const conversation: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      createdAt: now,
      updatedAt: now,
      userLanguage,
      messages: [],
      analysisHistory: [],
      pinnedIndices: new Set(),
      metadata: {
        searchCount: 0,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined
      }
    };

    await this.save(conversation);
    return conversation;
  }
}

// Export singleton instance for easy usage
export const conversationRepository = ConversationRepository.getInstance();