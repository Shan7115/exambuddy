# 🎓 ExamBuddy — Karunya University NPTEL Travel Coordination

> A production-quality web application designed for **Karunya University** students taking **NPTEL exams**.
> Students upload their NPTEL hall ticket, autonomous AI agents extract details, find classmates traveling to the same exam center, date, and session, and coordinate the entire trip (meetup point, departure time, and live group chat with an Ask Bot reminder).

Designed with an **Apple-website light theme** (calm, spacious, high-contrast, `#FBFBFD` background, `#1D1D1F` text, `#0071E3` accent, SF Pro / Inter typography, pill buttons, frosted translucent navigation, subtle shadows, and responsive phone-first layouts).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom Apple light design system)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) (Restrained, responsive motion with `prefers-reduced-motion` compliance)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Service Role writes, Realtime WebSocket feeds)
- **AI Agents**: [Google Gemini API](https://ai.google.dev/) (Full-resolution two-pass vision extraction, structured JSON output, meetup suggestions)
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
git clone https://github.com/Shan7115/exambuddy.git
cd exambuddy
npm install
```

### 3. Database Schema Setup
1. In your **[Supabase Dashboard](https://supabase.com/dashboard)**, navigate to **SQL Editor**.
2. Open [supabase/schema.sql](./supabase/schema.sql), copy its contents, and click **Run**.
   - This creates all tables (`users`, `otp_codes`, `tickets`, `groups`, `group_members`, `messages`), performance indexes, RLS read policies, and enables the `supabase_realtime` publication.

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
GEMINI_MODEL=gemini-2.5-flash
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

## ✨ Key Features & Architecture

### 1. Two-Pass Intake Agent
- **Full-Resolution Processing**: Uploaded tickets are processed at full resolution without heavy compression.
- **Pass 1 (Verbatim Transcription)**: Extracts line-by-line raw text.
- **Pass 2 (Structured JSON Extraction)**: Strict JSON schema extraction with `temperature: 0`. Unread fields return `null` instead of hallucinating.
- **Normalized Dates & Sessions**: Automatically normalizes dates to ISO `YYYY-MM-DD` and session to `forenoon` or `afternoon`.
- **Debug View & Warning Badges**: The confirmation card highlights unread fields with an amber badge ("Needs entry"), remains fully editable, and features a Debug View toggle showing the raw transcript and JSON.

### 2. Opt-in Travel Groups
- **No Automatic Grouping**: After ticket confirmation, students view "People going to your center" (first name and pickup area).
- **Strictly Opt-in**: Students can tap **Start a travel group** or **Join** an open squad, and can leave at any time.
- **Zero Cost/Fare Estimates**: All taxi, auto, and vehicle fare estimates have been removed.
- **User-Editable Meetup**: Group members edit and save their meetup point and departure time.
- **AI Meetup Spot Suggestions**: Optional button asking Gemini for central Coimbatore landmarks based on members' pickup areas (without prices).

### 3. Realtime Group Chat
- **Live Supabase Realtime**: Messages appear across all devices with sub-second latency, backed by a 2-second polling fallback.
- **Clean System Notifications**: Coordinator bot does not post autonomous messages; events such as joins/leaves appear as lightweight centered system pills.
- **Ask Bot Summary**: Dedicated "Ask Bot" button posts a single structured summary of the exam center, date, session, and member-configured meetup point and time.

### 4. Explore Travel Options
- Accessible from the main navigation and dashboard.
- Students without a hall ticket can search by exam center name (with fuzzy/tolerant matching), exam date, and optional session filter to find matching classmates and open squads.

---

## 🔒 Security & Privacy
- **Karunya Student Scoping**: Sign-in is restricted to Karunya students (`@karunya.edu.in`).
- **Data Minimization**: Only extracted ticket metadata is stored in Postgres; uploaded raw image files are processed in-memory and immediately freed.
- **Cookie Security**: Auth cookies are signed (`httpOnly`, `SameSite=Lax`, encrypted via `jose`).
