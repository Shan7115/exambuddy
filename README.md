# 🎓 ExamBuddy

> Production-quality web app for **Karunya University** students taking **NPTEL exams**.
> Upload your NPTEL hall ticket, let AI agents extract details, find classmates traveling to the same exam center, date, and session, form a travel squad, and coordinate the trip (meetup point, departure time, transport, cost split, and live group chat).

Designed with an **Apple-website light aesthetic** (calm, spacious, high-contrast, SF Pro / Inter typography, pill buttons, soft status colors).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Apple light design system)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Backend & Realtime**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime subscriptions, Service Role SDK)
- **AI Agents**: [Google Gemini API](https://ai.google.dev/) (Intake Vision Agent, Matching Agent, Coordinator Agent)
- **Session Management**: Encrypted `httpOnly` signed cookies via `jose`
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- Node.js 18+ (tested on Node v20 & v24)
- npm or pnpm
- A Supabase account and project ([supabase.com](https://supabase.com))
- A Google Gemini API key ([aistudio.google.com](https://aistudio.google.com))

### 2. Install Dependencies
```bash
npm install
```

### 3. Supabase Setup
1. Go to your Supabase project dashboard.
2. Open the **SQL Editor** tab.
3. Paste the contents of `supabase/schema.sql` and click **Run**.
   - This creates all tables (`users`, `tickets`, `groups`, `group_members`, `messages`, `agent_events`, `otp_codes`), indexes, and enables Realtime publications.
4. Copy your project credentials:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **Anon Key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY` from Settings -> API)

### 4. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in the values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GEMINI_API_KEY=your-google-gemini-key
GEMINI_MODEL=gemini-1.5-flash
SESSION_SECRET=a-secure-random-string-at-least-32-chars-long
DEMO_ADMIN_KEY=karunya-demo-admin-key
```

### 5. Seed Demo Data
Populate the 10 dummy Karunya students across 3 canonical centers:
```bash
# Option A: In Supabase SQL Editor
# Paste and execute supabase/seed.sql

# Option B: Run via TypeScript script
npm run seed
```

### 6. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploy to Vercel

### Option A: Via GitHub (Recommended)
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Initial ExamBuddy commit"
   git push origin main
   ```
2. Log into [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add the 7 keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (e.g. `gemini-1.5-flash`)
   - `SESSION_SECRET`
   - `DEMO_ADMIN_KEY`
5. Click **Deploy**. Vercel will build and assign a public production URL (e.g. `https://exambuddy-karunya.vercel.app`).

### Option B: Via Vercel CLI
```bash
npx vercel --prod
```
When prompted, link your project and add the environment variables either through the CLI or on the Vercel dashboard.

---

## 👥 Demo Presenter Roles (4-Device Live Presentation)

The demo is optimized for simultaneous testing on four phones or laptops:
- **Presenter 1** (Daniel Raj, `URK22CS1001`): Center A (iON Kovai Pudur), Forenoon
- **Presenter 2** (Priya George, `URK22CS1002`): Center A (iON Kovai Pudur), Forenoon
- **Presenter 3** (Samuel Paul, `URK22AI1003`): Center A (iON Kovai Pudur), Forenoon
- **Presenter 4** (Nithya Menon, `URK22EC1004`): Center B (KGiSL Saravanampatti), Afternoon

*Presenters 1, 2, and 3 match into the Center A group alongside seeded classmates, while Presenter 4 joins the Center B afternoon group.*

### Instant Reset for Re-Runs
To reset test users, messages, and state back to the original 10 seeded students:
```bash
curl -X POST "https://your-domain.vercel.app/api/demo/reset?key=DEMO_ADMIN_KEY"
```
Or click the hidden admin reset button in the developer menu.
