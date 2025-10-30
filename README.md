# LaederHub

LaederHub is a subscription SaaS platform that generates AI-powered marketing insights from Constant Contact data, delivered as engaging podcast conversations. Built with Next.js (App Router), Auth.js v5, and Drizzle ORM.

## Product Vision

**The Problem:** Marketing teams use basic Constant Contact analytics (open rates, clicks) but lack actionable insights about what actually works.

**The Solution:** Deep analysis of campaign data surfacing patterns like optimal send times, subject line characteristics that drive opens, and specific recommendations - delivered as a conversational podcast, not boring dashboards.

**Business Model:** Subscription SaaS
- Users sign up and connect Constant Contact account
- Pay monthly subscription fee
- Receive monthly 10-minute podcast with marketing insights
- Optional: Weekly 5-minute pulse checks

## What's Inside
- **Auth System** &mdash; Auth.js v5 with Google OAuth and database sessions
- **Constant Contact Integration** &mdash; OAuth2 with automatic token refresh and API access
- **Campaign Analysis** &mdash; Time-of-day patterns, subject line optimization, engagement trends
- **Podcast Generation** &mdash; Two-voice conversational format using OpenAI TTS
- **Background Jobs** &mdash; Inngest for long-running analysis pipeline
- **Database** &mdash; Vercel Postgres with Drizzle ORM

## Repository Structure
```
.
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # Auth.js route handler
│   │   │   ├── cc/                  # Constant Contact OAuth
│   │   │   ├── insights/            # Insights generation API (planned)
│   │   │   └── inngest/             # Inngest webhook (planned)
│   │   ├── insights/[jobId]/        # Results page (planned)
│   │   └── page.tsx                 # Home page with integrations
│   ├── lib/                      # Core logic (planned)
│   │   ├── constantcontact/      # CC API client
│   │   ├── analysis/             # Campaign analysis functions
│   │   └── podcast/              # Podcast script & generation
│   ├── db/                       # Database (Drizzle ORM)
│   └── auth.ts                   # Auth.js v5 config
├── drizzle/                      # Database migrations
├── docs/                         # Documentation
│   ├── devlog.md                 # Development log
│   └── roadmap.md                # Product roadmap (this doc)
└── package.json                  # Dependencies
```

## Prerequisites
- Node.js LTS (18+)
- pnpm (package manager)
- Vercel account (Postgres database and deployment)
- Google Cloud Console project (OAuth2 credentials)
- Constant Contact developer account (OAuth2 app)
- OpenAI API key (podcast generation)
- Inngest account (background jobs)
- Email service account - Resend or SendGrid (notifications)

## Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
Create `.env.local` with the following variables:

```bash
# Database (from Vercel Postgres)
POSTGRES_URL="postgresql://..."
POSTGRES_URL_NON_POOLING="postgresql://..."

# Auth.js
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="<from Google Cloud Console>"
GOOGLE_CLIENT_SECRET="<from Google Cloud Console>"

# Constant Contact OAuth
CC_CLIENT_ID="<from Constant Contact developer portal>"
CC_CLIENT_SECRET="<from Constant Contact developer portal>"
CC_AUTH_BASE="https://authz.constantcontact.com/oauth2/default"
CC_API_BASE="https://api.cc.email/v3"
CC_REDIRECT_URI="http://localhost:3000/api/cc/callback"
CC_SCOPES="contact_data campaign_data offline_access"

# Insights & Podcast Generation (add when implementing)
OPENAI_API_KEY="sk-..."
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."
RESEND_API_KEY="..."  # OR SENDGRID_API_KEY

# Payments (add later)
# STRIPE_SECRET_KEY="..."
# STRIPE_WEBHOOK_SECRET="..."
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="..."
```

**Google OAuth Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env.local`

**Constant Contact OAuth Setup:**
1. Go to [Constant Contact Developer Portal](https://developer.constantcontact.com/)
2. Create a new application or select existing
3. Add redirect URI: `http://localhost:3000/api/cc/callback`
4. Copy Client ID (API Key) and Client Secret to `.env.local`
5. Required scopes: `contact_data`, `campaign_data`, `offline_access`

**Pull Vercel Environment Variables (if already deployed):**
```bash
vercel env pull
```

### 3. Run Database Migrations
```bash
pnpm drizzle:generate  # Generate migration files from schema
pnpm drizzle:migrate   # Apply migrations to database
```

### 4. Start Development Server
```bash
pnpm dev
```

The app runs on [http://localhost:3000](http://localhost:3000)

## Authentication Flow

### Google Sign-In
1. User visits http://localhost:3000
2. If not authenticated, redirected to `/api/auth/signin`
3. Click "Sign in with Google"
4. Complete Google OAuth flow
5. Redirected back to home page showing user info
6. Session stored in database via DrizzleAdapter

### Constant Contact Integration
1. Click "Connect" button on home page
2. Redirected to Constant Contact for authorization
3. Approve access (scopes: `contact_data`, `campaign_data`, `offline_access`)
4. Redirected back to app with authorization code
5. Code exchanged for access/refresh tokens
6. Tokens stored in `integration_tokens` table
7. Status updates to "Connected" with green checkmark
8. Account info displayed (email, name)
9. Tokens automatically refresh when expired or expiring within 5 minutes
10. Campaign data can be synced to database via "Sync Campaigns" button

## Database Schema

Tables managed by Drizzle ORM in [src/db/schema.ts](src/db/schema.ts):

### Current Tables
- `users` - User profiles from OAuth providers
- `accounts` - OAuth provider accounts (Google)
- `sessions` - Active database sessions
- `verification_tokens` - Email verification tokens (future use)
- `integration_tokens` - Third-party OAuth tokens (Constant Contact)
  - Stores access tokens, refresh tokens, expiration timestamps
  - One row per user (upsert pattern for reconnections)
  - Automatic token refresh on API calls
- `campaigns` - Cached campaign data for historical analysis ✅
  - Campaign metadata (name, subject, send time, status)
  - Performance metrics (sends, opens, clicks, rates)
  - Tracking timestamps (firstSeenAt, lastUpdatedAt)
  - Unique index on (userId, ccCampaignId) for efficient upserts
- `insights_reports` - Generated insights tracking ✅
  - Report metadata (type: full/weekly/monthly)
  - Period tracking (start/end dates)
  - Campaign counts (total analyzed, new since last)
  - Results (insights JSON, podcast/transcript URLs)
  - Status tracking (pending/processing/completed/failed)

### Planned Tables
- `subscriptions` - Payment/billing (Stripe integration, later)
  - User ID, plan, status, Stripe customer ID

## Available Scripts

```bash
pnpm dev                # Start dev server
pnpm build              # Build for production
pnpm start              # Start production server
pnpm drizzle:generate   # Generate migrations from schema
pnpm drizzle:migrate    # Apply migrations to database
```

## API Routes

### Authentication
- **`GET /api/auth/signin`** - Sign in with Google OAuth
- **`GET /api/auth/signout`** - Sign out and clear session
- **`GET /api/auth/callback/google`** - OAuth callback handler (Auth.js)

### Constant Contact Endpoints

- **`GET /api/cc/authorize`** - Initiates OAuth flow with Constant Contact
  - Generates state for CSRF protection
  - Redirects to CC authorization endpoint
- **`GET /api/cc/callback`** - Handles OAuth callback and stores tokens
  - Validates state parameter
  - Exchanges authorization code for tokens
  - Stores/updates tokens in database
- **`GET /api/cc/ping`** - Tests API access, fetches first 5 contacts
  - Automatically refreshes expired tokens
  - Retries once on 401 errors
  - Returns contact data as JSON
- **`GET /api/cc/campaigns`** - Fetches all campaigns with stats (test endpoint)
  - Fetches campaigns from CC API
  - Filters sent campaigns
  - Fetches performance stats
  - Returns JSON response
- **`GET /api/cc/sync`** - Syncs campaigns to database ✅
  - Fetches all campaigns and stats from CC API
  - Upserts to `campaigns` table
  - Returns sync results (counts, errors)
- **`DELETE /api/cc/disconnect`** - Disconnects Constant Contact integration
  - Deletes tokens from database
  - Requires reconnection to re-authorize

## Deployment

### Vercel Deployment

1. Import repo to Vercel
2. Configure environment variables in Vercel dashboard:
   - `POSTGRES_URL` (auto-added when creating Vercel Postgres)
   - `POSTGRES_URL_NON_POOLING` (auto-added)
   - `NEXTAUTH_SECRET` (generate new for production)
   - `NEXTAUTH_URL` (your production URL, e.g., https://hub.laederdata.com)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `CC_CLIENT_ID`
   - `CC_CLIENT_SECRET`
   - `CC_AUTH_BASE`, `CC_API_BASE` (same as local)
   - `CC_REDIRECT_URI` (production: `https://hub.laederdata.com/api/cc/callback`)
   - `CC_SCOPES` (same as local: `contact_data campaign_data offline_access`)
3. Add production redirect URIs:
   - Google Console: `https://hub.laederdata.com/api/auth/callback/google`
   - Constant Contact: `https://hub.laederdata.com/api/cc/callback`
4. Deploy

### Database Migrations in Production

Run migrations after schema changes:
```bash
vercel env pull --environment production
pnpm drizzle:migrate
```

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Auth**: Auth.js v5 (NextAuth beta)
- **Database**: Vercel Postgres (Neon)
- **ORM**: Drizzle ORM
- **Integrations**: Constant Contact OAuth2 API
- **Background Jobs**: Inngest
- **AI/TTS**: OpenAI API (podcast generation)
- **Storage**: Vercel Blob Storage (podcast files)
- **Email**: Resend or SendGrid (notifications)
- **Payments**: Stripe (planned)
- **Deployment**: Vercel
- **Package Manager**: pnpm

## Product Roadmap

### Phase 1: MVP - Core Insights (Current Focus)
**Goal:** First paying customer generating monthly insights

**Week 1: Data Pipeline ✅**
- [x] Constant Contact API client (fetch campaigns & stats)
- [x] Database schema (`campaigns`, `insights_reports` tables)
- [x] Campaign sync function with upsert logic
- [x] Automatic token refresh
- [x] Campaign count display on home page
- [ ] Time-of-day analysis (best send times)
- [ ] Subject line analysis (length, numbers, patterns)
- [ ] Insights aggregation (structured JSON output)
- [ ] Podcast script generation (two-voice conversation template)
- [ ] OpenAI TTS integration (audio generation)

**Week 2: Background Jobs & UI**
- [ ] Inngest setup (long-running jobs)
- [ ] API routes (`/api/insights/generate`, `/api/insights/status/:id`)
- [ ] Home page "Generate Insights" button
- [ ] Results page with audio player & transcript
- [ ] Email notifications (job complete)

**Week 3: Testing & Deployment**
- [ ] End-to-end testing with real campaign data
- [ ] Error handling & edge cases
- [ ] Production deployment (Vercel)
- [ ] Documentation updates

### Phase 2: Monetization
- [ ] Stripe integration (subscription plans)
- [ ] Checkout flow & payment handling
- [ ] Billing portal
- [ ] Gate insights behind subscription
- [ ] Pricing page

### Phase 3: Recurring Insights
- [ ] Weekly pulse podcasts (5-min updates)
- [ ] Inngest cron job (weekly schedule)
- [ ] Trend analysis (compare to previous periods)
- [ ] Email all active subscribers

### Phase 4: Enhancement
- [ ] List segmentation recommendations
- [ ] Historical tracking & trend visualization
- [ ] Manual regeneration option
- [ ] Shareable podcast links
- [ ] Dashboard improvements

## Current Status

### Implemented ✅
- **Authentication**
  - Google OAuth with Auth.js v5 and database sessions
  - Protected server-side routes
- **Constant Contact Integration**
  - OAuth2 flow with state validation (CSRF protection)
  - Token management with automatic refresh (5-min expiry window)
  - Disconnect/reconnect functionality
  - Account info display (email, name)
- **Campaign Data Pipeline**
  - API client with pagination and rate limiting
  - Database schema for campaigns and insights reports
  - Campaign sync function with upsert logic
  - `/api/cc/sync` endpoint for manual syncing
  - Campaign count display on home page

### In Progress 🔨
- Waiting for real campaign data to test pipeline
- Analysis pipeline architecture (time-of-day, subject lines)
- Podcast generation pipeline

### Planned 📋
- Background job orchestration (Inngest)
- Insights generation and analysis
- Results UI with audio player
- Email notifications
- Stripe payments
- Weekly pulse updates

## Documentation

- [Development Log](docs/devlog.md) - Detailed development history
- [Product Roadmap](docs/roadmap.md) - Full implementation plan (planned)
