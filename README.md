# LaederHub

LaederHub is a Next.js application using the App Router with Auth.js v5 (NextAuth) for Google OAuth authentication, Drizzle ORM with Vercel Postgres, Constant Contact OAuth2 integration, and the Vercel AI SDK for AI-powered analytics.

## What's Inside
- **Auth System** &mdash; Auth.js v5 with Google OAuth and database sessions using DrizzleAdapter
- **Database** &mdash; Vercel Postgres (Neon) with Drizzle ORM for schema and migrations
- **Protected Routes** &mdash; Server-side authentication checks using `auth()` helper
- **Constant Contact Integration** &mdash; OAuth2 with automatic token refresh and API access
- **Future** &mdash; Vercel AI SDK endpoints, enhanced dashboard UI

## Repository Structure
```
.
├── src/
│   ├── app/            # Next.js App Router pages and API routes
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # Auth.js route handler
│   │   │   └── cc/                  # Constant Contact OAuth routes
│   │   │       ├── authorize/       # Initiate OAuth flow
│   │   │       ├── callback/        # Handle OAuth callback
│   │   │       └── ping/            # Test API with token refresh
│   │   └── page.tsx    # Protected home page with integrations
│   ├── db/             # Database client and schema (Drizzle ORM)
│   └── auth.ts         # Auth.js v5 configuration
├── drizzle/            # Database migrations
├── docs/               # Project documentation
│   └── devlog.md       # Detailed development log
├── drizzle.config.ts   # Drizzle Kit configuration
├── package.json        # Dependencies (pnpm)
└── tsconfig.json       # TypeScript configuration
```

## Prerequisites
- Node.js LTS (18+)
- pnpm (package manager)
- Vercel account (for Postgres database and deployment)
- Google Cloud Console project with OAuth2 credentials
- Constant Contact developer account with OAuth2 app

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
CC_SCOPES="contact_data"
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
5. Request `contact_data` scope for read access to contacts

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
3. Approve access (scope: `contact_data`)
4. Redirected back to app with authorization code
5. Code exchanged for access/refresh tokens
6. Tokens stored in `integration_tokens` table
7. Status updates to "Connected" with "Test API" button
8. Tokens automatically refresh when expired

## Database Schema

Tables managed by Drizzle ORM in [src/db/schema.ts](src/db/schema.ts):

- `users` - User profiles from OAuth providers
- `accounts` - OAuth provider accounts (Google)
- `sessions` - Active database sessions
- `verification_tokens` - Email verification tokens (future use)
- `integration_tokens` - Third-party OAuth tokens (Constant Contact)
  - Stores access tokens, refresh tokens, expiration timestamps
  - One row per user (upsert pattern for reconnections)
  - Automatic token refresh on API calls

## Available Scripts

```bash
pnpm dev                # Start dev server
pnpm build              # Build for production
pnpm start              # Start production server
pnpm drizzle:generate   # Generate migrations from schema
pnpm drizzle:migrate    # Apply migrations to database
```

## API Routes

### Constant Contact Endpoints

- **`GET /api/cc/authorize`** - Initiates OAuth flow with Constant Contact
- **`GET /api/cc/callback`** - Handles OAuth callback and stores tokens
- **`GET /api/cc/ping`** - Tests API access, fetches first 5 contacts
  - Automatically refreshes expired tokens
  - Retries once on 401 errors
  - Returns contact data as JSON

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
   - `CC_SCOPES` (same as local: `contact_data`)
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
- **Styling**: Tailwind CSS (planned)
- **Deployment**: Vercel
- **Package Manager**: pnpm

## Features

### Implemented ✅
- Google OAuth authentication with database sessions
- Constant Contact OAuth2 integration with token management
- Automatic token refresh with expiry detection
- Protected server-side routes
- Integration status dashboard
- API testing endpoint

### Planned 🚧
- Vercel AI SDK integration
- Enhanced UI/dashboard
- Additional Constant Contact endpoints (campaigns, lists)
- Contact data analytics
- Real-time data sync

## Next Steps

See [docs/devlog.md](docs/devlog.md) for detailed development progress and [tasks_mvp.md](tasks_mvp.md) for upcoming work.
