import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({
  path: '.env',
});

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    console.log('⚠️  POSTGRES_URL is not defined, skipping migrations');
    process.exit(0);
  }

  try {
    const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
    const db = drizzle(connection);

    console.log('⏳ Running migrations...');

    const start = Date.now();
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    const end = Date.now();

    console.log('✅ Migrations completed in', end - start, 'ms');
    process.exit(0);
  } catch (error) {
    console.log('⚠️  Database connection failed, skipping migrations');
    console.log('Error:', error instanceof Error ? error.message : String(error));
    process.exit(0);
  }
};

runMigrate().catch((err) => {
  console.log('⚠️  Migration process failed, skipping migrations');
  console.log('Error:', err instanceof Error ? err.message : String(err));
  process.exit(0);
});
