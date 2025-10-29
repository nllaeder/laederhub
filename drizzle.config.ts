import { config } from 'dotenv';
config({ path: '.env.local' }); // ensure drizzle-kit sees your local env

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Prefer NON_POOLING for DDL; fall back to pooled if needed
    url: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL,
  },
};
