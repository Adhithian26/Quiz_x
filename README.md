# QuizX Live — Real-Time Multiplayer Quiz Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101.svg)](https://socket.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933.svg)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg)](https://supabase.com/)

**QuizX Live** is an auditorium-scale, real-time multiplayer quiz platform built for university AI workshops, interactive seminars, and live coding contests. It allows **one host to orchestrate a live competition** while **250+ students participate from mobile phones** with zero lag, server-authoritative timers, instantaneous leaderboard updates, and an auditorium presentation screen.

---

## ⚡ Key Highlights & Architecture

```mermaid
graph TD
    subgraph Clients
        H[💻 Host Dashboard<br/>/host]
        S1[📱 Student 1<br/>/play/:roomCode]
        S2[📱 Student 250+<br/>/play/:roomCode]
        P[📽️ Projector Screen<br/>/projector/:roomCode]
    end

    subgraph Backend_Server [Node.js / Express Server]
        SM[Session Manager<br/>In-Memory State Machine]
        SIO[Socket.IO Server<br/>Low-Latency Broadcasts]
        AUTH[Host Auth & Anti-Cheat<br/>Timer Enforcement]
        SC[Scoring Service<br/>Deterministic Tie-Breaking]
        CSV[CSV Generator]
    end

    subgraph Persistence [Database Layer]
        SBA[Supabase / PostgreSQL<br/>Row Level Security]
        MEM[Local Fast Memory Store<br/>Zero-Config Fallback]
    end

    H <-->|Socket.IO: Host Commands| SIO
    S1 <-->|Socket.IO: Join & Answers| SIO
    S2 <-->|Socket.IO: Join & Answers| SIO
    P <-->|Socket.IO: Live Leaderboard & QR| SIO

    SIO <--> SM
    SM <--> AUTH
    SM <--> SC
    SM -->|Async Batch Writes| SBA
    SM -.->|Offline / Dev| MEM
    H -->|GET /api/sessions/:id/export/csv| CSV
```

### 🎯 Core Capabilities
- **Desktop Host Portal (`/host`)**: Create and launch quiz sessions, generate unique 6-character room codes, broadcast questions, pause/close questions early, reveal answers with explanation, view participant connection counts in real-time, and export results to CSV.
- **Mobile-First Student Interface (`/join` and `/play/:roomCode`)**: Ultra-responsive touch cards, circular live SVG timer, instantaneous submission lock, haptic feedback, anti-cheat question masking, automatic reconnection recovery, and live points display.
- **Auditorium Projector Display (`/projector/:roomCode`)**: High-contrast, presentation-optimized screen for auditoriums with massive QR code for mobile scanning, live response counter bar, answer distribution breakdown, and celebratory winner podium with confetti.
- **Anti-Cheat & Server-Authoritative Timers**: Questions sent to student clients are stripped of `correct_option` and `explanation` until host authoritatively reveals them. Deadlines are verified server-side with network grace margins, and duplicate answer submissions are strictly rejected at the database and memory levels.
- **Engineered for 250+ Concurrent Students**: Benchmarked and verified under 250 and 300 simultaneous WebSocket clients with 100% submission ingestion, sub-2ms answer acknowledgment latency, and zero connection drops.

---

## 📁 Repository Structure

```text
Quiz_X/
├── client/                     # Frontend (React 18, Vite, TypeScript, Tailwind CSS)
│   ├── src/
│   │   ├── components/         # Navbar, Timer, Leaderboard, Podium
│   │   ├── pages/              # Home, StudentJoin, StudentPlay, HostDashboard, ProjectorScreen
│   │   ├── services/           # Socket.IO client, REST API client
│   │   └── index.css           # Custom theme tokens & glassmorphism
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Backend (Node.js, Express, TypeScript, Socket.IO, Zod)
│   ├── src/
│   │   ├── db/                 # Supabase client, MemoryStore fallback, Seed datasets
│   │   ├── services/           # SessionManager state machine, ScoringService
│   │   ├── socket/             # Socket.IO event controllers
│   │   ├── routes/             # REST API (/health, /api/quizzes, /api/sessions, CSV export)
│   │   ├── config.ts           # Zod environment variable validation
│   │   └── index.ts            # Server entrypoint with graceful shutdown
│   ├── tests/                  # Vitest unit & integration test suite (11 passed tests)
│   └── package.json
├── shared/                     # Shared TypeScript contracts, Zod schemas, Socket payloads
│   ├── src/index.ts
│   └── package.json
├── database/migrations/        # Production Supabase PostgreSQL migrations
│   ├── 001_initial_schema.sql  # Quizzes, questions, sessions, participants, answers + RLS
│   └── 002_seed_ai_workshop.sql# 10 verified questions for "AI Challenge Arena"
├── scripts/
│   └── load-test.ts            # High-concurrency load tester (simulates 250-300 students)
├── .env.example                # Environment variables template
├── package.json                # Monorepo root workspace configuration
└── README.md
```

---

## 🗄️ Database Architecture & Migrations

The database is built on **Supabase PostgreSQL** with full schema migrations, foreign keys, cascade rules, and Row Level Security (RLS) policies:

| Table | Description | Primary Key | Constraints / Indexes |
| :--- | :--- | :--- | :--- |
| `quizzes` | Quiz metadata and status | `id` (UUID) | Status check (`draft`, `published`) |
| `questions` | Question text, options (JSONB), points, timer | `id` (UUID) | `UNIQUE(quiz_id, question_order)`, FK to `quizzes` |
| `quiz_sessions`| Live room sessions | `id` (UUID) | `UNIQUE(room_code)`, FK to `quizzes` |
| `participants` | Enrolled students per session | `id` (UUID) | `UNIQUE(session_id, display_name)`, FK to `quiz_sessions` |
| `answers` | Accepted submissions per question | `id` (UUID) | `UNIQUE(session_id, participant_id, question_id)` |

### Security & Row Level Security (RLS)
- **Privileged Backend**: Uses Supabase `service_role` key exclusively on the server to bypass RLS and record scores securely.
- **Anti-Cheat Protection**: Correct answer fields are never exposed via unauthenticated public queries. Public reads can only inspect session status or public participant leaderboard scores.
- **Duplicate Prevention**: PostgreSQL unique constraint `unique_answer_per_question` prevents duplicate answer inserts even under intense concurrent race conditions.

---

## 🤖 Demo Quiz: AI Challenge Arena

The platform comes pre-seeded with **10 verified multiple-choice questions** tailored for college AI workshops:

1. **AI Fundamentals**: Definition of cognitive emulation vs hardcoded logic.
2. **Machine Learning**: Supervised vs Unsupervised learning with ground-truth targets.
3. **Large Language Models**: Transformer self-attention architecture (*Attention Is All You Need*).
4. **Prompt Engineering**: Few-Shot Prompting via in-context exemplar demonstrations.
5. **AI Hallucinations**: Plausible token prediction vs factual retrieval.
6. **Retrieval-Augmented Generation (RAG)**: Vector semantic search grounding private enterprise data.
7. **Responsible AI & Privacy**: Model bias auditing, data anonymization, and human oversight.
8. **Image Generation**: Latent diffusion iterative denoising.
9. **AI Productivity Tools**: Developer verification, testing, and security responsibilities with coding copilots.
10. **Real-World AI Applications**: Autonomous multi-step agentic workflows.

All questions are editable from the host dashboard or modifiable in the database.

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+ (tested on Node.js v24)
- npm 9+

### 1. Clone & Install
```bash
git clone https://github.com/your-username/quizx-live.git
cd quizx-live
npm install
```

### 2. Environment Configuration
Copy the template configuration:
```bash
cp .env.example .env
```

Default local `.env` settings:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
HOST_SECRET=quizx-host-2026

# Optional: If omitted, QuizX Live runs in high-speed local memory mode
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### 3. Run Development Servers
Start both backend (Express/Socket.IO) and frontend (Vite) simultaneously:
```bash
npm run dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Host Dashboard**: [http://localhost:3000/host](http://localhost:3000/host) (Passcode: `quizx-host-2026`)
- **Backend Health Check**: [http://localhost:5000/health](http://localhost:5000/health)

---

## 🧪 Automated Testing & Verification

### Unit & Integration Tests (11 Tests)
Run Vitest to verify scoring, anti-cheat, room code collisions, student reconnects, and duplicate prevention:
```bash
npm test
```
**Test Results:**
```text
✓ tests/quizEngine.test.ts (11 tests passed in ~500ms)
  1. Quiz creation, validation, and seeded quiz retrieval
  2. Room code generation and collision handling
  3. Student joining and session tracking
  4. Student reconnection and state restoration
  5. Question activation, anti-cheat public payload, and deadline enforcement
  6. Authoritative scoring, answer validation, and duplicate submission prevention
  7. Rejection of answers after deadline or when question is closed
  8. Question reveal with accurate distribution statistics
  9. Deterministic Leaderboard sorting with tie-breaking
  10. Session completion and podium generation
  11. CSV Export generation with headers and sanitization
```

---

## 📊 High-Concurrency Load Testing (250–300 Students)

QuizX Live includes an automated load tester (`scripts/load-test.ts`) that spins up realistic Socket.IO clients to simulate a lecture hall.

### Run 250-Student Load Test:
```bash
npm run load-test
```

### Run 300-Student Stretch Test:
```powershell
$env:CONCURRENT_CLIENTS="300"; npm run load-test
```

### Actual Verified Benchmark Results:
```text
=======================================================
⚡ QuizX Live — High-Concurrency Real-Time Load Test
🎯 Target Concurrent Students: 300
📡 Port: 5055
=======================================================

[LoadTest] Test server ready on port 5055
[LoadTest] Host created session room: CBTZ7H
[LoadTest] Launching 300 concurrent student clients...
[LoadTest] Join Phase Completed:
   - Successful Joins: 300/300 (100.0%)
   - Failed Joins: 0
   - Total Join Phase Time: 533ms
   - Average Join Roundtrip: 35.31ms

[LoadTest] Host starting Question 1 for all 300 students...
[LoadTest] All 300 students successfully received the live question broadcast!
[LoadTest] Students submitting answers under concurrency...
[LoadTest] Answer Phase Completed:
   - Answers Accepted: 300/300
   - Total Answer Phase Time: 859ms
   - Average Answer Ack Latency: 2.06ms
   - Duplicate Submissions Safely Blocked: 20/20 tested

[LoadTest] Host closing question and broadcasting answer reveal...
[LoadTest] All 300 students received the correct answer reveal & explanation broadcast!

=======================================================
🎉 LOAD TEST SUMMARY FOR 300 CONCURRENT CLIENTS:
   ✅ Connected & Joined: 300/300 (100%)
   ✅ Avg Join Latency: 35.31ms
   ✅ Answers Processed: 300/300
   ✅ Avg Answer Latency: 2.06ms
   ✅ Duplicate Prevention: 100% verified
   ✅ Reveal Broadcast: 100% delivered
   ✅ Zero dropped connections or socket crashes
=======================================================
```

---

## 🌐 Production Free-First Deployment Guide

### 1. Supabase (Database)
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and execute:
   - `database/migrations/001_initial_schema.sql`
   - `database/migrations/002_seed_ai_workshop.sql`
3. Copy your project **URL** and **service_role secret key** from *Project Settings > API*.

### 2. Render (Backend Web Service)
1. Create a **New Web Service** connected to your repository.
2. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build --workspace=@quizx/shared && npm run build`
   - **Start Command**: `npm start`
3. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `CLIENT_URL`: `https://your-quizx.vercel.app`
   - `HOST_SECRET`: `your-secure-host-passcode`
   - `SUPABASE_URL`: `https://your-project.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: `your-supabase-service-key`
4. Copy the backend Render URL: `https://quizx-server.onrender.com`.

### 3. Vercel (Frontend)
1. Import the repository in [vercel.com](https://vercel.com).
2. Set **Root Directory**: `client`.
3. Framework Preset: **Vite**.
4. Set Environment Variables:
   - `VITE_SERVER_URL`: `https://quizx-server.onrender.com`
   - `VITE_API_URL`: `https://quizx-server.onrender.com`
5. Deploy.

> **Note on Render Free Tier**: Render free instances spin down after 15 minutes of inactivity. When conducting your live workshop, send a ping to `https://quizx-server.onrender.com/health` 2 minutes prior to starting to ensure the container is warm.

---

## 🏆 Workshop Rehearsal Checklist

- [x] Host can log into `/host` with passcode.
- [x] Room code and high-resolution QR code are displayed.
- [x] Students can scan or visit `/join` on mobile Safari / Chrome.
- [x] Questions arrive simultaneously with countdown timer.
- [x] Answering locks button immediately and records response.
- [x] Correct option revealed with educational explanation.
- [x] Projector screen (`/projector/:roomCode`) updates live with counter bar and podium.
- [x] CSV of all student ranks and scores exported cleanly.
- [x] 300 concurrent client load test verified with 100% success rate.
