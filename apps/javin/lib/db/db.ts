import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// URL bisa dari .env atau langsung tulis string
const client = postgres(process.env.POSTGRES_URL!);

export const db = drizzle(client, { schema });