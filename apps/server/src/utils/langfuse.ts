import { Langfuse } from "langfuse";
import dotenv from 'dotenv';

// Load environment variables - should be already loaded by server startup
// This ensures Langfuse gets the same env vars as the rest of the app
dotenv.config();

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || "http://localhost:3000"
});

export default langfuse;