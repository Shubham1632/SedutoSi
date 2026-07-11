# CLAUDE.md — working agreement for this repo

Guidance for Claude Code (and humans) working on this project.

## What this is

**SedutoSi** — a mobile-only movie & live-event ticket booking app (university
project), built with Expo (iOS + Android) and Supabase. Users browse movies
and cinemas, pick a screening and seats (or an event and a ticket quantity),
pay with Stripe, and manage their bookings.

## Stack

| Concern           | Choice                                                          | Location                    |
| ------------------ | ---------------------------------------------------------------- | ---------------------------- |
| Monorepo           | Turborepo + pnpm                                                 | root                         |
| Mobile app         | Expo + Expo Router, NativeWind                                   | `apps/expo`                  |
| Backend            | Supabase: Postgres + Auth + Storage + Edge Functions              | `supabase/`                  |
| Data layer         | `@supabase/supabase-js` typed client, session provider            | `packages/api`               |
| Shared logic       | validators, react-query hooks, auth actions                       | `packages/app`               |
| Shared native UI   | NativeWind-styled primitives (Button, Input, Text, Alert)         | `packages/ui-native`         |
| Env + constants    | zod client-env schema                                             | `packages/config`            |
| Payments           | Stripe Checkout, opened in-app via `expo-web-browser`, confirmed server-side | `supabase/functions` |

Package scope is `@acme/*` (internal workspace scope only, never published).

## The golden rules (do not violate)

1. **RLS on every table.** Authorization lives in Postgres, not app code.
   Every table has an owner (`user_id`) and policies scoped to
   `(select auth.uid())`. Bookings are the one exception: they have no
   client-facing INSERT policy — they're only ever written by the
   `stripe-confirm-payment` / `book-free-event` edge functions, after the
   server has verified payment/capacity. This stops a client from inserting a
   booking without paying, or double-booking a seat/ticket.
2. **The Supabase service-role key is server-only.** It bypasses RLS. It
   appears ONLY inside `supabase/functions/*` (Deno edge functions). Never in
   `apps/expo` client code.
3. **Env vars go through the zod schema in `packages/config/src/env.ts`
   (`clientEnvSchema`).** `apps/expo/src/lib/env.ts` maps `EXPO_PUBLIC_*` vars
   onto it. Add new vars to `.env.example` too.
4. **Stripe secret key and edge-function logic never reach the client.**
   Checkout sessions are created and confirmed server-side
   (`supabase/functions/stripe-create-checkout-session`,
   `stripe-confirm-payment`); the app only opens the returned Checkout URL.
5. **Cross-platform logic lives in `packages/`; `apps/expo` is a thin entry
   point** (screens + navigation only).

## Commands

```bash
pnpm install              # install workspace
pnpm dev                  # start the Expo dev server (turbo watch)
pnpm typecheck             # tsc across the workspace  <- run before commit
pnpm lint                  # eslint across the workspace <- run before commit
pnpm format:fix            # prettier write
pnpm test                  # vitest (unit/integration)
pnpm android / pnpm ios    # run a native build

# Supabase (local dev)
supabase start             # boot local Postgres/Auth/Storage (Docker)
supabase db reset          # re-apply migrations + seed.sql
supabase status             # show local URLs + keys
pnpm db:gen-types           # regenerate packages/api/src/types.ts from the linked project
pnpm db:push                # push local migrations to the linked project
```

## Structure

```
apps/expo/src/
├─ app/(auth)/               # sign-in, sign-up
├─ app/(app)/(tabs)/         # movies, cinemas, live events, profile
├─ app/(app)/booking/        # seat picker → payment → success/failed
├─ app/(app)/event-booking/  # ticket quantity → payment → success/failed
├─ app/(app)/bookings/       # booking history + detail
├─ components/               # seat map, responsive container, etc.
└─ lib/                      # booking helpers, Supabase client, env, auth

packages/api/        — SupabaseProvider, useSession, generated DB types
packages/app/        — validators, auth actions, react-query data hooks
packages/ui-native/  — Button, Input, Text, cn, themed Alert
packages/config/     — client env schema
supabase/
├─ migrations/  — schema (movies, cinemas, screens, screenings, events, bookings, payment_methods)
└─ functions/    — stripe-create-checkout-session, stripe-confirm-payment, book-free-event
```

## Conventions

- **TypeScript everywhere**, `strict`. No `any` without a reason.
- **No comments unless behavior is genuinely non-obvious** (a subtle
  invariant, a workaround, a race condition). Don't restate what the code
  already says.
- **Responsive layout:** `apps/expo/src/lib/use-responsive.ts` +
  `apps/expo/src/components/responsive-container.tsx` — list/grid screens
  vary `numColumns` by width breakpoint; detail/form screens wrap content in
  `<ResponsiveContainer maxWidth={...}>`. Follow this pattern for new screens.
- **Don't mix `className` and `style` on the same component** — NativeWind
  can silently drop `className` properties (e.g. borders) when a `style` prop
  is also present. Wrap in a plain `<View style={...}>` instead.
- **Brand color is warm orange** (`packages/ui-native/src/theme-colors.ts` —
  light `#e2711d`, dark `#f2934a`). Don't introduce blue/indigo accents.
- **Commits:** Conventional Commits (`feat: ...`, `fix: ...`).
- **Migrations are append-only.** Never edit a shipped migration; add a new
  one.
- **Keep it buildable.** `pnpm typecheck && pnpm lint` must pass at every
  checkpoint.
