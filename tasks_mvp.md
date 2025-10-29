# LaederHub MVP Task List

This file tracks the **minimum viable product (MVP)** build:  
Authenticated chat with LLM, persistence, and Constant Contact integration.

---

## Phase 1 – Authentication

- [ ] **Frontend**
  - [ ] Implement `/login` page with Google OAuth via NextAuth.
  - [ ] Configure `SessionProvider` in `_app.tsx` so `useSession` works in client components.
  - [ ] Add route protection: `/hub/*` pages redirect to `/login` if not authenticated.
  - [ ] Verify sign-in/out flow works on Vercel.

- [ ] **Backend**
  - [ ] Replace Firebase token validation with NextAuth JWT verification (`NEXTAUTH_SECRET`).
  - [ ] Implement `/auth/verify` route for frontend to test token handoff.
  - [ ] Update middleware so all `/intake`, `/connects`, `/analytics` routes require JWT.

---

## Phase 2 – Chat

- [ ] **Frontend**
  - [ ] Create `/hub/chat` route.
  - [ ] Flesh out `ChatPanel`, `SourceIndicator`, `Header` components with local state.
  - [ ] Wire user messages → POST `/intake/chat`.
  - [ ] Stream assistant replies into chat UI.

- [ ] **Backend**
  - [ ] Implement `/intake/chat` endpoint.
  - [ ] Add `services/llm/orchestrator.py` to call OpenAI/Vertex API.
  - [ ] Return assistant response in streaming or batched mode.

---

## Phase 3 – Persistence

- [ ] **Backend**
  - [ ] Store chat messages in Firestore under `users/{user_id}/chats/{session_id}/messages`.
  - [ ] Store connector tokens in Firestore under `users/{user_id}/connects/{provider}`.
  - [ ] Add retrieval logic for past chats (optional for MVP).

---

## Phase 4 – Constant Contact MCP Integration

- [ ] **Backend**
  - [ ] Flesh out `services/mcp/client.py` with OAuth and token exchange.
  - [ ] Add endpoints:
    - `/connects/cc/auth` → start OAuth flow.
    - `/connects/cc/callback` → handle token exchange.
    - `/connects/cc/contacts` → fetch recent contacts/campaigns.
  - [ ] Persist tokens in Firestore.

- [ ] **Frontend**
  - [ ] Add “Connect Constant Contact” button in `/hub/chat`.
  - [ ] Handle redirect through OAuth flow.
  - [ ] Display connection status (connected / not connected).

---

## Phase 5 – Insights

- [ ] **Backend**
  - [ ] Add helper to fetch CC campaign stats.
  - [ ] Pipe data into `services/llm/orchestrator.py` for summarization.
  - [ ] Return insights in natural language.

- [ ] **Frontend**
  - [ ] Display insights inline in chat (LLM response).
  - [ ] Optionally add a “Insights” sidebar for quick metrics.

---

## Phase 6 – Storage Prep for Analytics

- [ ] Expose Firestore → BigQuery pipeline (manual script is fine for MVP).
- [ ] Confirm CC data can be staged for downstream analytics.

---

## Deliverable Criteria

✅ Login with Google works, `/hub/chat` requires authentication.  
✅ User can chat with LLM, messages are persisted.  
✅ User can connect Constant Contact account and pull campaign data.  
✅ Chat can reference CC data for basic insights.  
✅ Data staging pipeline exists for export to BigQuery.
