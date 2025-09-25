# **App Name**: LaederHub

## Core Features:

- Landing Page: Static landing page with hero section, services, about, contact, and a 'Launch Hub' button linking to /hub.
- Authentication Flow: Firebase Authentication with Google Sign-in and Email/Password options. Redirects to /login if the user is not authenticated when accessing /hub.
- Chat Interface: ChatGPT-style chat interface with a scrollable chat history and fixed input box at the bottom. Typing indicator displayed while waiting for the backend.
- Source Indicator Bar: Display connected MCP sources with icons and status indicators (✅ / ⏳ / ❌). Mock data for MVP, later to be updated with backend data.
- API Client Hook: Fetch wrapper with Firebase ID token attached in the Authorization header. Handles communication with the FastAPI backend.

## Style Guidelines:

- Primary color: HSL(210, 65%, 50%) - A vibrant blue to convey trust and reliability, reflecting a tech-forward yet approachable brand.
- Background color: HSL(210, 20%, 95%) - A light, desaturated blue creates a clean and calming backdrop, ensuring readability and focus.
- Accent color: HSL(180, 55%, 55%) - A teal tone for interactive elements like buttons and links, providing a subtle contrast and highlighting key actions.
- Body font: 'Inter', a sans-serif font known for its readability, and its clean, modern appearance suitable for body text.
- Headline font: 'Space Grotesk', a bold sans-serif with geometric forms to be used in headlines
- Simple, line-based icons for the source indicator bar to clearly communicate connection statuses.
- Full-height flex layout for the chat interface to maximize screen usage.
- Subtle animations for loading states and transitions to improve user experience without being distracting.