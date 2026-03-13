# WedLedger — Project Summary

## What Is It

WedLedger is a budget and planning management tool built for wedding coordinators. It lets coordinators manage multiple wedding clients, track budgets down to individual vendor payments, plan timelines with milestones, and share a polished read-only view with clients.

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19 and TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Auth:** Clerk (migrated from Supabase Auth)
- **AI:** Anthropic Claude API (Haiku 4.5) for generating client-facing budget summaries
- **Charts:** Recharts
- **Drag & Drop:** dnd-kit
- **Testing:** Vitest + React Testing Library

## Core Features

### Multi-Client Dashboard
- Card-based list of all wedding clients sorted by wedding date
- Budget status indicators (green/yellow/red) per client
- Upcoming payments panel with overdue/this-week/upcoming urgency alerts
- Upcoming milestones panel with the same urgency system

### Budget Management
- **Categories:** Default set (Venue, Catering, Bar, Floral, Rentals, Planner Fee, Entertainment, Photography, Misc) with custom categories supported
- **Budget Templates:** Predefined percentage-based allocations by wedding level that auto-populate category targets
- **Line Items (Vendors):** Track vendor name, estimated vs. actual cost, booking status (none → inquired → booked → contracted → completed), vendor phone/email
- **Payments:** Multi-payment tracking per vendor with labels, amounts, due dates, and paid/pending status
- **Two-Tab Layout:** "Categories" tab shows rollup-only summaries; "Vendors & Payments" tab is the primary editing hub
- **Drag-and-Drop Reordering:** Reorder categories and line items via drag handles

### Client View
- Read-only shareable view of the budget for the wedding couple
- Prominent budget summary header with key metrics
- Expandable/collapsible category accordion
- Sortable columns
- Optimized for printing and screenshots
- Mobile-responsive with stacked card layout

### Timeline & Milestones
- Planning milestones with months-before-wedding scheduling
- Gantt chart timeline visualization
- Milestone templates (reusable presets saved per coordinator)
- Status tracking: not started → in progress → completed
- Optional linking of milestones to budget categories

### AI Budget Summary
- Generates a conversational, client-friendly budget summary using Claude Haiku 4.5
- Pushable to the client view dashboard
- Stored in the database with timestamp

### Client Financial Dashboard
- Cash flow chart (Recharts)
- Paid vs. remaining visualization
- Payment schedule view

### Auth & Security
- Clerk authentication with sign-in/sign-up flows
- Supabase RLS policies enforce data isolation per user (using JWT `sub` claim)
- All tables secured through ownership chain: clients → budgets → categories → line_items → payments

## Database Schema

Six main tables with cascading relationships:

```
clients (root, owned by user_id)
  └── budgets (1:1 with client)
       └── categories (budget line groups)
            └── line_items (individual vendors)
                 └── payments (payment schedule per vendor)
  └── milestones (planning timeline items)

milestone_templates (reusable presets, owned by user_id)
```

## Project Structure

```
src/
├── app/
│   ├── api/generate-summary/    # AI summary endpoint
│   ├── clients/[id]/            # Client budget page (main editing UI)
│   ├── clients/new/             # New client form
│   ├── dashboard/               # Multi-client dashboard
│   ├── sign-in/, sign-up/       # Clerk auth pages
│   ├── layout.tsx               # Root layout (Clerk + Toast providers)
│   └── page.tsx                 # Landing/redirect
├── components/
│   ├── budget/                  # Budget editing components
│   ├── client/                  # Client-facing dashboard & charts
│   ├── dashboard/               # Dashboard widgets
│   ├── timeline/                # Milestone & Gantt components
│   └── ui/                      # Shared UI (Button, Modal, Toast, etc.)
└── lib/
    ├── types.ts                 # All TypeScript interfaces & utility functions
    ├── constants.ts             # Default categories, US states
    ├── budgetTemplates.ts       # Wedding level budget templates
    ├── milestoneTemplates.ts    # Milestone template presets
    ├── clientDataTransformers.ts # Data transformation utilities
    └── supabase/                # Supabase client (browser + server)
```

## Development History

The project started from Create Next App and evolved through ~50 commits:

1. **MVP** — Basic client/budget CRUD with Supabase
2. **Budget UX** — Editable totals, percentage allocation, sticky headers, keyboard interactions
3. **Client View** — Read-only mode, print optimization, mobile responsiveness, accordion layout
4. **Templates** — Budget templates by wedding level, milestone templates
5. **Payments** — Multi-payment tracking per vendor, upcoming payments dashboard
6. **Timeline** — Milestone planning, Gantt visualization, template system
7. **Financial Dashboard** — Charts, cash flow, paid vs. remaining
8. **Vendor Management** — Booking status workflow, drag-and-drop reordering, vendor contacts
9. **Auth Migration** — Supabase Auth → Clerk, RLS policy updates
10. **Polish** — Column sorting, portal dropdowns, actual cost sync, testing infrastructure
