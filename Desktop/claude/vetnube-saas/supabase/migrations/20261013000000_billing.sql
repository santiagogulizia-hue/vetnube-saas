-- =====================================================================
-- VetNube SaaS · Migración 3 · Suscripción de cada clínica con Mercado Pago
-- Ejecutar DESPUÉS de las migraciones 1 y 2. Se puede correr una sola vez.
--
-- Las columnas de facturación NO están en el GRANT de UPDATE de clinics
-- (migración 1), así que ningún usuario puede modificarlas desde la API:
-- solo el servidor con la service_role key (webhook y acciones de facturación).
-- =====================================================================

create type public.subscription_status as enum (
  'trial',      -- período de prueba gratuito
  'pending',    -- reservado: suscripción creada, falta autorizar el pago
  'active',     -- Mercado Pago autorizó el débito automático
  'past_due',   -- falló un cobro (Mercado Pago reintenta)
  'paused',
  'cancelled'
);

alter table public.clinics
  add column if not exists plan                    text not null default 'profesional',
  add column if not exists subscription_status     public.subscription_status not null default 'trial',
  add column if not exists trial_ends_at           timestamptz not null default (now() + interval '14 days'),
  add column if not exists mp_preapproval_id       text unique,
  add column if not exists mp_payer_email          text,
  add column if not exists next_billing_at         timestamptz,
  add column if not exists subscription_updated_at timestamptz;

-- Historial de notificaciones y cobros (lo escribe el webhook)
create table if not exists public.billing_events (
  id          bigint generated always as identity primary key,
  clinic_id   uuid references public.clinics (id) on delete set null,
  provider    text not null default 'mercadopago',
  topic       text not null,               -- subscription_preapproval | subscription_authorized_payment
  resource_id text not null,
  status      text,
  amount      numeric(12, 2),
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (provider, topic, resource_id, status)  -- idempotencia: Mercado Pago reintenta notificaciones
);
create index if not exists billing_events_clinic_idx on public.billing_events (clinic_id, created_at desc);

alter table public.billing_events enable row level security;

-- Solo dueño/a y administración ven el historial de facturación; nadie escribe desde la API
create policy billing_events_select on public.billing_events for select to authenticated
  using (public.has_role(clinic_id, array['owner', 'admin']::public.member_role[]));
