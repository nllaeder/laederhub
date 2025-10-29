import { pgTable, text, timestamp, primaryKey, integer } from 'drizzle-orm/pg-core';

// USERS
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique(),
  image: text('image'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});

// ACCOUNTS (Auth.js)
export const accounts = pgTable('accounts', {
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
}, (t) => ({
  pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
}));

// SESSIONS (Auth.js, if using database sessions)
export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// EMAIL VERIFICATION (magic links, etc.)
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.identifier, t.token] }),
}));

// CONSTANT CONTACT TOKEN STORAGE (per user)
export const integrationTokens = pgTable('integration_tokens', {
  userId: text('user_id').primaryKey(),
  provider: text('provider').notNull().default('constant_contact'),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  accountId: text('account_id'),
  scope: text('scope'),
  tokenType: text('token_type'),
});
