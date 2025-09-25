<<<<<<< HEAD
# LaederHub

This is a Next.js project for LaederHub, built with Firebase and FastAPI.

It includes:
1.  A **static landing page**.
2.  An **auth-protected hub application** with a chat interface.

## Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- `pnpm` package manager (`npm install -g pnpm`)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)

### 2. Firebase Setup

1.  Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2.  Enable **Firebase Authentication** with "Google" and "Email/Password" sign-in providers.
3.  Enable **Firebase Hosting**.
4.  From your project's settings, get your Firebase configuration object. It will look like this:
    ```javascript
    const firebaseConfig = {
      apiKey: "AIza...",
      authDomain: "your-project-id.firebaseapp.com",
      projectId: "your-project-id",
      storageBucket: "your-project-id.appspot.com",
      messagingSenderId: "...",
      appId: "...",
    };
    ```
5.  Copy this configuration into `src/lib/firebase.ts`, replacing the placeholder values.

### 3. Local Development

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Run the development server:**
    ```bash
    pnpm dev
    ```

    The application will be available at [http://localhost:9002](http://localhost:9002).

## Deployment

This project is configured for deployment to Firebase Hosting.

1.  **Login to Firebase:**
    ```bash
    firebase login
    ```

2.  **Select your Firebase project:**
    (If you haven't already)
    ```bash
    firebase use --add
    ```
    And select the project you created.

3.  **Build and Deploy:**
    ```bash
    firebase deploy --only hosting
    ```

This command will build the Next.js application and deploy it to Firebase Hosting. The `firebase.json` file is already configured to serve the Next.js app correctly.
=======
# Laederhub

Laederhub is an MVP backend that helps small businesses unify SaaS data silos and get immediate analytics insights. The monorepo is centered on a FastAPI service that authenticates users via Firebase, captures intake conversations with an LLM orchestrator, connects to Constant Contact via MCP clients, and stages data in Google Cloud for downstream analytics.

## Architecture Overview
- **Authentication**: Incoming requests present Firebase ID tokens that are verified server-side.
- **Intake Chat**: An orchestrated LLM workflow captures user goals and updates their profile.
- **Connections**: The Constant Contact integration is stubbed via an MCP client to demonstrate OAuth handshakes and data pulls.
- **Analytics Pull**: Example route shows how campaign metrics would land in a staging table in BigQuery after persisting raw JSON to GCS.
- **Suggestions**: Hard-coded KPI suggestions illustrate later LLM-driven analysis.

## Services
- `services/api`: FastAPI application with modular routers, configuration, logging, security, data, and LLM orchestration helpers.

## Getting Started
1. Duplicate `.env.example` to `.env` and populate Firebase, GCP, and MCP configuration values.
2. Install dependencies with Poetry (or your preferred tool) and activate the environment.
3. Run `scripts/dev_bootstrap.sh` to export environment variables and start the FastAPI app.
4. Hit `/intake/chat` to simulate an intake conversation, `/connects/constant-contact/start` to initiate a dummy connection, and `/analytics/pull` to walk through the analytics pipeline.

## Testing
Run `pytest` from the repository root. The suite currently includes basic smoke tests to validate application creation.
>>>>>>> main
