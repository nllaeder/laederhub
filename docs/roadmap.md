# LaederHub Product Roadmap

## Product Vision

**Mission:** Empower marketing teams with actionable insights from their email campaigns, delivered in an engaging, conversational format.

**Target Audience:** Small-to-medium businesses using Constant Contact who want to optimize their email marketing but lack time for manual analysis.

**Key Differentiator:** AI-powered insights delivered as podcast conversations (not dashboards), making marketing analysis accessible and actionable.

---

## Business Model

**Subscription SaaS:**
- Monthly subscription ($29-49/mo estimated)
- Automated monthly insights podcast (10 minutes)
- Optional weekly pulse updates (5 minutes)
- Cancel anytime

**Revenue Streams:**
1. Individual subscriptions (primary)
2. Agency/multi-account plans (future)
3. One-time deep-dive reports (future)

---

## MVP Scope (Phase 1)

### Goal
Get **one paying customer** generating valuable insights from their Constant Contact data.

### Core Features
1. **Account Connection**
   - ✅ Google OAuth sign-in
   - ✅ Constant Contact OAuth integration
   - ✅ Token management with auto-refresh

2. **Insights Generation**
   - Fetch all campaign data from Constant Contact
   - Analyze time-of-day patterns (best send times)
   - Analyze subject line characteristics
   - Generate structured insights JSON
   - Create conversational podcast script
   - Convert to audio (OpenAI TTS, two voices)
   - Store in Vercel Blob Storage

3. **User Experience**
   - "Generate Insights" button on dashboard
   - Progress tracking (0-100%)
   - Email notification when complete
   - Results page with:
     - Audio player for podcast
     - Full transcript
     - Key findings summary
     - Download options

4. **Background Processing**
   - Inngest job orchestration
   - Handles long-running analysis (30-60 min)
   - Retries on failure
   - Progress updates to database

---

## Implementation Plan

### Week 1: Analysis Pipeline

#### Day 1-2: Data Fetching ✅ COMPLETED
**Goal:** Reliably fetch all campaign data from Constant Contact

**Tasks:**
- [x] Create `src/lib/constantcontact/client.ts`
  - API wrapper with auth header injection
  - Token refresh handling (5-min expiry window)
  - Rate limiting awareness (250ms delay between requests)
  - Error handling with retry logic
- [x] Function: `fetchAllCampaigns(): Promise<Campaign[]>`
  - Paginate through all campaigns (50 per page)
  - Return normalized data structure
- [x] Function: `fetchCampaignStats(campaignId): Promise<Stats>`
  - Get opens, clicks, bounces, sends
  - Calculate rates (open rate, click rate)
- [x] Function: `fetchAllCampaignStats(campaignIds[]): Promise<Stats[]>`
  - Batch fetch with rate limiting
  - Error handling per campaign
- [x] Database schema for campaign caching
  - `campaigns` table with metrics and timestamps
  - `insights_reports` table for report tracking
  - Unique index on (userId, ccCampaignId)
- [x] Campaign sync function (`src/lib/constantcontact/sync.ts`)
  - Upsert logic (insert new, update existing)
  - Preserves `firstSeenAt`, updates `lastUpdatedAt`
  - Returns detailed sync results
- [x] API endpoint: `GET /api/cc/sync`
  - Manual sync trigger
  - Returns counts and errors
- [x] UI updates
  - "Sync Campaigns" button on home page
  - Campaign count display
- [ ] Test with real Constant Contact account (scheduled with friend)
  - Verify all campaigns fetched
  - Check data completeness
  - Validate performance metrics

**Deliverable:** ✅ Can fetch and cache all historical campaign data with performance metrics

---

#### Day 3-4: Analysis Logic (NEXT)
**Goal:** Extract actionable insights from campaign data

**Note:** Waiting for real campaign data to test and validate analysis logic. Will work with friend's account to ensure analysis functions produce accurate insights.

**Tasks:**
- [ ] Create `src/lib/analysis/timeOfDay.ts`
  - Parse sent timestamps
  - Group by day of week + hour
  - Calculate average open/click rates per time slot
  - Identify best performing times
  - Return: `{ bestDays: [], bestHours: [], recommendations: [] }`

- [ ] Create `src/lib/analysis/subjectLines.ts`
  - Analyze length (short: <40 chars, medium: 40-60, long: >60)
  - Detect numbers (yes/no)
  - Detect question marks
  - Detect urgency words ("now", "today", "limited")
  - Detect emojis
  - Correlate features with open rates
  - Return: `{ patterns: [], recommendations: [] }`

- [ ] Create `src/lib/analysis/insights.ts`
  - Orchestrate all analyses
  - Combine results
  - Generate prioritized recommendations
  - Return structured JSON:
    ```typescript
    {
      summary: {
        totalCampaigns: number,
        avgOpenRate: number,
        avgClickRate: number,
        dateRange: { start: Date, end: Date }
      },
      timeOfDay: { ... },
      subjectLines: { ... },
      recommendations: [
        { priority: 'high' | 'medium' | 'low', title: string, description: string }
      ]
    }
    ```

**Deliverable:** Given campaign data, produce structured insights JSON

---

#### Day 5: Podcast Generation
**Goal:** Convert insights into conversational podcast

**Tasks:**
- [ ] Create `src/lib/podcast/script.ts`
  - Template for two-voice conversation
  - Host: Analytical, authoritative (Voice: "echo")
  - Co-host: Engaging, asks questions (Voice: "nova")
  - Structure:
    1. Introduction (30s) - "Hey, let's dive into your data..."
    2. Key Finding #1: Time of Day (2-3 min)
    3. Key Finding #2: Subject Lines (2-3 min)
    4. Quick Wins (2 min) - Easy recommendations
    5. Conclusion (1 min) - Summary + next steps
  - Fill template with insights data
  - Natural language, conversational tone
  - Return: Array of `{ speaker: 'host' | 'cohost', text: string }`

- [ ] Create `src/lib/podcast/generate.ts`
  - Function: `generatePodcast(script, insights): Promise<{ audioUrl: string, transcript: string }>`
  - Call OpenAI TTS for each line
  - Use different voices (echo/nova)
  - Concatenate audio segments
  - Add 1s pauses between speakers
  - Upload to Vercel Blob Storage
  - Generate markdown transcript
  - Return URLs

**Deliverable:** Insights JSON → 10-minute podcast audio + transcript

---

### Week 2: Job Queue & UI

#### Day 1-2: Inngest Setup
**Goal:** Orchestrate long-running analysis pipeline

**Tasks:**
- [ ] Install Inngest: `pnpm add inngest`
- [ ] Create `/src/app/api/inngest/route.ts`
  - Inngest webhook handler
- [ ] Create `/src/inngest/functions/generateInsights.ts`
  - Inngest function: `"insights/generate"`
  - Steps:
    1. Update job status → "processing" (0%)
    2. Fetch campaigns → 20%
    3. Fetch stats → 40%
    4. Run analysis → 60%
    5. Generate podcast → 80%
    6. Upload files → 90%
    7. Send email → 95%
    8. Update job status → "completed" (100%)
  - Error handling (mark job as "failed")
  - Retry logic (3 attempts)

- [ ] Create `/src/inngest/functions/sendCompletionEmail.ts`
  - Inngest function: `"insights/notify"`
  - Send email via Resend
  - Include link to results page
  - Podcast download link

**Deliverable:** Background pipeline that runs async and updates progress

---

#### Day 3-4: API & Database
**Goal:** API routes for job management

**Tasks:**
- [ ] Add Drizzle schema (`src/db/schema.ts`):
  ```typescript
  export const insightsJobs = pgTable('insights_jobs', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    type: text('type').notNull().default('full'), // 'full' or 'weekly'
    status: text('status').notNull().default('pending'), // pending/processing/completed/failed
    progress: integer('progress').default(0), // 0-100
    resultsUrl: text('results_url'),
    transcriptUrl: text('transcript_url'),
    insightsData: text('insights_data'), // JSON string
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    completedAt: timestamp('completed_at', { mode: 'date' }),
  });
  ```

- [ ] Run migration: `pnpm drizzle:generate && pnpm drizzle:migrate`

- [ ] Create `POST /api/insights/generate`
  - Check auth (session required)
  - Check CC connection (must have tokens)
  - Create job record in DB (status: "pending")
  - Trigger Inngest event: `inngest.send({ name: "insights/generate", data: { jobId, userId } })`
  - Return: `{ jobId }`

- [ ] Create `GET /api/insights/status/:jobId`
  - Check auth (must own job)
  - Fetch job from DB
  - Return: `{ status, progress, resultsUrl?, errorMessage? }`

- [ ] Create `GET /api/insights/:jobId`
  - Check auth (must own job)
  - Fetch complete job data
  - Return: Full insights + URLs

**Deliverable:** REST API for insights job management

---

#### Day 5: UI
**Goal:** User interface for insights generation

**Tasks:**
- [ ] Update home page (`src/app/page.tsx`)
  - Add "Generate Full Report" button (prominent)
  - Shows last generation date (if any)
  - Disable if already processing

- [ ] Create `/src/app/insights/[jobId]/page.tsx`
  - Fetch job status on load
  - Poll every 5s while status = "processing"
  - Show progress bar (0-100%)
  - Show current step ("Fetching campaigns...")
  - When complete:
    - Audio player (HTML5 `<audio>`)
    - Transcript (collapsible)
    - Key findings cards (visual summary)
    - Download button
    - Share button (future)

- [ ] Create loading states
  - Skeleton loaders
  - Progress animations
  - Estimated time remaining

**Deliverable:** Full user experience from generation → results

---

### Week 3: Testing & Deployment

#### Day 1-2: Testing
**Goal:** Validate end-to-end with real data

**Tasks:**
- [ ] Test with real Constant Contact account
  - Multiple campaigns (10+)
  - Various send times
  - Different subject line patterns
- [ ] Verify insights accuracy
  - Manually check time-of-day findings
  - Manually check subject line patterns
- [ ] Test error scenarios
  - Expired CC token → refresh works
  - API rate limiting → graceful handling
  - Inngest failures → retries work
- [ ] Test edge cases
  - No campaigns → graceful message
  - Only 1 campaign → still generates insights
  - Very old campaigns → date handling

**Deliverable:** Validated, bug-free pipeline

---

#### Day 3: Documentation
**Goal:** Up-to-date docs for development & deployment

**Tasks:**
- [ ] Update README.md
  - Add insights feature description
  - Environment variables
  - Setup instructions
- [ ] Update devlog.md
  - Document insights implementation
  - Architecture decisions
  - Lessons learned
- [ ] Create user guide (optional)
  - How to generate insights
  - How to interpret results
  - FAQ

---

#### Day 4-5: Production Deployment
**Goal:** Deploy to Vercel, ready for first customer

**Tasks:**
- [ ] Set up Inngest production environment
  - Create production workspace
  - Deploy Inngest functions
  - Configure webhooks
- [ ] Add production env vars to Vercel
  - `OPENAI_API_KEY`
  - `INNGEST_EVENT_KEY`
  - `INNGEST_SIGNING_KEY`
  - `RESEND_API_KEY`
  - All existing CC/auth vars
- [ ] Deploy to Vercel
  - Push to `main` branch
  - Verify deployment
- [ ] End-to-end production test
  - Sign in with real account
  - Connect CC
  - Generate insights
  - Verify podcast plays
  - Check email notification
- [ ] Monitoring setup
  - Vercel logs
  - Inngest dashboard
  - Error tracking (Sentry optional)

**Deliverable:** Live production app, ready for beta users

---

## Phase 2: Monetization (Week 4-5)

### Goal
Convert free users to paying subscribers

### Features
1. **Stripe Integration**
   - Subscription plans (Starter: $29/mo, Pro: $49/mo)
   - Checkout flow
   - Customer portal (manage subscription)
   - Webhook handling (subscription.created, subscription.cancelled)

2. **Paywall**
   - Free tier: 1 report/month
   - Paid tier: Unlimited reports + weekly pulses
   - Gate insights generation behind subscription check

3. **Pricing Page**
   - Clear value proposition
   - Feature comparison table
   - Testimonials (once we have them)

### Implementation
- Add `subscriptions` table to DB
- Create Stripe customer on signup
- Add subscription status checks to API routes
- Build pricing page (`/pricing`)
- Build checkout page (`/checkout`)
- Implement webhook handler (`/api/webhooks/stripe`)

---

## Phase 3: Recurring Insights (Week 6-7)

### Goal
Deliver weekly value to subscribers

### Features
1. **Weekly Pulse Podcast**
   - 5-minute update
   - Covers last 7 days of campaigns
   - Quick wins + trends
   - Comparison to previous week

2. **Automated Scheduling**
   - Inngest cron job (every Monday 9am)
   - For all active subscribers
   - Email with podcast link
   - Push notification (future)

3. **Trend Analysis**
   - Compare current week vs. previous week
   - Highlight improvements/declines
   - Track metrics over time

### Implementation
- Create weekly analysis logic (subset of full analysis)
- Inngest cron function (`"insights/weekly"`)
- Update podcast script template (shorter version)
- Email template for weekly updates
- Add historical data tracking

---

## Phase 4: Enhancement (Ongoing)

### Features (Prioritized)
1. **List Segmentation Recommendations** (High Value)
   - Analyze which lists perform best
   - Recommend segmentation strategies
   - Show engagement by list

2. **Historical Tracking** (Medium Value)
   - Dashboard showing trends over time
   - Charts: open rates, click rates, send frequency
   - Month-over-month comparisons

3. **Manual Regeneration** (Low Complexity)
   - "Generate New Report" anytime
   - Rate limiting (1/day for free, unlimited for paid)

4. **Shareable Links** (Marketing Value)
   - Public podcast links (optional)
   - Embed on websites
   - Social sharing

5. **Dashboard Polish** (UX Improvement)
   - Better visualizations
   - More interactive elements
   - Mobile optimization

---

## Success Metrics

### MVP Success (Phase 1)
- ✅ 1 user completes full insights generation
- ✅ Podcast generates successfully
- ✅ User finds insights actionable (interview/feedback)
- ✅ Pipeline runs reliably (<5% error rate)

### Monetization Success (Phase 2)
- 🎯 10 paying subscribers within 30 days
- 🎯 <10% churn rate
- 🎯 $290+ MRR

### Growth Success (Phase 3+)
- 🎯 50 paying subscribers within 90 days
- 🎯 Weekly active usage >80%
- 🎯 NPS >40

---

## Technical Debt & Future Considerations

### Known Limitations (MVP)
- Single user per CC account (no team accounts)
- English only
- Constant Contact only (no Mailchimp, etc.)
- No mobile app
- Limited historical data (no time-series DB)

### Future Integrations
- Mailchimp
- SendGrid
- HubSpot
- ActiveCampaign

### Scalability Considerations
- Current: Vercel Postgres (10K rows free tier)
- Future: Migrate to dedicated Postgres or time-series DB
- Current: OpenAI TTS (pay-per-use)
- Future: Consider self-hosted TTS for cost optimization

---

## Open Questions

1. **Podcast voices:** Test and finalize voice selection (echo + nova?)
2. **Email copy:** Notification email tone and content
3. **Pricing:** $29 or $49/mo? Test with beta users
4. **Free tier:** 1 report/month or trial period only?
5. **Analytics:** What metrics do we track internally?

---

## Next Immediate Steps

1. ✅ Plan documented (this file)
2. ✅ Build CC API client with pagination and rate limiting
3. ✅ Database schema for campaigns and insights reports
4. ✅ Campaign sync function with upsert logic
5. 🔨 Test data pipeline with real Constant Contact account (scheduled with friend)
6. ⏳ Build analysis logic (time-of-day, subject lines)
7. ⏳ Podcast script generation and TTS integration

---

**Last Updated:** 2025-01-30
**Status:** Data pipeline complete, waiting for real data to test. Analysis logic is next priority.
