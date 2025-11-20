import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Ensure POSTGRES_URL is available
if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

// Configure connection with proper pooling and limits
const client = postgres(process.env.POSTGRES_URL, {
  // Connection pooling settings
  max: 20, // Maximum number of connections in the pool (increased from 10)
  idle_timeout: 30, // Close idle connections after 30 seconds (increased from 20)
  max_lifetime: 60 * 30, // Close connections after 30 minutes
  
  // Connection behavior
  connect_timeout: 10, // Connection timeout in seconds
  prepare: false, // Disable prepared statements for better compatibility
  
  // Development settings
  debug: process.env.NODE_ENV === 'development' ? false : false, // Set to true for debugging
  
  // Error handling
  onnotice: () => {}, // Suppress notices in development
  
  // Additional error handling
  transform: {
    undefined: null, // Transform undefined to null for better compatibility
  },
});

// Note: The postgres library handles errors internally and throws them during queries
// Error handling is done via try-catch blocks in query functions

export const db = drizzle(client, { schema });