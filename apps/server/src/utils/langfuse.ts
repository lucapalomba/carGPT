import { Langfuse } from "langfuse";
import dotenv from 'dotenv';
import path from 'path';
// Ensure env vars are loaded (though they should be already)
dotenv.config({ path: path.join(process.cwd(), '.env') });

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || "http://localhost:3000"
});

export const createTrace = (name: string, input?: any, userId?: string, sessionId?: string) => {
  const trace = langfuse.trace({
    name,
    input,
    userId,
    sessionId
  });

  return {
    ...trace,
    span: (options: { name: string; input?: any }) => {
      const span = trace.span(options);
      return {
        ...span,
        update: (data: any) => span.update(data),
        end: () => {
          span.end();
        }
      };
    },
    update: (data: any) => {
      trace.update(data);
    },
    end: () => {
      // Langfuse v3 doesn't require explicit trace end
    }
  };
};

// Helper to flush traces for short-lived operations
export const flushTraces = async () => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Allow time for async sending
  } catch (error) {
    console.error('Error with Langfuse traces:', error);
  }
};

export default langfuse;