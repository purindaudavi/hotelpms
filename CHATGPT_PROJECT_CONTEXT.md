# StayPilot PMS - Project Context for ChatGPT

Last reviewed against the local source code: **2026-07-13**

## How to use this file

Upload this Markdown file to a ChatGPT conversation before asking questions about the project. Start the conversation with something like:

> This file describes my current StayPilot PMS project. Use it as project context. The source code is still the final authority, so tell me when you need a specific current file pasted or uploaded.

This document is a snapshot, not live access to the repository. ChatGPT cannot open the Windows paths listed below unless the relevant files are also uploaded. Re-upload an updated version of this document after major code changes.

---

## Project identity

- Product name: **StayPilot PMS**
- Product type: browser-based hotel **Property Management System (PMS)** prototype
- Repository path on the developer's computer: `D:\DMS new\new-pms`
- Demo property: **Ronaka Airport Transit Hotel**, Katunayake, Sri Lanka
- Current demo property ID: `demo`
- Demo hotel currency: `LKR`
- Seeded hotel room count: `14`
- Seeded PMS system/business date: `2026-06-18`
- Main objective: reproduce and improve HotelMate-style hotel management screens, make their client-side interactions work, and later replace prototype persistence with a proper Supabase backend.

The developer is still learning PMS concepts. Explain hotel terminology and workflows in plain language before assuming domain knowledge.

## Preferred development approach

- Keep the UI close to the supplied reference screenshots.
- Interactions should work in the browser, not only look correct.
- Prototype data should remain available while navigating between modules in the same browser session.
- Supabase will be expanded later; do not pretend session-only behavior is production persistence.
- Keep TypeScript/React code readable and divided into identifiable sections/components.
- Preserve existing work when changing a file; the worktree may contain user changes.
- Clearly distinguish complete behavior, partial behavior, and visual/toast-only simulation.

---

## Technology stack

- Next.js `15.3.5`, App Router
- React `19`
- TypeScript with strict mode
- Tailwind CSS `3.4`
- Lucide React icons
- Recharts for dashboard charts
- Supabase JS `2.x` for authentication and a flexible JSON record table
- Client-heavy architecture using shared React state and property-scoped browser `localStorage`, with selective Supabase JSON-record synchronization
- EmailJS browser client for prototype reservation confirmation emails

Useful commands from the repository root:

```powershell
npm run dev
npm run typecheck
npm run build
npm run start
```

There is no automated test script currently configured in `package.json`.

---

## Application entry and routing

- `/` redirects to `/login`.
- `/login` contains Supabase email/password sign-in plus an **Open demo workspace** option.
- Main property routes use `/properties/{propertyId}/{module-path}`.
- The catch-all property route is implemented in `app/properties/[id]/[[...slug]]/page.tsx`.
- `app/components/app-shell.tsx` renders the sidebar, header, global toast, shared state, and selected module.
- `app/components/module-pages.tsx` chooses the module component based on the URL path.
- Navigation definitions and the main seed records live in `app/data/pms-data.ts`.

Important authentication limitation: the login page can call Supabase Auth, but property routes do not currently enforce a server-side session or route guard. Opening a property URL directly is not securely protected. The local `staypilot-session` value is only a browser marker, not authorization.

---

## State and persistence model

### Shared workspace state

The application shell owns three important arrays:

- `reservations`
- `roomList`
- `transactions`

They use keys shaped like:

```text
staypilot:{propertyId}:reservations
staypilot:{propertyId}:rooms
staypilot:{propertyId}:transactions
```

These values now use the reusable local-storage implementation in `app/components/hooks/use-local-storage-state.ts`. The old `useSessionState` module is a compatibility re-export, so existing modules receive localStorage persistence without duplicating direct storage calls. Valid legacy sessionStorage values are migrated once when no local value exists. Shared reservation, room and transaction arrays use runtime validators and fall back to seed state when JSON is invalid.

`localStorage` survives navigation, refreshes and browser restarts on the same browser profile. It is still not a database, does not provide cross-device synchronization or safe concurrent writes, and should later be replaced by Supabase repositories.

### Module-specific state

Many modules have additional keys under prefixes such as:

```text
staypilot:{propertyId}:reservation:...
staypilot:{propertyId}:rooms-rates:...
staypilot:{propertyId}:housekeeping:...
staypilot:{propertyId}:pos:...
staypilot:{propertyId}:financials:...
staypilot:{propertyId}:channel-manager:...
staypilot:{propertyId}:ibe:...
```

Property settings, settings email templates, employees, Front Desk rate plans and reservation detail state now use property-scoped localStorage keys. Older unscoped settings values are used as one-time migration fallbacks.

### Supabase

Environment variable names expected by the browser client:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Do not place real keys or passwords in this context file.

The current database design is a generic JSON record store:

```text
public.staypilot_records
- id
- property_id
- record_type
- payload jsonb
- created_at
- updated_at
```

Supported record types include reservations, rooms, housekeeping, transactions, POS orders, activity logs, and settings. The SQL is in `supabase/schema.sql`.

Current Supabase integration is selective:

- The app shell attempts to load **reservations** and **rooms** from Supabase only when corresponding session state does not already exist.
- Reservation creation/update in major reservation screens attempts a generic Supabase upsert.
- Some room changes attempt an upsert.
- Activity messages can be appended as generic records.
- There is no general delete helper, so some UI deletes remove only client/session data.
- Transactions are initialized from seed/session state and are not loaded from Supabase by the shell.
- Most module-specific entities are not stored in Supabase.

The current schema is useful for prototyping but not a production PMS relational model. It lacks proper foreign keys, booking-room-night allocation tables, folios, charges, payments, users/roles, audit immutability, and transactional concurrency controls.

---

## Core data model

The primary simplified types are in `app/data/pms-data.ts`.

### Reservation

The shared reservation model stores:

- ID, reservation number, booking reference
- reservation date, check-in, check-out
- number of rooms
- source/channel
- status
- primary guest contact and country
- one room type and one room number
- adult and child counts
- total and paid amount

Statuses are:

```text
Confirmed
Tentative
Checked-in
Checked-out
Cancelled
No Show
Blocked
```

The model now also stores property ownership, booking source/reference/tour/group values, title and remarks, day-use state, selected rate-plan/currency/meal/refund terms, check-in audit values, confirmation-email status, timestamps, and a `reservationRooms` array. Each room line has stable IDs, room/type assignment, occupancy, bed/adult/child values, selected/final pricing, FOC reason/audit fields and timestamps. Taxes, per-night seasonal prices, multiple named guests, folio lines, deposits/refunds and transactional room moves are still not fully modeled.

### Room

Stores room number/code, room type, floor, operational room status, housekeeping status, and attendant.

Operational status:

```text
Available | Occupied | Out of Order | Maintenance
```

Housekeeping status:

```text
Clean | Dirty | Occupied | WIP
```

### Financial transaction

Stores date, type, document number, value, reservation/room references, creator, and status. It is a simplified activity ledger, not double-entry accounting.

---

## Normal hotel workflow represented by the app

```text
Create reservation
  -> guest appears in Arrivals on the check-in date
  -> front desk assigns/verifies the room and checks the guest in
  -> guest appears In House
  -> charges/payments are posted to the stay/folio
  -> guest appears in Departures on the check-out date
  -> bill is settled and guest is checked out
  -> room becomes Dirty for housekeeping
  -> housekeeping cleans and marks it Clean/Available
  -> night audit closes the business date and opens the next date
```

The current project represents parts of this workflow, but not every transition is fully integrated.

---

## Module map and current maturity

Maturity labels used below:

- **Connected prototype**: meaningful interactions and some cross-module state work.
- **Session prototype**: interactions work but exist only in browser session state.
- **Mostly presentation/simulation**: UI, seed data, downloads, or toast messages without real external operations.

### 1. Dashboard

Path: `app/components/modules/dashboard`

Tabs:

- Overview
- Analytics
- Travel Agents

Uses shared reservations, rooms, and transactions to calculate arrivals, departures, occupied rooms, occupancy percentage, and revenue. Analytics and travel-agent visuals use demo-derived datasets.

Maturity: **connected prototype** for headline calculations; charts are mainly demonstration analytics.

### 2. Front Desk

Path: `app/components/modules/front-desk`

Purpose: daily operational room calendar and the main desk workflow.

Screens/tabs:

- Front Desk grid
- Arrival
- Departure
- In House
- All

Features:

- Room-by-date grid grouped by room type
- 7/15/30 grid-day selection
- previous/next date range and date picker
- day-use hourly view
- basic reservation creation/editing
- reservation detail drawer
- list search and CSV export
- basic attachments/payment/companion records in session state

Front Desk reservation workflow update (2026-07-13):

- Uses the shared workspace reservation array only; the separate merged Front Desk demo copy was removed.
- Uses `property.systemDate` as the business date for the grid and movement lists.
- Booking Source rules preserve external booking reference, tour number and group name.
- Property-scoped Rate Plans include seeded packages plus a working creation dialog and automatic defaults/override indicators.
- One reservation can persist multiple room lines, with duplicate/overlap and room-operational-state validation.
- Complimentary/FOC room lines retain original rate, require a reason, set effective accommodation rate to zero and record a simulated approval requirement.
- Guest remarks and staff-only internal remarks persist; internal remarks are excluded from EmailJS parameters.
- Immediate check-in validates dates/room readiness, marks the reservation Checked-in and updates room/housekeeping state.
- Confirmation email is sent after local save through EmailJS when configured; sent/failed state is persisted and failed sends can be retried from reservation details.

Known important limitations:

- Browser validation is useful for the prototype but is not transactionally safe against two users booking the same room at the same time; production overlap enforcement belongs in the database.
- The day-use grid shows 24 hours, but reservations contain dates rather than arrival/departure times. A same-day booking can repeat across all hourly cells.
- Grid/list toggle controls do not currently provide genuinely different views.
- Pagination controls are incomplete.
- Reservation deletion is local/session-only and does not delete its Supabase record.
- Some detail drawer actions only display toast messages.

#### Reservation editor fields

The `+ Reservation` panel displays source/travel agent, booking reference, tour number, group name, status, dates, nights, day-room option, rate plan, currency, meal plan, room details, occupancy, bed, adults, children, rate, FOC, guest details, remarks, immediate check-in, and send-email option.

The reservation editor now saves the visible source/reference, rate-plan, currency, meal, room-line, FOC, guest and remark values. Bulk-room, help, share, rate-hunt and business-block actions remain incomplete or toast simulations.

EmailJS uses `NEXT_PUBLIC_EMAILJS_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` and `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`. This is acceptable only for the browser prototype. A production PMS must send transactional email through a secure server-side service with authorization, rate limiting, template validation and delivery webhooks.

Maturity: **connected but incomplete prototype**.

### 3. Reservation module

Path: `app/components/modules/reservation`

Subpages:

- Bookings
- Create event
- Cross Booking
- Arrivals
- Departures
- In-House
- Travel Agents
- Guest Profile

Bookings can be searched, filtered, exported, created, edited, checked in, and checked out. The booking screen attempts Supabase upserts and appends activity records. Business blocks, events, cross-book links, travel agents, and guest profiles are primarily session-backed. Movement pages export CSV files.

Reservations created here update the shared reservation array, so they can appear in other shared-reservation screens. Several booking-detail operations and attachment/payment helpers remain simplified.

Maturity: **connected prototype**, with several **session-only submodules**.

### 4. Rooms & Rates

Path: `app/components/modules/rooms-rates`

Subpages:

- Rooms
- Rates
- Inventory
- Rate Hunter

Room types and rate plans are session-backed. Individual room edits update the shared room list. Inventory supports draft/saved cell values and bulk rate operations in the session. Rate Hunter uses seeded competitor hotel data and can open a Booking.com search; it is not connected to a live rate-shopping API.

Maturity: **connected/session prototype**; Rate Hunter is **demo data plus external search link**.

### 5. Housekeeping

Path: `app/components/modules/housekeeping`

Subpages:

- Housekeeping Board
- Information

Tracks room cleaning status, attendants, assignments, activity records, and a day-end workflow. Status changes also update the shared room list, so other screens can see the new housekeeping status. Most housekeeping-specific records are session-only and are not written through the generic Supabase layer.

Maturity: **connected session prototype**.

### 6. POS

Path: `app/components/modules/pos`

Subpages:

- Dashboard
- POS Order
- KOT/BOT Monitor

Supports outlets, categories, menu items, cart lines, order creation, settlement, and kitchen/bar ticket status progression. Settled POS orders add a `POS Sale` to the shared transactions array, which affects financial/dashboard views in the same session.

There is no real payment processor, receipt printer, kitchen display server, tax engine, stock deduction, or Supabase order persistence.

Maturity: **connected session prototype**.

### 7. Financials

Path: `app/components/modules/financials`

Subpages:

- Transactions
- Purchases
- Expenses
- Payables
- Receivables
- Profit & Loss
- Chart of Accounts
- Suppliers
- Transfer Funds
- Integrations

Purchases, expenses, supplier payments, receivable payments, transfers, and POS settlement can add records to the shared transaction list. Purchases, expenses, suppliers, receivables, accounts, agents, balances, and transfer history use session state. Several CSV exports work.

This is not yet a compliant accounting system: it does not maintain balanced journal entries, immutable posting periods, tax reports, bank reconciliation, currency revaluation, or robust audit trails.

Maturity: **connected session prototype** with simplified accounting logic.

### 8. Reports

Path: `app/components/modules/reports/reports-page.tsx`

Shows categorized hotel reports and previews. Report download builds a simple PDF-like file client-side using current reservation data. It is not backed by a reporting database or server-generated official documents.

Maturity: **functional client-side demo/report generator**.

### 9. CRM

Path: `app/components/modules/crm`

Subpages:

- Templates
- Campaigns

CRM templates support content fields and image uploads in session state. Campaigns select saved templates and seeded/current guest rows, then generate session campaign logs. No real email provider is connected, so campaign "send" results are simulations.

Maturity: **session prototype**.

### 10. Channel Manager

Path: `app/components/modules/channelmanager`

Subpages:

- Request
- Dashboard
- Inventory
- Channels
- Room and Rates
- Bookings
- Logs
- Message
- Full Sync
- Pull Future Reservations

These screens share channel-specific session keys. They support creating channel request records, managing channel room records/photos, inventory overrides and restrictions, viewing/exporting OTA bookings, message history, simulated full-sync summaries, logs, and pulling generated future bookings.

No Agoda, Expedia, Booking.com, or other OTA API is connected. "Sync," "pull," and "message" actions update local/session records and logs rather than communicating with a real channel.

The channel-manager reservation records use a different model from the PMS shared reservation records. Pulled OTA bookings do not automatically become normal PMS reservations unless an explicit conversion workflow is added.

Maturity: **rich session simulation**, not a live channel manager.

### 11. Night Audit

Path: `app/components/modules/nightaudit/nightaudit.tsx`

Provides a checklist-driven night audit. It can review/resolve checks, post calculated room revenue into shared transactions, close housekeeping for the session, acknowledge channel reservations, generate/download an audit pack, complete the audit, change certain reservation/room state, and advance its own business date.

Its audit state is session-backed. It is not an atomic database transaction, does not lock the property against concurrent edits, and does not permanently close accounting periods.

Maturity: **connected session prototype**.

### 12. IBE

Path: `app/components/modules/ibe/ibe-page.tsx`

IBE means **Internet Booking Engine**, the hotel's direct-booking website configuration.

The large settings screen includes packages, minimum-stay rules, rate overrides, promo codes, banners/logos, property presentation, policies, booking settings, colors, and smart-pricing settings. Images are processed in the browser and stored for the session.

There is no separate public booking website, availability API, payment checkout, booking confirmation service, or production image storage connected here.

Maturity: **large session-only configuration prototype**.

### 13. Settings

Path: `app/components/modules/settings`

#### Users

- searchable/filterable user table
- invite/add-user drawer
- permissions for Front Desk, Dashboard, Reservations, Rooms & Rates, Channels, POS, Financials, Settings, Housekeeping, Reports, CRM, Night Audit, and IBE
- browser-session behavior only; no real user provisioning or RBAC enforcement

#### Property

Tabs:

- Property Info
- Property Image
- Meal Allocation
- Payment Gateway
- Taxes
- Currency
- Theme
- Hotel Features

Includes editable hotel identity/contact/times/currency/metadata/channel-manager/location values, Google map embed, browser image previews/deletes, meal allocation CRUD, payment-gateway forms, tax rules, currencies/rates, theme colors, and feature switches.

Gateway tabs include CyberSource, PayPal, Skrill, Stripe, Google Pay, and Apple Pay. They only save configuration in the session. PayPal connect is explicitly simulated. No payment SDK or secure server-side secret handling exists.

The currency "refresh" action applies a small random change; it does not fetch live exchange rates.

#### Email Templates

Categories:

- Confirmation
- Check-in
- Check-out
- Cancellation
- Reminder
- No-show
- General

Provides default previews, a block/template builder, placeholders, reordering, text editing, live preview, create/edit/view/delete behavior, and session persistence. It does not send emails.

#### Data Import

Downloads a CSV template and reads selected CSV text to build a row count/payload preview. Excel/API parsing and actual reservation insertion are not implemented.

#### Activity Logs

Has username/activity/platform/date filters and CSV export over seeded rows. It is not currently connected to the generic Supabase activity records written by other modules.

#### Employee

Search plus view/create/edit/delete employee records in browser state. No Supabase persistence, payroll, scheduling, or user-account link exists.

Maturity: primarily **session prototypes**.

---

## Cross-module connections that currently exist

- Shared reservations are used by Dashboard, Front Desk, Reservation, reports, and some night-audit operations.
- Shared room records are used by Front Desk, Rooms & Rates, Housekeeping, Dashboard, and Night Audit.
- Housekeeping status changes update the shared room list.
- Settled POS orders add shared financial transactions.
- Purchases, expenses, supplier/receivable payments, and transfers add shared financial transactions.
- Night audit can add shared transactions and update shared reservations/rooms.
- Channel Manager subpages share their own channel session records with one another.
- CRM campaigns read CRM templates from the same CRM session store.
- Property settings tabs share one property-settings state container.

## Areas that look connected but are not fully connected

- Settings users do not enforce permissions in navigation or routes.
- Property home currency does not globally replace the hardcoded property currency everywhere.
- Property theme settings do not comprehensively theme the full application shell.
- Settings email templates are not connected to an email delivery service.
- Front Desk's send-email checkbox does not send a confirmation.
- Front Desk payment entries do not reliably become shared financial transactions or folio lines.
- Channel Manager bookings are not automatically converted to PMS reservations.
- Channel Manager sync does not contact OTA APIs.
- IBE configuration is not connected to a public booking engine.
- Payment gateway configuration is not connected to payment SDKs.
- Activity Logs UI does not read the generic Supabase activity records.
- Client-side deletes generally do not delete corresponding generic Supabase records.

---

## Highest-priority production gaps

1. Design a relational Supabase/Postgres schema instead of one generic JSON table.
2. Enforce authentication, property membership, and role/permission checks server-side.
3. Use one authoritative property/business date across all modules.
4. Remove separate fake reservation datasets or clearly isolate demo mode.
5. Add room-night availability and transactional overlap prevention.
6. Expand reservations to support multiple rooms, guests, per-night rates, taxes, meal plans, deposits, and remarks.
7. Implement folios, charges, payments, refunds, invoices, and a real accounting journal.
8. Implement correct check-in/check-out/room-status/housekeeping transitions.
9. Add reliable create/update/delete APIs with validation and audit records.
10. Connect real email, file storage, payment gateway, OTA/channel, and IBE services.
11. Add server-side reporting, pagination, error handling, loading states, and concurrency handling.
12. Add automated unit, integration, and end-to-end tests.

---

## Key source files

```text
app/layout.tsx
app/page.tsx
app/login/page.tsx
app/data/pms-data.ts
app/components/app-shell.tsx
app/components/module-pages.tsx
app/components/hooks/use-session-state.ts
app/lib/supabase-data.ts
app/utils/supabase/client.ts
supabase/schema.sql

app/components/modules/dashboard/
app/components/modules/front-desk/
app/components/modules/reservation/
app/components/modules/rooms-rates/
app/components/modules/housekeeping/
app/components/modules/pos/
app/components/modules/financials/
app/components/modules/reports/
app/components/modules/crm/
app/components/modules/channelmanager/
app/components/modules/nightaudit/
app/components/modules/ibe/
app/components/modules/settings/
```

Some files are very large, especially IBE, financials, night audit, reservations, and channel-manager inventory. When asking for a code change, provide the exact active file and the problem instead of expecting this context file to contain every implementation line.

---

## Guidance for ChatGPT answering project questions

When answering the developer:

1. Explain the relevant PMS concept in beginner-friendly language.
2. State what the current project appears to do.
3. Separate these labels clearly:
   - working now
   - session-only
   - partially implemented
   - visual/toast simulation
   - needs backend/external integration
4. Do not claim a feature is production-ready because the screen exists.
5. Ask for the current source file when exact implementation details may have changed after this snapshot.
6. For proposed database work, account for multi-property isolation, permissions, validation, concurrency, audit logs, and financial integrity.
7. Never request or reproduce `.env` secrets. Variable names are enough.

## Recommended question format

For better answers, the developer can write:

```text
Module/path:
What I clicked:
What I expected:
What happened:
Do I want an explanation, diagnosis, or code change?:
Relevant screenshot/error:
```

Example:

```text
Module/path: app/components/modules/front-desk/components/reservation-editor.tsx
What I clicked: + Reservation, then Reserve
What I expected: all visible fields to be saved
What happened: only basic reservation fields remain
Request: explain why and propose the correct data model before changing code
```

---

## Short glossary

- **PMS**: Property Management System; the hotel's central operations application.
- **Front Desk**: reception operations, room assignment, arrival, check-in, in-house, departure, and check-out.
- **Reservation**: a guest's booking before, during, and after the stay.
- **Room type**: a sellable category, such as Deluxe Double.
- **Room number**: the physical room assigned to the guest.
- **Rate plan**: rules and price package applied to a room.
- **Meal plan**: meals included in the booking price.
- **Day use/day room**: a same-day stay without an overnight night.
- **FOC**: Free of Charge.
- **Folio**: the guest/stay account containing charges, payments, refunds, and balance.
- **Housekeeping status**: whether a room is clean, dirty, occupied, or being cleaned.
- **Night audit**: end-of-business-day verification and posting process.
- **OTA**: Online Travel Agency, such as Booking.com, Agoda, or Expedia.
- **Channel Manager**: publishes inventory/rates to OTAs and imports OTA bookings.
- **IBE**: Internet Booking Engine, the hotel's direct online booking site.
- **KOT/BOT**: Kitchen Order Ticket / Bar Order Ticket.
- **Business block**: rooms reserved for a group, company, event, or tour before all guest names may be known.
- **No-show**: a confirmed guest who did not arrive and did not cancel.
- **Out of Order**: a room removed from sale because it cannot be used.
