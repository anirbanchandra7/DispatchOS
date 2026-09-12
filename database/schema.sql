-- Last Mile Dispatch & Fulfilment - Supabase/PostgreSQL schema
-- This is the target relational schema for production use. The running MVP
-- uses an in-memory store (see /lib/store) that implements the same shape,
-- so migrating to this schema later only requires swapping the repository
-- implementations in /lib/store/repositories to Supabase queries.

create extension if not exists "uuid-ossp";

-- ---------- Enums ----------
create type user_role as enum ('ADMIN','OPERATIONS_MANAGER','FULFILMENT_OPERATOR','DISPATCHER','DRIVER');
create type platform as enum ('UBER_EATS','DELIVEROO');
create type order_status as enum (
  'RECEIVED','ACCEPTED','PICKING','READY','DRIVER_ASSIGNED','VEHICLE_ASSIGNED',
  'DISPATCHED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','FAILED'
);
create type fulfilment_status as enum ('PENDING','IN_PROGRESS','READY','COMPLETED','CANCELLED');
create type payment_method as enum ('CARD','CASH','WALLET','ONLINE');
create type driver_status as enum ('AVAILABLE','BUSY','ON_BREAK','OFFLINE','INACTIVE');
create type employment_type as enum ('FULL_TIME','PART_TIME','GIG');
create type driver_owned_vehicle_status as enum ('AVAILABLE','ASSIGNED','IN_SERVICE','MAINTENANCE','INACTIVE');
create type company_vehicle_status as enum ('AVAILABLE','ASSIGNED','IN_TRANSIT','MAINTENANCE','INACTIVE');
create type vehicle_type as enum ('MOTORBIKE','SCOOTER','CAR','VAN','TRUCK','BICYCLE');
create type vehicle_ownership as enum ('DRIVER_OWNED','COMPANY');
create type document_type as enum ('DRIVING_LICENCE','ID_DOCUMENT','VEHICLE_REGISTRATION','VEHICLE_INSURANCE','OTHER');
create type document_status as enum ('VALID','EXPIRING_SOON','EXPIRED');
create type inventory_txn_type as enum ('RESERVE','RELEASE','DEDUCT','RESTOCK','ADJUSTMENT');
create type notification_type as enum (
  'ORDER_RECEIVED','ORDER_AT_RISK','DRIVER_ASSIGNED','VEHICLE_ASSIGNED',
  'ORDER_DISPATCHED','ORDER_COLLECTED','ORDER_DELIVERED','ORDER_FAILED',
  'ORDER_HELD_STOCK','DRIVER_ARRIVED','DOCUMENT_EXPIRING','LOW_STOCK','GENERIC'
);
create type delivery_run_status as enum (
  'EN_ROUTE_PICKUP','AT_PICKUP','EN_ROUTE_CUSTOMER','ARRIVED_AT_CUSTOMER','DELIVERED'
);

-- ---------- Users ----------
create table users (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text unique not null,
  role user_role not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Drivers ----------
create table drivers (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text not null,
  avatar_url text,
  licence_number text not null,
  licence_expiry date not null,
  status driver_status not null default 'OFFLINE',
  employment_type employment_type not null,
  has_own_vehicle boolean not null default false,
  own_vehicle_id uuid,
  current_lat double precision,
  current_lng double precision,
  current_location_label text,
  current_order_id uuid,
  shift_start timestamptz,
  shift_end timestamptz,
  delivery_count int not null default 0,
  successful_deliveries int not null default 0,
  failed_deliveries int not null default 0,
  rating numeric(2,1) not null default 5.0,
  home_depot_lat double precision,
  home_depot_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table driver_documents (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid not null references drivers(id) on delete cascade,
  type document_type not null,
  document_number text not null,
  expiry_date date,
  file_ref text not null, -- storage object key in production (Supabase Storage); RLS restricts this table to ADMIN/OPERATIONS_MANAGER
  file_name text,
  mime_type text,
  status document_status not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by text
);

-- ---------- Driver-owned vehicles ----------
create table driver_owned_vehicles (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid not null references drivers(id) on delete cascade,
  registration_number text not null,
  make text not null,
  model text not null,
  year int not null,
  vehicle_type vehicle_type not null,
  colour text,
  insurance_expiry date not null,
  registration_expiry date not null,
  status driver_owned_vehicle_status not null default 'AVAILABLE',
  capacity_kg numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table drivers add constraint fk_drivers_own_vehicle
  foreign key (own_vehicle_id) references driver_owned_vehicles(id);

-- ---------- Company vehicles ----------
create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  registration_number text not null,
  make text not null,
  model text not null,
  year int not null,
  vehicle_type vehicle_type not null,
  capacity_kg numeric not null default 0,
  status company_vehicle_status not null default 'AVAILABLE',
  insurance_expiry date not null,
  registration_expiry date not null,
  inspection_expiry date not null,
  current_driver_id uuid references drivers(id),
  current_lat double precision,
  current_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Polymorphic-ish document table for both driver-owned and company vehicles
create table vehicle_documents (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null,
  ownership vehicle_ownership not null,
  type document_type not null,
  expiry_date date not null,
  file_ref text not null, -- storage object key in production (Supabase Storage); see file_name/mime_type
  file_name text,
  mime_type text,
  status document_status not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by text
);

-- ---------- Orders ----------
create table orders (
  id uuid primary key default uuid_generate_v4(),
  external_order_id text not null,
  source platform not null,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  delivery_lat double precision not null,
  delivery_lng double precision not null,
  pickup_name text not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  order_time timestamptz not null default now(),
  requested_delivery_time timestamptz not null,
  order_value numeric(10,2) not null,
  payment_method payment_method not null,
  status order_status not null default 'RECEIVED',
  fulfilment_status fulfilment_status not null default 'PENDING',
  driver_id uuid references drivers(id),
  vehicle_id uuid,
  vehicle_ownership vehicle_ownership,
  delivery_notes text,
  cancel_reason text,
  failure_reason text,
  auto_accepted boolean not null default false,
  accepted_at timestamptz,
  ready_at timestamptz,
  dispatched_at timestamptz,
  arrived_at_pickup_at timestamptz,
  collected_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  sku text not null,
  product_name text not null,
  quantity int not null,
  unit_price numeric(10,2) not null
);

create table order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  changed_at timestamptz not null default now(),
  changed_by text not null,
  note text
);

-- ---------- Inventory ----------
create table inventory (
  id uuid primary key default uuid_generate_v4(),
  sku text unique not null,
  product_name text not null,
  category text not null,
  quantity_on_hand int not null default 0,
  reserved_quantity int not null default 0,
  reorder_threshold int not null default 0,
  unit text not null,
  location text not null,
  updated_at timestamptz not null default now()
);

create table inventory_transactions (
  id uuid primary key default uuid_generate_v4(),
  sku text not null references inventory(sku),
  type inventory_txn_type not null,
  quantity int not null,
  order_id uuid references orders(id),
  note text,
  created_at timestamptz not null default now()
);

-- ---------- Fulfilment / dispatch / delivery ----------
create table fulfilments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status fulfilment_status not null default 'PENDING',
  started_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz
);

create table dispatches (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  driver_id uuid not null references drivers(id),
  vehicle_id uuid not null,
  vehicle_ownership vehicle_ownership not null,
  dispatched_at timestamptz not null default now(),
  eta_minutes int not null,
  dispatched_by text not null
);

create table delivery_runs (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  driver_id uuid not null references drivers(id),
  route_points jsonb not null,
  progress numeric not null default 0,
  status delivery_run_status not null default 'EN_ROUTE_PICKUP',
  speed_kmh numeric not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_gps_update timestamptz not null default now()
);

create table gps_locations (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid not null references drivers(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  speed_kmh numeric not null default 0,
  heading numeric not null default 0,
  recorded_at timestamptz not null default now()
);
create index idx_gps_locations_driver_time on gps_locations (driver_id, recorded_at desc);

-- ---------- Platform integrations ----------
create table platform_integrations (
  id uuid primary key default uuid_generate_v4(),
  platform platform not null unique,
  is_active boolean not null default true,
  last_sync_at timestamptz,
  mode text not null default 'MOCK' -- 'MOCK' | 'LIVE'
);

-- ---------- Notifications ----------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  type notification_type not null,
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false,
  related_order_id uuid references orders(id),
  related_driver_id uuid references drivers(id),
  related_vehicle_id uuid
);

-- ---------- Audit log ----------
create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor text not null,
  timestamp timestamptz not null default now(),
  details text
);

-- ---------- App settings ----------
-- Single-row table of operational toggles (auto-accept, etc). In a
-- multi-tenant deployment this would be scoped by org/depot id.
create table app_settings (
  id uuid primary key default uuid_generate_v4(),
  auto_accept_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Row Level Security is intended to be enabled per-table once real
-- Supabase Auth is wired up, scoping DRIVER role rows to their own
-- driver_id and other roles per the RBAC matrix in /lib/auth/permissions.ts.
