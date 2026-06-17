# Discipline

A calm, judgment-free habit tracker for personal recovery and self-control — built mobile-first with Next.js, Supabase, and a UI inspired by Headspace, Apple Health, and Notion (not gamified, not punitive).

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** + hand-rolled ShadCN-style UI components (Radix UI primitives + `class-variance-authority`)
- **Supabase** — Postgres, Auth (Email/Password + Google OAuth), Row Level Security
- **Zustand** for lightweight client state (PIN-lock unlock state, cached habit/settings)
- **React Hook Form + Zod** for all form validation
- **Recharts** for analytics charts; hand-built CSS calendar heatmap
- **canvas-confetti** for milestone celebrations, **jsPDF** for PDF export

## Features

- Email + Google sign-up/login/logout/password reset
- 4-step onboarding (habit type incl. custom, goal, first target days, motivation)
- Daily check-in: success toggle, urge slider (1–10), mood, multi-select triggers, optional journal text
- Automatic streak engine with two modes:
  - **Strict** — a slip resets the streak to zero
  - **Recovery** — a slip logs but only costs a few days, streak keeps going
- Dashboard: current/best streak, consistency score, next milestone progress, 30-day mood trend, recent journal entries
- Unlimited milestones with rewards, redemption tracking, and a confetti celebration screen on achievement
- Private journal with search, mood filter, and sort, fully separate entries or auto-mirrored from check-ins
- Analytics: streak history, mood trend, urge trend, trigger-frequency chart, monthly calendar heatmap, success rate
- "AI Coach" placeholder page — the schema (especially `check_ins` and the `analytics_cache` table) is already shaped for future trigger-detection / relapse-prediction / coaching features
- Discreet daily reminder settings (notification copy never names the tracked habit)
- Privacy: optional 4–6 digit PIN lock (SHA-256 hashed client-side), biometric-unlock preference toggle, full data export (JSON/CSV/PDF), delete-all-data, and delete-account (via a server route using the Supabase service role key)

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then run the migration in
   `supabase/migrations/0001_init.sql` via the SQL editor (or `supabase db push` if you use the CLI).
   This creates all 10 tables (`habits`, `check_ins`, `journal_entries`, `milestones`, `rewards`,
   `achievements`, `notifications`, `analytics_cache`, `settings`, plus relies on Supabase's built-in
   `auth.users`), Row Level Security policies scoped to `auth.uid()`, and a trigger that auto-creates a
   `settings` row for every new user.

3. **Enable Google OAuth** (optional) under Supabase → Authentication → Providers, and add your site URL
   plus `/auth/callback` as a redirect URL.

4. **Copy environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   Supabase → Settings → API. `SUPABASE_SERVICE_ROLE_KEY` is optional and only needed for the
   delete-account route — keep it server-side only, never commit it.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add the same environment variables from `.env.local` in the Vercel project settings.
4. Update your Supabase Auth redirect URLs to include your production domain + `/auth/callback`.
5. Deploy.

## Project structure

```
src/
  app/
    (app)/            authenticated app shell (dashboard, check-in, journal, milestones,
                       analytics, ai-coach, settings) — gated by middleware + PIN lock
    login, signup, reset-password, onboarding, auth/callback
    api/delete-account/  service-role-backed account deletion
  components/
    ui/                hand-rolled Radix-based primitives (button, card, dialog, slider, ...)
    shared/             feature components (nav, charts, forms, celebration modal, PIN gate)
  lib/                  supabase clients, streak math, constants, zod schemas, data fetchers
  store/                Zustand app store
  types/database.ts     hand-written types mirroring the SQL schema
supabase/migrations/0001_init.sql   full schema + RLS
```

## Notes & known limitations

- This was scaffolded with **placeholder Supabase credentials** — plug in your own project to run it for real.
- Biometric unlock is currently a stored preference only (no WebAuthn wiring yet) since this is a web app;
  wire it up to the device's platform authenticator when you wrap this as a PWA/native shell.
- The AI Coach page is intentionally a placeholder — the data model is already AI-training-ready.
