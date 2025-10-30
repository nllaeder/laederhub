import { pgTable, text, timestamp, primaryKey, integer, decimal, uniqueIndex } from 'drizzle-orm/pg-core';

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

// CAMPAIGNS CACHE (historical campaign data)
export const campaigns = pgTable('campaigns', {
  id: text('id').primaryKey(), // Internal ID
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ccCampaignId: text('cc_campaign_id').notNull(), // Constant Contact campaign ID
  name: text('name').notNull(),
  subject: text('subject'),
  preheader: text('preheader'),
  fromName: text('from_name'),
  fromEmail: text('from_email'),
  sentAt: timestamp('sent_at', { mode: 'date' }),
  status: text('status').notNull(), // DRAFT, SCHEDULED, DONE, etc.

  // Performance metrics
  sends: integer('sends').default(0),
  opens: integer('opens').default(0),
  opensUnique: integer('opens_unique').default(0),
  clicks: integer('clicks').default(0),
  clicksUnique: integer('clicks_unique').default(0),
  bounces: integer('bounces').default(0),
  optouts: integer('optouts').default(0),
  openRate: decimal('open_rate', { precision: 5, scale: 4 }),
  clickRate: decimal('click_rate', { precision: 5, scale: 4 }),

  // Tracking
  firstSeenAt: timestamp('first_seen_at', { mode: 'date' }).defaultNow(),
  lastUpdatedAt: timestamp('last_updated_at', { mode: 'date' }).defaultNow(),
}, (t) => ({
  userCampaignIdx: uniqueIndex('user_campaign_idx').on(t.userId, t.ccCampaignId),
}));

// INSIGHTS REPORTS (generated insights with trends)
export const insightsReports = pgTable('insights_reports', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'full' | 'weekly' | 'monthly'

  // Time period covered
  periodStart: timestamp('period_start', { mode: 'date' }),
  periodEnd: timestamp('period_end', { mode: 'date' }),

  // Counts
  campaignsAnalyzed: integer('campaigns_analyzed').default(0),
  newCampaignsSinceLast: integer('new_campaigns_since_last').default(0),

  // Results
  insightsData: text('insights_data'), // JSON string with full insights
  podcastUrl: text('podcast_url'),
  transcriptUrl: text('transcript_url'),

  // Status tracking
  status: text('status').notNull().default('pending'), // pending | processing | completed | failed
  errorMessage: text('error_message'),

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  completedAt: timestamp('completed_at', { mode: 'date' }),
});
