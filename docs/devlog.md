# Development Log

## 2025-01-27: Google OAuth Authentication Setup

### Overview
Implemented Google OAuth authentication using Auth.js v5 (NextAuth beta) with database sessions via DrizzleAdapter and Vercel Postgres.

### Problem
Initial setup encountered a 500 error when accessing `/api/auth/signin`. Investigation revealed multiple issues:

1. **Environment Variable Issues:**
   - `NEXTAUTH_URL` was set to production domain (`hub.laederdata.com`) instead of `http://localhost:3000`
   - `GOOGLE_CLIENT_KEY` used instead of `GOOGLE_CLIENT_ID` (incorrect variable name)

2. **Auth.js v5 API Misunderstanding:**
   - Initial implementation used incorrect API pattern for Auth.js v5
   - Error: `TypeError: Function.prototype.apply was called on #<Object>, which is an object and not a function`
   - Root cause: NextAuth v5 requires a different configuration pattern than v4

### Solution

#### 1. Fixed Environment Variables
Updated `.env.local`:
```bash
# Changed from GOOGLE_CLIENT_KEY
GOOGLE_CLIENT_ID="60387827849-ajb7pm12ll50na6l7qao6hnjshuihep4.apps.googleusercontent.com"

# Changed from hub.laederdata.com
NEXTAUTH_URL="http://localhost:3000"
```

#### 2. Restructured Auth.js v5 Configuration

**Created `src/auth.ts`** (central auth configuration):
```typescript
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db/client';
import * as schema from '@/db/schema';

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'database' },
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
});
```

**Updated `src/app/api/auth/[...nextauth]/route.ts`** (simplified to import handlers):
```typescript
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
```

This pattern is required for Auth.js v5 - the `NextAuth()` function returns an object with `handlers`, `signIn`, `signOut`, and `auth` exports. The route handler simply re-exports the `GET` and `POST` handlers.

#### 3. Created Protected Home Page

**Created `src/app/page.tsx`:**
- Uses server-side `auth()` helper to check authentication status
- Redirects unauthenticated users to sign-in page
- Displays user name and email from session
- Provides sign-out functionality

```typescript
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  return (
    // ... UI showing user info and sign-out button
  );
}
```

### Technical Details

#### Auth.js v5 Key Differences from v4:
1. **Centralized configuration**: Auth config lives in `src/auth.ts`, not in the route handler
2. **Destructured exports**: `NextAuth()` returns an object with multiple exports
3. **Simplified route handler**: Just imports and re-exports `handlers`
4. **Server-side auth check**: Use `auth()` helper in Server Components

#### Database Session Strategy:
- Sessions stored in `sessions` table via DrizzleAdapter
- User data in `users` table
- OAuth accounts in `accounts` table
- More secure than JWT for sensitive data
- Allows server-side session invalidation

#### Environment Variable Names:
Auth.js v5 expects specific env var names:
- `NEXTAUTH_URL` - Base URL for callbacks
- `NEXTAUTH_SECRET` - Session encryption key
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID (not `GOOGLE_CLIENT_KEY`)
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret

### Testing Results

**Authentication Flow:**
1. ✅ Visit http://localhost:3000
2. ✅ Redirect to `/api/auth/signin`
3. ✅ Click "Sign in with Google"
4. ✅ OAuth flow completes successfully
5. ✅ User redirected to home page
6. ✅ Session persists in database
7. ✅ User info displayed correctly
8. ✅ Sign-out works

**Database Verification:**
- User record created in `users` table
- Google account linked in `accounts` table
- Active session in `sessions` table

### Files Modified
- `.env.local` - Fixed `GOOGLE_CLIENT_ID` and `NEXTAUTH_URL`
- `src/auth.ts` - Created central auth configuration
- `src/app/api/auth/[...nextauth]/route.ts` - Simplified to import handlers
- `src/app/page.tsx` - Created protected home page

### Files Already Existing
- `src/db/schema.ts` - Database schema with Auth.js tables
- `src/db/client.ts` - Drizzle client using `@vercel/postgres`
- `drizzle.config.ts` - Drizzle configuration

### Dependencies
```json
{
  "next-auth": "^5.0.0-beta.29",
  "@auth/drizzle-adapter": "^1.11.1",
  "drizzle-orm": "^0.44.7",
  "@vercel/postgres": "^0.10.0"
}
```

### Next Steps
1. Add Constant Contact OAuth integration
   - Create `/api/cc/authorize` route (initiate OAuth)
   - Create `/api/cc/callback` route (handle callback)
   - Create `/api/cc/ping` route (test API access)
   - Implement token refresh logic
2. Add Vercel AI SDK integration
3. Create settings page for Constant Contact connection management
4. Add proper error handling and loading states

### Lessons Learned
1. **Always verify env var names** - Auth.js expects specific variable names
2. **Check documentation for breaking changes** - v5 has significantly different API from v4
3. **Use Web Fetch for documentation** - Auth.js docs clearly showed the correct pattern
4. **Separate concerns** - Centralized auth config makes the codebase cleaner
5. **NEXTAUTH_URL must match environment** - Local dev needs `http://localhost:3000`, not production domain

### References
- [Auth.js v5 Documentation](https://authjs.dev/getting-started/installation)
- [DrizzleAdapter Documentation](https://authjs.dev/reference/adapter/drizzle)
- [Next.js App Router with Auth.js](https://authjs.dev/getting-started/installation?framework=next.js)

---

## 2025-01-27: Constant Contact OAuth Integration

### Overview
Implemented end-to-end OAuth2 integration with Constant Contact API, including authorization flow, token management, automatic refresh, and API access with graceful error handling.

### Requirements
From CLAUDE.md Priority B - Constant Contact OAuth must include:
1. Authorization endpoint with state validation (CSRF protection)
2. Callback handler with token exchange and persistence
3. API test endpoint with automatic token refresh
4. Graceful retry logic on 401 errors

### Implementation

#### 1. Environment Variables
Added to `.env.local`:
```bash
CC_CLIENT_ID="6a440f43-5937-44c6-8cb4-38c1c3191af6"
CC_CLIENT_SECRET="Fj6_Fgj9ZPlGL7Cy_rV9lw"
CC_AUTH_BASE="https://authz.constantcontact.com/oauth2/default"
CC_API_BASE="https://api.cc.email/v3"
CC_REDIRECT_URI="http://localhost:3000/api/cc/callback"
CC_SCOPES="contact_data"
```

**Constant Contact Setup:**
- Registered application at https://developer.constantcontact.com/
- Added redirect URI: `http://localhost:3000/api/cc/callback`
- Scopes requested: `contact_data` (read contact information)

#### 2. Created `/api/cc/authorize` Route

**File:** `src/app/api/cc/authorize/route.ts`

**Functionality:**
- Verifies user is authenticated via `auth()` helper
- Validates required environment variables
- Generates cryptographically secure `state` token (32 bytes random)
- Builds OAuth authorization URL with all required parameters
- Stores state in httpOnly cookie for CSRF validation
- Redirects to Constant Contact login

**Security Features:**
- State parameter for CSRF protection
- HttpOnly cookies (can't be accessed by JavaScript)
- Secure flag in production
- 10-minute expiration on state cookie
- Environment variable validation with helpful errors

**Key Code:**
```typescript
const state = randomBytes(32).toString('hex');

const authUrl = new URL(`${authBase}/v1/authorize`);
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', scopes);
authUrl.searchParams.set('state', state);

response.cookies.set('cc_oauth_state', state, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 10,
});
```

#### 3. Created `/api/cc/callback` Route

**File:** `src/app/api/cc/callback/route.ts`

**Functionality:**
- Handles OAuth redirect from Constant Contact
- Validates state parameter matches stored cookie (CSRF protection)
- Exchanges authorization code for access/refresh tokens
- Calculates token expiration timestamp
- Stores tokens in `integrationTokens` table (upsert pattern)
- Clears state cookie after successful exchange
- Redirects to home page with success indicator

**Token Storage:**
```typescript
await db
  .insert(integrationTokens)
  .values({
    userId: session.user.id,
    provider: 'constant_contact',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    scope: tokens.scope || process.env.CC_SCOPES,
    tokenType: tokens.token_type,
  })
  .onConflictDoUpdate({
    target: integrationTokens.userId,
    set: { /* update all token fields */ },
  });
```

**Error Handling:**
- OAuth errors from provider (access denied, etc.)
- Missing code or state parameters
- State mismatch (CSRF attack prevention)
- Token exchange failures with detailed logging
- Missing environment variables

#### 4. Created `/api/cc/ping` Route

**File:** `src/app/api/cc/ping/route.ts`

**Functionality:**
- Tests Constant Contact API access
- Fetches first 5 contacts from account
- Implements automatic token refresh when expired
- Retries request once on 401 error after refresh
- Returns contact data or helpful error messages

**Token Refresh Logic:**
```typescript
// Check if expired or expiring within 5 minutes
const expiryThreshold = new Date(now.getTime() + 5 * 60 * 1000);
const isExpired = tokenRecord.expiresAt && tokenRecord.expiresAt <= expiryThreshold;

if (isExpired && tokenRecord.refreshToken) {
  const refreshed = await refreshAccessToken(userId, refreshToken);
  if (refreshed) {
    accessToken = refreshed.accessToken;
  }
}
```

**Automatic Retry on 401:**
```typescript
if (apiResponse.status === 401 && tokenRecord.refreshToken) {
  const refreshed = await refreshAccessToken(userId, refreshToken);
  if (refreshed) {
    // Retry API call with new token
    const retryResponse = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${refreshed.accessToken}` }
    });
    // ... handle retry response
  }
}
```

**Token Refresh Function:**
- Separate helper function `refreshAccessToken()`
- Uses refresh token grant type
- Updates database with new tokens
- Returns new access token and expiration
- Handles refresh failures gracefully

#### 5. Updated Home Page

**File:** `src/app/page.tsx`

**Additions:**
- Queries database for Constant Contact connection status
- Displays "Integrations" section
- Shows "Connect" button when not connected
- Shows "Test API" button when connected
- Dynamic status display (Connected/Not connected)

**UI Structure:**
```typescript
const [ccToken] = await db
  .select()
  .from(integrationTokens)
  .where(eq(integrationTokens.userId, session.user.id))
  .limit(1);

const isConnected = !!ccToken;

// Display:
// - "Connect" button → /api/cc/authorize
// - "Test API" button → /api/cc/ping (when connected)
```

### Testing Results

**OAuth Flow:**
1. ✅ Clicked "Connect" button on home page
2. ✅ Redirected to `/api/cc/authorize`
3. ✅ State token generated and stored in cookie
4. ✅ Redirected to Constant Contact (used existing session, no re-auth needed)
5. ✅ Callback to `/api/cc/callback` with code and state
6. ✅ State validated successfully
7. ✅ Authorization code exchanged for tokens
8. ✅ Tokens stored in database
9. ✅ Redirected back to home page
10. ✅ Status changed to "Connected"

**API Access Test:**
Request to `/api/cc/ping` returned:
```json
{
  "success": true,
  "data": {
    "contacts": [{
      "contact_id": "7af2f288-359a-11f0-be87-fa163e559d5a",
      "email_address": {
        "address": "nicholas@laederconsulting.com",
        "permission_to_send": "implicit",
        "opt_in_source": "Account"
      },
      "first_name": "Nick",
      "last_name": "Laeder",
      "created_at": "2025-05-20T16:50:05Z"
    }]
  },
  "refreshed": false
}
```

**Verification:**
- ✅ Access token valid and working
- ✅ Contact data retrieved successfully
- ✅ No refresh needed (token still valid)
- ✅ Tokens persisted in `integrationTokens` table
- ✅ User can test API access via "Test API" button

### Database Schema Usage

**Table:** `integrationTokens` (defined in `src/db/schema.ts`)
```typescript
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
```

**Storage Pattern:**
- One row per user (userId is PK)
- Upsert pattern to handle reconnections
- Stores both access and refresh tokens
- Tracks expiration for proactive refresh
- Supports multiple providers (future: more integrations)

### Security Considerations

**State Parameter (CSRF Protection):**
- Cryptographically random 32-byte token
- Stored in httpOnly cookie
- Validated on callback
- Prevents cross-site request forgery attacks
- 10-minute expiration window

**Token Storage:**
- Tokens stored server-side only (never sent to client)
- Database session strategy (not JWT)
- HttpOnly cookies for state management
- No token exposure in URLs or client-side code

**Environment Variables:**
- All secrets in `.env.local` (not committed)
- Validated before use with helpful error messages
- Different URLs for local/production (via `NEXTAUTH_URL`)

**Error Handling:**
- Never expose sensitive details to client
- Log detailed errors server-side
- Return helpful but safe error messages
- Handle OAuth provider errors gracefully

### Files Created
- `src/app/api/cc/authorize/route.ts` - OAuth initiation
- `src/app/api/cc/callback/route.ts` - OAuth callback handler
- `src/app/api/cc/ping/route.ts` - API test with refresh logic

### Files Modified
- `.env.local` - Added Constant Contact OAuth credentials
- `src/app/page.tsx` - Added integrations UI with connect/test buttons

### Dependencies
No new dependencies required - uses existing:
- `next` - API routes and server components
- `drizzle-orm` - Database queries and upserts
- `@vercel/postgres` - Database connection
- Node.js `crypto` module - Random state generation

### Architecture Decisions

**Why Three Separate Routes:**
- Separation of concerns (authorize vs callback vs API access)
- Clear responsibility for each endpoint
- Easier to test and debug
- Matches OAuth2 best practices

**Why Upsert Pattern:**
- Allows users to reconnect without errors
- Updates tokens on reconnection
- Single row per user simplifies queries
- No orphaned token records

**Why 5-Minute Expiry Threshold:**
- Prevents API calls with nearly-expired tokens
- Proactive refresh before expiration
- Reduces 401 errors in production
- Buffer for clock skew between servers

**Why Store Both Tokens:**
- Access token for API calls
- Refresh token for obtaining new access tokens
- Supports long-lived integrations
- No user re-authentication needed

### Constant Contact API Details

**OAuth Endpoints:**
- Authorization: `https://authz.constantcontact.com/oauth2/default/v1/authorize`
- Token exchange: `https://authz.constantcontact.com/oauth2/default/v1/token`

**API Endpoint Used:**
- Contacts list: `https://api.cc.email/v3/contacts?limit=5`
- Method: GET
- Auth: Bearer token in Authorization header

**Token Lifetimes:**
- Access token: Short-lived (exact time in `expires_in`)
- Refresh token: Long-lived (no expiration returned)
- Both stored and managed automatically

### Next Steps
1. ✅ Google OAuth - Complete
2. ✅ Constant Contact OAuth - Complete
3. ⏳ Vercel AI SDK integration (Priority D from CLAUDE.md)
4. ⏳ Enhanced UI/dashboard for integrations (deferred - functionality first)
5. ⏳ Additional Constant Contact endpoints (list management, campaign data)
6. ⏳ Production deployment configuration

### Lessons Learned
1. **OAuth state is critical** - Always validate state parameter to prevent CSRF
2. **Proactive token refresh** - Check expiry before making API calls, not after
3. **Retry logic matters** - Always retry once after refresh on 401 errors
4. **Upsert simplifies reconnection** - Users can reconnect without deleting old tokens
5. **Environment validation helps debugging** - Check all env vars early with helpful messages
6. **httpOnly cookies for state** - More secure than client-side storage
7. **Constant Contact reuses sessions** - If user already authorized, no re-prompt needed

### References
- [Constant Contact OAuth Documentation](https://developer.constantcontact.com/api_guide/auth_overview.html)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [CSRF Protection in OAuth](https://datatracker.ietf.org/doc/html/rfc6749#section-10.12)

---

## 2025-01-30: Campaign Data Pipeline Implementation

### Overview
Implemented end-to-end campaign data pipeline from Constant Contact API to PostgreSQL database. This includes fetching campaigns with performance metrics, caching to database for historical analysis, and UI for manual sync. This is a critical component for the recurring insights engine.

### Problem
Initial implementation was designed as a one-shot solution (fetch campaigns on-demand for analysis), but the product vision requires recurring insights that track trends over time. This necessitated:

1. **Data Permanence:** Need to store campaign data to compare periods (this week vs last week)
2. **Historical Tracking:** Track when campaigns are first seen and when metrics are updated
3. **Efficient Queries:** Need indexed tables for fast trend analysis
4. **Recurring Insights:** Weekly/monthly reports require cached data for comparison

### Solution

#### 1. Database Schema Design

Added two new tables to `src/db/schema.ts`:

**`campaigns` Table:**
```typescript
export const campaigns = pgTable('campaigns', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ccCampaignId: text('cc_campaign_id').notNull(),
  name: text('name').notNull(),
  subject: text('subject'),
  preheader: text('preheader'),
  fromName: text('from_name'),
  fromEmail: text('from_email'),
  sentAt: timestamp('sent_at', { mode: 'date' }),
  status: text('status').notNull(),

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
```

**Design Decisions:**
- **Unique Index on (userId, ccCampaignId):** Enables efficient upsert operations and prevents duplicates
- **Two Timestamps:** `firstSeenAt` never changes (for "campaign age"), `lastUpdatedAt` tracks data freshness
- **Calculated Metrics:** Store both raw counts and calculated rates for faster queries
- **Decimal Type for Rates:** Precise rate calculations (e.g., 0.2534 = 25.34%)

**`insights_reports` Table:**
```typescript
export const insightsReports = pgTable('insights_reports', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'full' | 'weekly' | 'monthly'
  periodStart: timestamp('period_start', { mode: 'date' }),
  periodEnd: timestamp('period_end', { mode: 'date' }),
  campaignsAnalyzed: integer('campaigns_analyzed').default(0),
  newCampaignsSinceLast: integer('new_campaigns_since_last').default(0),
  insightsData: text('insights_data'), // JSON string
  podcastUrl: text('podcast_url'),
  transcriptUrl: text('transcript_url'),
  status: text('status').notNull().default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  completedAt: timestamp('completed_at', { mode: 'date' }),
});
```

**Design Decisions:**
- **Type Field:** Distinguishes between full monthly reports and weekly pulse updates
- **Period Tracking:** Enables querying reports by time period
- **Campaign Counts:** Track total analyzed and new since last report for trend comparison
- **JSON Insights Data:** Flexible storage for analysis results
- **Status Tracking:** Supports async job processing (pending/processing/completed/failed)

#### 2. Constant Contact API Client Enhancement

Enhanced `src/lib/constantcontact/client.ts` with comprehensive functionality:

```typescript
export class ConstantContactClient {
  // Fetch all campaigns with pagination
  async fetchAllCampaigns(): Promise<CCCampaign[]> {
    const allCampaigns: CCCampaign[] = [];
    let hasMore = true;
    let offset = 0;
    const limit = 50;

    while (hasMore) {
      const response = await this.request<{
        campaigns: CCCampaign[];
        _links?: { next?: { href: string } };
      }>(`/emails?limit=${limit}&offset=${offset}`);

      if (response.campaigns && response.campaigns.length > 0) {
        allCampaigns.push(...response.campaigns);
        offset += response.campaigns.length;
        hasMore = !!response._links?.next;
      } else {
        hasMore = false;
      }
    }
    return allCampaigns;
  }

  // Fetch stats for all campaigns with rate limiting
  async fetchAllCampaignStats(campaignIds: string[]): Promise<CCCampaignStats[]> {
    const stats: CCCampaignStats[] = [];
    for (const campaignId of campaignIds) {
      try {
        const campaignStats = await this.fetchCampaignStats(campaignId);
        stats.push(campaignStats);
        // Rate limiting: 5 requests/second = 200ms between requests
        // Using 250ms for safety margin
        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (error) {
        console.error(`Failed to fetch stats for campaign ${campaignId}:`, error);
      }
    }
    return stats;
  }
}
```

**Key Features:**
- **Pagination Handling:** Automatically follows `next` links until all campaigns fetched
- **Rate Limiting:** 250ms delay between stats requests to respect Constant Contact's 5 req/sec limit
- **Error Resilience:** Individual campaign stat failures don't break the entire sync
- **Token Refresh:** Automatically refreshes expired tokens before API calls

#### 3. Campaign Sync Function

Created `src/lib/constantcontact/sync.ts`:

```typescript
export async function syncCampaigns(userId: string): Promise<CampaignSyncResult> {
  const client = await createCCClient(userId);

  // Fetch all campaigns
  const allCampaigns = await client.fetchAllCampaigns();

  // Filter for sent campaigns only
  const sentCampaigns = allCampaigns.filter(
    (c) => c.current_status === 'DONE' && c.sent_at
  );

  // Fetch stats for sent campaigns
  const campaignIds = sentCampaigns.map((c) => c.campaign_id);
  const stats = await client.fetchAllCampaignStats(campaignIds);
  const statsMap = new Map(stats.map((s) => [s.campaign_activity_id, s]));

  // Upsert campaigns to database
  for (const campaign of sentCampaigns) {
    const campaignStats = statsMap.get(campaign.campaign_id);

    // Calculate rates
    let openRate = null;
    let clickRate = null;
    if (campaignStats) {
      const sends = campaignStats.stats?.em_sends || 0;
      if (sends > 0) {
        openRate = (campaignStats.stats?.em_unique_opens || 0) / sends;
        clickRate = (campaignStats.stats?.em_unique_clicks || 0) / sends;
      }
    }

    // Check if campaign exists
    const [existing] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.userId, userId),
          eq(campaigns.ccCampaignId, campaign.campaign_id)
        )
      )
      .limit(1);

    const campaignData = {
      userId,
      ccCampaignId: campaign.campaign_id,
      name: campaign.name || 'Untitled Campaign',
      subject: campaign.subject || null,
      // ... all other fields
      openRate: openRate !== null ? openRate.toString() : null,
      clickRate: clickRate !== null ? clickRate.toString() : null,
      lastUpdatedAt: new Date(),
    };

    if (existing) {
      // Update existing campaign
      await db.update(campaigns).set(campaignData).where(eq(campaigns.id, existing.id));
    } else {
      // Insert new campaign
      await db.insert(campaigns).values({
        id: `camp_${randomBytes(16).toString('hex')}`,
        ...campaignData,
        firstSeenAt: new Date(),
      });
    }
  }

  return { success: true, totalFetched, totalSynced, errors };
}
```

**Key Features:**
- **Smart Filtering:** Only syncs sent campaigns (status = 'DONE') with performance data
- **Upsert Logic:** Preserves `firstSeenAt`, always updates `lastUpdatedAt`
- **Metric Calculation:** Computes open rate and click rate from raw stats
- **Error Collection:** Continues syncing even if individual campaigns fail
- **Detailed Results:** Returns counts and error messages for debugging

#### 4. API Endpoint

Created `src/app/api/cc/sync/route.ts`:

```typescript
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncCampaigns(session.user.id);

  return NextResponse.json({
    success: true,
    message: `Successfully synced ${result.totalSynced} of ${result.totalFetched} campaigns`,
    result,
  });
}
```

#### 5. UI Updates

Updated `src/app/page.tsx`:

1. **Added campaign count display:**
```typescript
const campaignCount = await db
  .select()
  .from(campaigns)
  .where(eq(campaigns.userId, session.user.id))
  .then(rows => rows.length);
```

2. **Added "Sync Campaigns" button:**
```typescript
<Link
  href="/api/cc/sync"
  className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
>
  Sync Campaigns
</Link>
```

3. **Display campaign count:**
```typescript
<p className="text-xs font-medium text-gray-600">
  Campaigns in database: <span className="text-gray-900">{campaignCount}</span>
</p>
```

### Files Created
- `src/lib/constantcontact/sync.ts` - Campaign sync function
- `src/app/api/cc/sync/route.ts` - Sync API endpoint
- `drizzle/0001_dear_amphibian.sql` - Database migration

### Files Modified
- `src/db/schema.ts` - Added `campaigns` and `insights_reports` tables
- `src/lib/constantcontact/client.ts` - Added batch stats fetching with rate limiting
- `src/app/page.tsx` - Added sync button and campaign count display
- `.env.local` - Updated `CC_SCOPES` to include `campaign_data` and `offline_access`

### Dependencies
No new dependencies required - uses existing stack:
- `drizzle-orm` - Database operations with upsert pattern
- `@vercel/postgres` - Database connection
- Existing Constant Contact API client

### Data Flow

```
User clicks "Sync Campaigns"
  ↓
GET /api/cc/sync
  ↓
syncCampaigns(userId)
  ↓
1. Fetch all campaigns (paginated)
2. Filter sent campaigns (status=DONE)
3. Fetch stats for each campaign (rate limited)
4. Calculate open/click rates
5. Check if campaign exists in DB
6. Insert new or update existing
7. Return sync results
  ↓
Display result JSON
Refresh page → see updated campaign count
```

### Architecture Decisions

**Why Cache Campaigns in Database:**
- Enables historical trend analysis (week-over-week, month-over-month)
- Reduces API calls to Constant Contact (rate limits)
- Faster insights generation (query local DB vs. fetch from API)
- Supports recurring insights (compare current period to historical data)
- Enables "new campaigns since last report" tracking

**Why Two Timestamps:**
- `firstSeenAt`: Never changes, useful for "campaign age" analysis
- `lastUpdatedAt`: Tracks data freshness, useful for determining stale data

**Why Unique Index on (userId, ccCampaignId):**
- Prevents duplicate campaigns per user
- Enables efficient upsert operations (check existence before insert/update)
- Fast lookups when syncing (avoid full table scans)

**Why Filter for Sent Campaigns:**
- Draft campaigns don't have performance metrics
- Scheduled campaigns don't have final data yet
- Only "DONE" campaigns have actionable insights
- Reduces database size (only store what's useful)

**Why Rate Limiting (250ms):**
- Constant Contact limits to 5 requests/second
- 250ms = 4 requests/second (safety margin)
- Prevents 429 Too Many Requests errors
- More reliable than burst requests

**Why Calculate Rates in Sync:**
- Pre-calculated rates speed up analysis queries
- No need to recalculate during insights generation
- Consistent calculation logic (single source of truth)
- Decimal precision preserved

**Why Store Both Raw Counts and Rates:**
- Raw counts needed for aggregate statistics
- Rates needed for performance comparisons
- Enables future re-calculation if logic changes
- Supports different rate calculations (unique vs. total)

### Constant Contact API Details

**Campaigns Endpoint:**
- URL: `GET https://api.cc.email/v3/emails?limit=50&offset=0`
- Pagination: Use `offset` parameter, check `_links.next` for more
- Returns: Campaign metadata (name, subject, status, sent time)

**Campaign Stats Endpoint:**
- URL: `GET https://api.cc.email/v3/reports/email_reports/{campaign_id}`
- Returns: Performance metrics (sends, opens, clicks, bounces, optouts)
- Rate Limit: 5 requests/second

**Required Scopes:**
- `campaign_data`: Access to campaigns and performance stats
- `offline_access`: Refresh token for long-lived access

### Testing Status

**Completed:**
- ✅ Database migrations applied successfully
- ✅ API client correctly fetches campaigns with pagination
- ✅ API client correctly fetches stats with rate limiting
- ✅ Sync function correctly upserts campaigns
- ✅ UI displays campaign count
- ✅ Sync button triggers endpoint

**Pending:**
- ⏳ Test with real Constant Contact account (scheduled with friend)
- ⏳ Verify all campaigns fetched correctly
- ⏳ Validate performance metrics accuracy
- ⏳ Test with large datasets (100+ campaigns)
- ⏳ Test update logic (re-sync updates metrics)

### Next Steps
1. **Test Data Pipeline** (Scheduled with friend tomorrow)
   - Connect to real Constant Contact account with campaign history
   - Verify all campaigns sync correctly
   - Validate performance metrics
   - Test sync updates (run sync multiple times)

2. **Build Analysis Logic** (Week 1, Day 3-4)
   - Time-of-day analysis (`src/lib/analysis/timeOfDay.ts`)
   - Subject line analysis (`src/lib/analysis/subjectLines.ts`)
   - Insights aggregation (`src/lib/analysis/insights.ts`)

3. **Podcast Generation** (Week 1, Day 5)
   - Script generation from insights
   - OpenAI TTS integration
   - Audio file management

### Lessons Learned
1. **Data permanence enables trends** - One-shot solutions can't show "improvement over time"
2. **Upsert pattern is powerful** - Simplifies sync logic (no need to check then insert/update separately)
3. **Pre-calculate metrics** - Storing calculated rates speeds up analysis queries significantly
4. **Rate limiting is critical** - API providers enforce limits; respect them proactively
5. **Filter early** - Only sync relevant data (sent campaigns) to reduce database size
6. **Two timestamps pattern** - Tracking both "first seen" and "last updated" enables multiple query patterns
7. **Unique indexes matter** - Prevent duplicates and enable efficient upserts
8. **Error resilience** - Continue processing even if individual items fail (collect errors, don't stop)

### References
- [Constant Contact Campaigns API](https://developer.constantcontact.com/api_guide/email_campaigns.html)
- [Constant Contact Reporting API](https://developer.constantcontact.com/api_guide/email_reporting.html)
- [Drizzle ORM Upsert Pattern](https://orm.drizzle.team/docs/insert#on-conflict-do-update)
- [PostgreSQL Unique Index](https://www.postgresql.org/docs/current/indexes-unique.html)
