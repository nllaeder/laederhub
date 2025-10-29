import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';

// Use this in your route handlers / server actions
export const db = drizzle(sql);
