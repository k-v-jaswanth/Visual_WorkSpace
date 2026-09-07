# CanvasMeet — AI Collaborative Visual Workspace

An end-to-end, real-time collaborative workspace where teams meet, talk, and think together on a shared visual canvas. Built for modern product teams: live WebRTC audio/video, Socket.IO canvas synchronization, conversation-to-canvas AI engine, full Dark Mode & Light Mode support, and real database-backed authentication.

---

## Key Features

- **Real Database Authentication (No Demo Signups)**
  - Full user registration (`POST /api/auth/signup`) and sign in (`POST /api/auth/signin`).
  - Passwords securely hashed with `bcryptjs`.
  - JWT token-based session persistence and profile validation (`GET /api/auth/me`).
  - User avatars, unique colors, and authenticated room ownership.

- **Dark Mode & Light Mode**
  - Instant theme toggle between dark and light palettes.
  - Carefully tuned contrast tokens for canvas background, node cards, video grid, and text.
  - Theme preference persisted in `localStorage`.

- **Interactive AI Visual Canvas (ReactFlow)**
  - 6 Custom Node types:
    - **Goal Node**: Strategic target and milestones.
    - **Decision Node**: Architectural choices and agreed approaches.
    - **Task Node**: Action items with assignee tags, status, and priority badges (Critical, High, Medium, Low).
    - **Risk Node**: Potential bottlenecks, latency risks, and mitigations.
    - **Question Node**: Open questions and pending items.
    - **Idea Node**: Brainstorming proposals.
  - Visual edge connectors with directional arrows.
  - Manual creation toolbar (+ Goal, + Decision, + Task, + Risk, + Question, + Idea).
  - Real-time synchronization across all participants via Socket.IO.

- **Conversation-to-Canvas AI Engine**
  - Browser speech recognition (Web Speech API) with animated audio pulse.
  - OpenAI structured JSON analysis (`/api/ai/analyze`) when an API key is provided.
  - Intelligent zero-config NLP heuristic parser fallback when running without external API keys.
  - Synthesizes spoken discussions into linked visual cards on the canvas.

- **WebRTC Live Audio & Video**
  - Peer-to-peer WebRTC video mesh with Socket.IO signaling.
  - Mic mute/unmute, Camera on/off, and Screen sharing.
  - Live attendee presence indicators.

- **Dual-Driver Persistence Layer**
  - **PostgreSQL**: Used automatically when `DATABASE_URL` is configured (schema provided in `db/schema.sql`).
  - **Embedded Persistent Storage**: Automatically falls back to resilient JSON storage (`server/data/canvasmeet.db.json`) when PostgreSQL is not running locally. All users, rooms, canvas states, and messages persist permanently across restarts with zero external setup.

---

## Quick Start

### 1. Requirements
- Node.js 18+ (tested on Node.js 20 & 24)

### 2. Install Dependencies
```bash
npm install
```

### 3. (Optional) Configure Environment
Copy `.env.example` to `server/.env` if you want to use OpenAI or PostgreSQL:
```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/canvasmeet
OPENAI_API_KEY=your_key_here
```
*(If left empty, the application automatically uses the persistent local storage and built-in NLP engine!)*

### 4. Run Development Servers
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API & WebSockets: `http://localhost:4000`

---

## End-to-End User Flow

1. **Sign Up / Sign In**:
   - Register a real user account with your name, email, and password.
   - Or click one of the quick test shortcuts ("Test User 1 (Priya)", "Test User 2 (Sam)") to auto-fill and register.
2. **Dashboard / Workspace Hub**:
   - Create a new collaborative session with a title and meeting topic, or choose a starter template.
3. **Collaborative Room**:
   - Allow microphone / camera.
   - Click **Share Room** to copy the URL into another browser tab or device.
   - Speak or paste: *"We should launch the mobile beta next Friday. Priya owns design and UI polish, Sam owns backend infrastructure. The biggest risk is onboarding latency."*
   - Click **Structure Canvas** (sparkle button). AI organizes the discussion into Goals, Decisions, Tasks, and Risks with connecting relationships.
   - Drag, connect, or add nodes manually. All edits synchronize to every connected peer in real time!
   - Toggle between **Dark Mode** and **Light Mode** using the theme icon in the header.
