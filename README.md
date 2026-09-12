# DispatchOS — Last Mile Dispatch & Fulfilment Control Tower

A production-quality last-mile delivery operations platform: order lifecycle
management, fulfilment, driver/vehicle allocation, dispatch, a live Control
Tower with simulated GPS tracking, inventory reservation, reporting and
role-based access. Built with mock data and mock platform integrations so it
runs immediately with no external accounts, while the architecture is
designed to swap in real Uber Eats/Deliveroo APIs and a real Supabase
database without a rewrite.

## Tech stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (Base UI primitives)
- **State:** Zustand (session/role) + Next.js Server Actions (data + mutations)
- **Maps:** MapLibre GL JS with free OpenStreetMap raster tiles (no API key required)
- **Charts:** Recharts
- **Icons:** Lucide

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to `/login`. Pick any of the five
role cards (Admin, Operations Manager, Fulfilment Operator, Dispatcher,
Driver) to sign in. This is a **mock authentication** flow (no password) so
the app runs with zero configuration.

No environment variables are required to run the app as shipped — see
"Connecting real services" below for what to add when you're ready to go
live.

## How data works today (mock mode)

There is no database wired up yet. On first request, the app seeds an
**in-memory store** (`lib/store/data-store.ts`) with realistic Dubai-themed
data:

- 12 drivers (mixed own-vehicle / company-vehicle, mixed document validity)
- 10 company vehicles + driver-owned vehicles
- 30+ inventory SKUs across 7 categories, some deliberately low/out of stock
- 20+ orders spread across the full order lifecycle, including a few already
  "out for delivery" so the Control Tower has live data immediately

The store lives in a Node global (`globalThis.__dispatchStore`) so it
survives Next.js Fast Refresh in dev. **It resets whenever the server process
restarts** — this is intentional for a demo; see below for wiring a real
database.

All reads and writes go through **Server Actions** in `lib/actions/*.ts`,
which in turn call repository functions in `lib/store/repositories/*.ts`.
No React component talks to the in-memory store directly — this is the seam
that makes swapping to Supabase a repository-layer change only.

## Mock integrations (Uber Eats / Deliveroo)

`lib/integrations/uber-eats.ts` and `lib/integrations/deliveroo.ts` each
implement the shared `PlatformAdapter` interface
(`lib/integrations/platform-adapter.ts`):

```ts
interface PlatformAdapter {
  fetchOrders(): Promise<Order[]>;
  getOrder(externalOrderId: string): Promise<Order | null>;
  acceptOrder(externalOrderId: string): Promise<boolean>;
  updateOrderStatus(externalOrderId: string, status: OrderStatus): Promise<boolean>;
}
```

The Topbar polls `ingestPlatformOrders()` (`lib/actions/platform.ts`) every
8 seconds, which calls `fetchOrders()` on both mock adapters. Each adapter
has a 50% chance of "receiving" a new order per poll, generated with
realistic Dubai addresses, items drawn from live inventory, and a platform
external ID (`UE-xxxx` / `DLV-xxxx`).

### Wiring a real platform later

Implement `PlatformAdapter` against the real API (Uber Direct/Eats Order API,
Deliveroo Order Webhook API), keep the same function signatures, and register
it in `lib/integrations/index.ts`'s `adapters` map. Real integrations will
likely be webhook-driven rather than polled — in that case, have the webhook
handler call the same `addOrder()` repository function that
`ingestPlatformOrders()` calls today, and update
`platform_integrations.mode` from `MOCK` to `LIVE`.

## Mock GPS engine

`lib/gps/routes.ts` builds a multi-waypoint polyline from pickup to customer
for every dispatched order (via `buildDeliveryRoute`). `lib/gps/mock-gps-engine.ts`
exposes:

```ts
getDriverLocation(driverId)
updateDriverLocation(driverId, lat, lng)
getActiveDriverLocations()
tickGpsEngine() // advances every active delivery run along its route
```

The Control Tower polls `getControlTowerSnapshot()` every 3 seconds, which
calls `tickGpsEngine()` server-side before returning the snapshot — so the
simulated movement is driven by wall-clock elapsed time on the server, not a
client-side animation loop. When a delivery run reaches 100% progress, the
order is automatically marked `DELIVERED`, and the driver/vehicle
automatically return to `AVAILABLE`.

## Allocation rules engine

All driver/vehicle assignment logic lives in
`lib/dispatch/allocation-engine.ts` — never inside a React component:

- `getAvailableDrivers(order)` / `recommendDriver(order)` — filters to
  `AVAILABLE` drivers with a valid licence, no active order, within the
  operational radius of the pickup point; sorted by distance, nearest first
- `getAvailableVehicles(order)` / `recommendVehicle(order)` — the assigned
  driver's own vehicle (if available and documents valid) always comes
  first and is marked `recommended`, followed by eligible company vehicles
- `validateDriverAssignment` / `validateVehicleAssignment` — re-checked
  server-side on every assignment, rejecting: unavailable driver, expired
  licence, driver already on an active order, out-of-radius driver,
  unavailable vehicle, expired insurance/registration/inspection, vehicle
  already assigned to someone else
- `dispatchOrder(orderId, actor)` — atomically moves the order to
  `OUT_FOR_DELIVERY`, sets the driver to `BUSY`, the vehicle to `ASSIGNED`,
  deducts inventory, starts a GPS delivery run, and writes an audit entry +
  notification

## SLA logic

`lib/sla/sla-engine.ts` computes a live countdown from `orderTime` to
`requestedDeliveryTime`, with configurable thresholds
(`SLA_CONFIG.atRiskThresholdRatio`) driving `ON_TRACK` / `AT_RISK` /
`BREACHED` states shown throughout the Fulfilment board, Orders table and
Control Tower.

## Inventory reservation

`lib/inventory/reservation.ts` reserves stock when an order is **accepted**
(`reserveInventoryForOrder`), releases it if the order is cancelled before
dispatch (`releaseInventoryForOrder`), and permanently deducts stock when the
order is **dispatched** (`deductInventoryForOrder`). Low-stock and
out-of-stock states are derived live from `quantityOnHand - reservedQuantity`
vs. `reorderThreshold`, and trigger an in-app notification the moment a SKU
crosses the threshold.

## Roles & access

Role → allowed routes is defined once in `lib/auth/permissions.ts`
(`ROLE_NAV`) and enforced both in the sidebar (routes that aren't allowed
simply aren't rendered) and in `components/layout/auth-gate.tsx` (a direct
URL visit to a disallowed route redirects to the role's default route). The
Driver role sees only `/my-deliveries` and `/settings`.

## Connecting real services

### Supabase (database + auth)

The target relational schema is in `database/schema.sql` — it defines every
table (`orders`, `drivers`, `driver_documents`, `vehicles`,
`driver_owned_vehicles`, `vehicle_documents`, `inventory`,
`inventory_transactions`, `fulfilments`, `dispatches`, `delivery_runs`,
`gps_locations`, `platform_integrations`, `notifications`, `audit_log`,
`order_status_history`, `users`) with UUID primary keys, enums matching the
TypeScript types in `types/index.ts` 1:1, and foreign keys wired up.

To go live:

1. Create a Supabase project and run `database/schema.sql` against it (SQL editor or CLI migration).
2. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. Replace the implementations in `lib/store/repositories/*.ts` with Supabase
   queries (`@supabase/supabase-js`), keeping the exact same exported
   function names/signatures. Nothing above the repository layer needs to
   change.
4. Replace `lib/store/ensure-seeded.ts`'s in-memory seeding with a one-time
   SQL seed script (the generators in `lib/seed/*.ts` can be adapted to emit
   `INSERT` statements or run once against Supabase directly).
5. Enable Row Level Security per table, scoping the `DRIVER` role to rows
   matching their own `driver_id`, using the same role matrix already
   defined in `lib/auth/permissions.ts`.

### Supabase Auth

Swap `lib/auth/session-store.ts` (currently a client-side Zustand store) for
real Supabase Auth: sign in via `supabase.auth.signInWithPassword`, store the
resolved role in a `profiles` table keyed by `auth.users.id`, and read the
session server-side in `app/(app)/layout.tsx` instead of the current client
`AuthGate` check. `lib/auth/permissions.ts` (the role → route matrix) does
not need to change.

### Real Uber Eats / Deliveroo APIs

See "Mock integrations" above — implement `PlatformAdapter` per platform and
register it in `lib/integrations/index.ts`.

### Mapbox instead of MapLibre + OSM tiles

`components/control-tower/control-tower-map.tsx` builds a plain raster style
object pointing at OpenStreetMap tiles. To use Mapbox instead: add
`NEXT_PUBLIC_MAPBOX_TOKEN`, swap the `style` object for a Mapbox style URL
(e.g. `mapbox://styles/mapbox/streets-v12`), and pass `accessToken` to the
`Map` constructor (Mapbox GL JS and MapLibre GL JS share almost the same
API).

## Project structure

```
/app                     — routes (App Router), grouped under (app) for the authenticated shell
/components               — UI components, one folder per module + shared/layout/ui
/lib/actions               — "use server" functions: the only way components read/write data
/lib/dispatch               — order status actions + allocation engine (all business logic)
/lib/gps                     — mock GPS routes + tick engine
/lib/inventory                 — reservation/release/deduct logic
/lib/sla                        — SLA countdown + threshold logic
/lib/auth                        — roles, permissions matrix, mock session store
/lib/notifications                 — in-app notification service (channel-extensible)
/lib/audit                          — audit log writer/reader
/lib/store                           — in-memory data store + repositories + seeding
/lib/integrations                     — mock Uber Eats / Deliveroo adapters
/lib/seed                              — realistic seed data generators
/types                                  — domain types, mirrored by database/schema.sql
/database                               — target Supabase/PostgreSQL schema
```

## Demo flow

1. Open the app → pick **Administrator** (full access) at `/login`.
2. Watch a new Uber Eats/Deliveroo order arrive in the notification bell (polled every 8s).
3. Go to **Fulfilment**, **Accept** a new order, **Mark Ready**.
4. Go to **Dispatch**, select the order — a driver is recommended by distance/workload.
5. Assign the driver, then assign a vehicle — the driver's own vehicle (if eligible) is starred as Recommended and listed above company vehicles.
6. Confirm the dispatch summary and click **Dispatch Order** — the order becomes Out for Delivery, the driver goes Busy, the vehicle goes Assigned.
7. Open **Control Tower** — the driver appears on the map and moves along a real pickup→customer route every ~3 seconds; ETA updates as progress advances.
8. When the route completes, the order is auto-marked Delivered and the driver/vehicle return to Available — reflected immediately on the **Dashboard** KPIs.

## Deployment

Any Next.js-compatible host works (Vercel is the simplest):

```bash
npm run build
npm start
```

Note: because the demo store lives in server memory, a serverless deployment
(each request potentially a cold function instance) will reseed on first hit
per instance and may show inconsistent state across concurrent requests.
This is fine for a single-instance demo (e.g. a small VM, or Vercel with a
single always-warm function) but should be replaced with the Supabase-backed
repositories described above before any real multi-instance production use.
