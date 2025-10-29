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
