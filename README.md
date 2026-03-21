# WedLedger

Wedding budget management platform for planners and couples. Planners manage multiple client weddings with detailed budgets, vendor tracking, payment schedules, and planning timelines. Couples plan their own wedding and can hire planners through a built-in marketplace.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Database:** Supabase (PostgreSQL with Row-Level Security)
- **Auth:** Clerk
- **Styling:** Tailwind CSS v4 with a custom wedding-themed palette
- **AI:** Anthropic API (Claude) for budget summary generation
- **Charts:** Recharts
- **Drag & Drop:** dnd-kit
- **Testing:** Vitest + Testing Library

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Clerk](https://clerk.com) application
- An [Anthropic API key](https://console.anthropic.com) (optional, for AI summaries)

### Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in your keys:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `ANTHROPIC_API_KEY` | Anthropic API key (optional) |

3. Set up the database by running `supabase-schema.sql` in your Supabase SQL Editor, then apply migrations in order from `src/lib/supabase/migrations/`.

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    clients/[id]/         # Planner view of a client wedding
    dashboard/            # Planner multi-client dashboard
    my-wedding/           # Couple's own wedding view
    find-planner/         # Planner marketplace directory
    onboarding/           # Role selection & setup
    api/                  # API routes (AI summary generation)
  components/
    budget/               # Budget tables, metrics, payment schedule
    client/               # Client-facing dashboard & charts
    couple/               # Couple-specific UI (countdown, planner CTA)
    dashboard/            # Dashboard client cards & lists
    engagement/           # Planner-couple engagement updates
    layout/               # AppShell, AppNav
    timeline/             # Milestones, Gantt chart, templates
    ui/                   # Shared primitives (Button, Modal, Toast, etc.)
  lib/
    hooks/                # Shared hooks (useClientBudget, useBudgetEditing)
    supabase/             # Supabase client & server utilities
    types.ts              # TypeScript interfaces & helper functions
    budgetTemplates.ts    # Wedding-level budget allocation templates
    milestoneTemplates.ts # Planning timeline templates
    constants.ts          # Default categories, US states
```

## Key Features

- **Two user roles:** Wedding planners and couples, each with tailored dashboards
- **Budget management:** Categories, line items, vendor tracking, booking statuses
- **Payment schedules:** Per-vendor payment tracking with templates (50/50, 3-payment, etc.), bulk actions, overdue alerts
- **Planning timeline:** Milestone tracking with Gantt and list views, milestone templates
- **Coordinator/Client views:** Planners can toggle between their detailed view and a client-friendly view
- **Budget templates:** 5 wedding tiers (DIY through Ultra Luxury) with percentage-based category allocations
- **AI summaries:** Generate client-friendly budget summaries via Claude
- **Planner marketplace:** Couples browse and engage planners for consultations or ongoing planning
- **Print support:** Budget tables and timelines are print-optimized

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
npm run test       # Run tests
npm run lint       # Run ESLint
```
