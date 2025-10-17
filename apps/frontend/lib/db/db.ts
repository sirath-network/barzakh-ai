import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Configure connection with proper pooling and limits
const client = postgres(process.env.POSTGRES_URL!, {
  // Connection pooling settings
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  max_lifetime: 60 * 30, // Close connections after 30 minutes
  
  // Connection behavior
  connect_timeout: 10, // Connection timeout in seconds
  prepare: false, // Disable prepared statements for better compatibility
  
  // Development settings
  debug: process.env.NODE_ENV === 'development' ? false : false, // Set to true for debugging
  
  // Error handling
  onnotice: () => {}, // Suppress notices in development
});

export const db = drizzle(client, { schema });