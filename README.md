# 🎓 ExamBuddy — Karunya University NPTEL Travel Coordination

> A production-quality, multi-agent web application designed for **Karunya University** students taking **NPTEL exams**.
> Students upload their NPTEL hall ticket, autonomous AI agents extract details, match classmates traveling to the same exam center, date, and session, form a travel squad, and coordinate the entire trip (campus meetup point, departure time, transport, live cost split, and group chat with a Coordinator Bot).

Designed with an **Apple-website light theme** (calm, spacious, high-contrast, `#FBFBFD` background, `#1D1D1F` text, `#0071E3` accent, SF Pro / Inter typography, pill buttons, frosted translucent navigation, subtle shadows, and responsive phone-first layouts).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom Apple light design system)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) (Restrained, responsive motion with `prefers-reduced-motion` compliance)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Service Role writes, Realtime WebSocket feeds)
- **AI Agents**: [Google Gemini API](https://ai.google.dev/) (Vision extraction, transit routing, coordinator bot)
- **Session Management**: Encrypted `httpOnly` signed cookies via `jose`
- **Barcode Validation**: `@zxing/browser` & `@zxing/library`
- **Deployment**: [Vercel](https://vercel.com/) with one-click public URL

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- Node.js 18+ (tested on Node v20 & v24)
- npm or pnpm
- A Supabase account and project ([supabase.com](https://supabase.com))
- A Google Gemini API key ([aistudio.google.com](https://aistudio.google.com))

### 2. Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd exambuddy
npm install
```

### 3. Database Schema Setup
1. In your **[Supabase Dashboard](https://supabase.com/dashboard)**, navigate to **SQL Editor**.
2. Open [supabase/schema.sql](./supabase/schema.sql), copy its contents, and click **Run**.
   - This creates all 7 tables (`users`, `otp_codes`, `tickets`, `groups`, `group_members`, `messages`, `agent_events`), performance indexes, RLS read policies, and enables the `supabase_realtime` publication.

### 4. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in the credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-secret-or-service-role-key
GEMINI_API_KEY=your-google-gemini-key
GEMINI_MODEL=gemini-1.5-flash
SESSION_SECRET=your-secret-random-key-at-least-32-chars-long
DEMO_ADMIN_KEY=Karunya2026Reset9x
```

### 5. Seed Initial Demo Data
Populate the database with the 10 Karunya dummy students across 3 canonical centers:
```bash
npm run seed
```
*(Or paste [supabase/seed.sql](./supabase/seed.sql) into the Supabase SQL Editor and click **Run**).*

### 6. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 4-Device Live Presentation Guide

ExamBuddy is engineered for a live presentation across four phones/laptops simultaneously. Each presenter logs in with their preset credentials and tests the matching engine:

| Device | Presenter Name | Register No | Assigned Center | Session | Pickup Landmark | Intended Match Group |
|---|---|---|---|---|---|---|
| **Device 1** | Daniel Raj | `URK22CS1001` | Center A (iON Kovai Pudur) | Forenoon | Karunya Nagar (Campus Gate) | **Center A Squad (5 students)** |
| **Device 2** | Priya George | `URK22CS1002` | Center A (iON Kovai Pudur) | Forenoon | Gandhipuram | **Center A Squad (6 students)** |
| **Device 3** | Samuel Paul | `URK22AI1003` | Center A (iON Kovai Pudur) | Forenoon | Kovaipudur | **Center A Squad (7 students)** |
| **Device 4** | Nithya Menon | `URK22EC1004` | Center B (KGiSL Campus) | Afternoon | Singanallur | **Center B Squad (4 students)** |

### Flow for Each Device:
1. **Sign In**: Tap **"Sign in"** on the landing page. Click your assigned presenter preset (*P1*, *P2*, *P3*, or *P4*) to auto-fill the form, then tap **Continue**.
2. **Demo Code**: The 6-digit server-hashed OTP appears in the blue **Demo code banner**. Tap **Sign in** to verify.
3. **Upload Ticket**: Tap **Upload hall ticket**. Click your matching preset ticket (*ticket-1*, *ticket-2*, etc.) and click **Scan hall ticket with AI**.
4. **Agent Intake**: Watch the Intake Agent tick through layout analysis, canonical center mapping, and student identity verification.
5. **Confirm Details**: Tap **Confirm details** to save the ticket.
6. **My Trip & Squad Matching**: The Matching Agent automatically pairs you with classmates going to the same center & session, calculates the departure buffer, and updates the per-person split live.
7. **Group Room**: Tap **Open group room** to view the live squad chat, test optimistic messaging, and chat with the Coordinator Bot (e.g. type *"@bot reminder"*).

---

## 🔄 Instant Reset for Re-Runs

To reset the database between demo runs without touching the terminal:
- Click the **Reset Demo** icon in the navigation bar or footer.
- Enter your `DEMO_ADMIN_KEY` (`Karunya2026Reset9x`) and click **Reset Demo**.
- Or send a request:
```bash
curl -X POST "http://localhost:3000/api/demo/reset?key=Karunya2026Reset9x"
```
*This clears all live presentation test accounts, tickets, and messages, and resets the initial 10 dummy Karunya students and groups in under 2 seconds.*

---

## 🌐 Deploying to Vercel

### Step 1: Push to GitHub
```bash
git add .
git commit -m "ExamBuddy production release"
git push origin main
```

### Step 2: Import into Vercel
1. Log in to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your `exambuddy` repository and click **Import**.
3. In **Environment Variables**, add the 7 keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (`gemini-1.5-flash`)
   - `SESSION_SECRET`
   - `DEMO_ADMIN_KEY`
4. Click **Deploy**. Vercel will create an optimized production build and assign a public URL (e.g. `https://exambuddy.vercel.app`).

---

## 🏛️ Autonomous Multi-Agent System

ExamBuddy employs three server-side AI agents (in `/lib/agents`), each logging status events (`running`, `done`, `failed`) into the `agent_events` stream:

1. **Intake Agent** (`/lib/agents/intake-agent.ts`):
   - Uses Gemini Vision to extract name, register number, course title & code, center venue, date, and session.
   - Maps extracted venue text to canonical Coimbatore centers (`CANONICAL_EXAM_CENTERS`).
   - Validates candidate credentials against the signed-in session; rejects mismatched hall tickets.
   - Discards uploaded images immediately after extraction for complete student privacy.

2. **Matching Agent** (`/lib/agents/matching-agent.ts`):
   - Pairs students from Karunya University with identical canonical center, date, and session.
   - Synthesizes member pickup areas using Gemini to generate a central meetup spot, departure buffer time, transport recommendation, and total fare.

3. **Coordinator Agent** (`/lib/agents/coordinator-agent.ts`):
   - Automatically recalculates the per-person cost split whenever a student joins or leaves.
   - Posts welcome announcements to the group chat.
   - Responds to student queries with complete trip logistics and exam day checklists (printed admit card, original college ID).
