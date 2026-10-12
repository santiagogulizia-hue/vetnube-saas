-- =====================================================================
-- VetNube SaaS · Fase 1 · Esquema base (Supabase / PostgreSQL 15+)
-- Multi-tenant: cada fila de negocio pertenece a una clínica (clinic_id)
-- y Row Level Security limita el acceso a los miembros de esa clínica.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensiones
-- ---------------------------------------------------------------------
create extension if not exists pg_trgm    with schema extensions;  -- búsqueda difusa
create extension if not exists btree_gist with schema extensions;  -- anti-superposición de turnos

-- ---------------------------------------------------------------------
-- 1. Tipos enumerados
-- ---------------------------------------------------------------------
create type public.member_role          as enum ('owner', 'admin', 'vet', 'reception');
create type public.species              as enum ('canino', 'felino', 'ave', 'conejo', 'roedor', 'reptil', 'exotico', 'otro');
create type public.pet_sex              as enum ('macho', 'hembra', 'desconocido');
create type public.appointment_type     as enum ('consulta', 'control', 'cirugia', 'vacunacion', 'peluqueria', 'otro');
create type public.appointment_status   as enum ('pendiente', 'confirmado', 'en_espera', 'en_atencion', 'atendido', 'cancelado', 'ausente');
create type public.record_type          as enum ('consulta', 'control', 'cirugia', 'urgencia', 'internacion', 'nota');
create type public.immunization_kind    as enum ('vacuna', 'desparasitacion_interna', 'desparasitacion_externa');
create type public.product_category     as enum ('medicamento', 'alimento', 'accesorio', 'vacuna', 'antiparasitario', 'higiene', 'servicio', 'otro');
create type public.stock_movement_type  as enum ('compra', 'venta', 'ajuste', 'anulacion_venta', 'vencimiento', 'uso_interno');
create type public.payment_method       as enum ('efectivo', 'debito', 'credito', 'transferencia', 'mercado_pago', 'otro');
create type public.sale_status          as enum ('completada', 'anulada');
create type public.reminder_kind        as enum ('turno', 'vacuna', 'control', 'deuda');
create type public.reminder_channel     as enum ('whatsapp', 'email', 'sms');
create type public.reminder_status      as enum ('programado', 'enviado', 'entregado', 'leido', 'fallido', 'cancelado');

-- ---------------------------------------------------------------------
-- 2. Tenencia: clínicas, usuarios y membresías
-- ---------------------------------------------------------------------
create table public.clinics (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null check (length(trim(name)) > 0),
  slug                     text unique,
  tax_id                   text,                          -- CUIT / RUT / NIF
  phone                    text,
  email                    text,
  address                  text,
  city                     text,
  country_code             char(2) not null default 'AR',
  timezone                 text not null default 'America/Argentina/Buenos_Aires',
  currency                 char(3) not null default 'ARS',
  whatsapp_phone_number_id text,                          -- id del número en WhatsApp Cloud API
  settings                 jsonb not null default '{}'::jsonb,
  last_sale_number         bigint not null default 0,     -- correlativo de ventas (lo usa create_sale)
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- "users": perfil público 1:1 con auth.users (Supabase Auth gestiona email/contraseña)
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text,
  phone          text,
  license_number text,                                     -- matrícula profesional
  avatar_url     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.clinic_members (
  clinic_id  uuid not null references public.clinics (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.member_role not null default 'reception',
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);
create index clinic_members_user_idx on public.clinic_members (user_id);

create table public.clinic_invitations (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  email       text not null,
  role        public.member_role not null default 'reception' check (role <> 'owner'),
  token       uuid not null unique default gen_random_uuid(),
  invited_by  uuid references public.profiles (id) on delete set null,
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
create index clinic_invitations_clinic_idx on public.clinic_invitations (clinic_id);

-- Helpers de autorización (SECURITY DEFINER para evitar recursión de RLS)
create or replace function public.is_member(p_clinic_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clinic_members m
    where m.clinic_id = p_clinic_id and m.user_id = (select auth.uid()) and m.active
  );
$$;

create or replace function public.has_role(p_clinic_id uuid, p_roles public.member_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clinic_members m
    where m.clinic_id = p_clinic_id and m.user_id = (select auth.uid()) and m.active
      and m.role = any (p_roles)
  );
$$;

create or replace function public.shares_clinic_with(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clinic_members a
    join public.clinic_members b on b.clinic_id = a.clinic_id
    where a.user_id = (select auth.uid()) and a.active and b.user_id = p_user_id
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Clientes (tutores) y mascotas (pacientes)
--    Las FK compuestas (clinic_id, id) impiden cruzar datos entre clínicas.
-- ---------------------------------------------------------------------
create table public.clients (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  first_name      text not null check (length(trim(first_name)) > 0),
  last_name       text not null default '',
  document_id     text,                                    -- DNI / CUIT
  phone           text,                                    -- formato E.164 recomendado (+5491155550101)
  whatsapp_opt_in boolean not null default true,           -- consentimiento para recordatorios
  email           text,
  address         text,
  city            text,
  notes           text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,                             -- baja lógica
  unique (clinic_id, id),
  unique (clinic_id, document_id)
);
create index clients_clinic_idx on public.clients (clinic_id) where deleted_at is null;
create index clients_search_idx on public.clients using gin (
  (first_name || ' ' || last_name || ' ' || coalesce(document_id, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(email, ''))
  extensions.gin_trgm_ops
);

create table public.pets (
  id                   uuid primary key default gen_random_uuid(),
  clinic_id            uuid not null references public.clinics (id) on delete cascade,
  client_id            uuid not null,
  name                 text not null check (length(trim(name)) > 0),
  species              public.species not null,
  breed                text,
  sex                  public.pet_sex not null default 'desconocido',
  birth_date           date check (birth_date <= current_date),
  birth_date_estimated boolean not null default false,
  color                text,
  neutered             boolean not null default false,
  microchip            text,
  weight_kg            numeric(6, 2) check (weight_kg > 0),  -- último peso (lo sincroniza un trigger)
  allergies            text,
  chronic_conditions   text,
  notes                text,
  photo_path           text,                                 -- ruta en Storage
  deceased_at          date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  unique (clinic_id, id),
  unique (clinic_id, microchip),
  foreign key (clinic_id, client_id) references public.clients (clinic_id, id) on delete restrict
);
create index pets_client_idx on public.pets (client_id);
create index pets_search_idx on public.pets using gin (
  (name || ' ' || coalesce(breed, '') || ' ' || coalesce(microchip, '')) extensions.gin_trgm_ops
);

-- ---------------------------------------------------------------------
-- 4. Agenda / turnero
-- ---------------------------------------------------------------------
create table public.appointments (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics (id) on delete cascade,
  pet_id        uuid not null,
  vet_id        uuid references public.profiles (id) on delete set null,
  type          public.appointment_type not null default 'consulta',
  status        public.appointment_status not null default 'pendiente',
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  reason        text,
  notes         text,
  confirmed_at  timestamptz,
  checked_in_at timestamptz,
  attended_at   timestamptz,
  cancelled_at  timestamptz,
  cancel_reason text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (clinic_id, id),
  foreign key (clinic_id, pet_id) references public.pets (clinic_id, id) on delete cascade,
  -- un profesional no puede tener dos turnos activos superpuestos
  constraint appointments_no_overlap exclude using gist (
    vet_id with =, tstzrange(starts_at, ends_at, '[)') with &&
  ) where (vet_id is not null and status not in ('cancelado', 'ausente'))
);
create index appointments_clinic_time_idx on public.appointments (clinic_id, starts_at);
create index appointments_pet_idx on public.appointments (pet_id, starts_at desc);

-- ---------------------------------------------------------------------
-- 5. Historia clínica
-- ---------------------------------------------------------------------
create table public.medical_records (
  id                   uuid primary key default gen_random_uuid(),
  clinic_id            uuid not null references public.clinics (id) on delete cascade,
  pet_id               uuid not null,
  appointment_id       uuid,
  vet_id               uuid references public.profiles (id) on delete set null,
  record_type          public.record_type not null default 'consulta',
  visit_at             timestamptz not null default now(),
  reason               text not null,                        -- motivo de consulta
  anamnesis            text,
  physical_exam        text,
  weight_kg            numeric(6, 2) check (weight_kg > 0),
  temperature_c        numeric(4, 1) check (temperature_c between 25 and 45),
  heart_rate_bpm       smallint check (heart_rate_bpm > 0),
  respiratory_rate_rpm smallint check (respiratory_rate_rpm > 0),
  mucous_membranes     text,
  capillary_refill_s   numeric(3, 1) check (capillary_refill_s >= 0),
  body_condition_score smallint check (body_condition_score between 1 and 9),
  diagnosis            text,
  treatment            text,
  prescription         text,
  next_control_on      date,
  created_by           uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (clinic_id, id),
  foreign key (clinic_id, pet_id) references public.pets (clinic_id, id) on delete cascade,
  foreign key (clinic_id, appointment_id) references public.appointments (clinic_id, id) on delete set null (appointment_id)
);
create index medical_records_pet_idx on public.medical_records (pet_id, visit_at desc);

create table public.immunizations (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics (id) on delete cascade,
  pet_id            uuid not null,
  medical_record_id uuid,
  product_id        uuid,                                    -- FK agregada tras crear products
  kind              public.immunization_kind not null,
  name              text not null,                           -- "Séxtuple", "Antirrábica", "Pipeta 10-25 kg"
  batch_number      text,
  applied_on        date not null default current_date,
  next_due_on       date check (next_due_on is null or next_due_on > applied_on),
  vet_id            uuid references public.profiles (id) on delete set null,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (clinic_id, id),
  foreign key (clinic_id, pet_id) references public.pets (clinic_id, id) on delete cascade,
  foreign key (clinic_id, medical_record_id) references public.medical_records (clinic_id, id) on delete set null (medical_record_id)
);
create index immunizations_pet_idx on public.immunizations (pet_id, applied_on desc);
create index immunizations_due_idx on public.immunizations (clinic_id, next_due_on) where next_due_on is not null;

create table public.attachments (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics (id) on delete cascade,
  pet_id            uuid not null,
  medical_record_id uuid,
  storage_path      text not null unique,                    -- {clinic_id}/{pet_id}/{uuid}-{archivo}
  file_name         text not null,
  mime_type         text,
  size_bytes        bigint check (size_bytes between 1 and 26214400),  -- 25 MB
  uploaded_by       uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  foreign key (clinic_id, pet_id) references public.pets (clinic_id, id) on delete cascade,
  foreign key (clinic_id, medical_record_id) references public.medical_records (clinic_id, id) on delete set null (medical_record_id)
);
create index attachments_pet_idx on public.attachments (pet_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6. Inventario
-- ---------------------------------------------------------------------
create table public.products (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics (id) on delete cascade,
  sku           text,
  barcode       text,
  name          text not null check (length(trim(name)) > 0),
  category      public.product_category not null,
  description   text,
  unit          text not null default 'unidad',
  cost          numeric(12, 2) not null default 0 check (cost >= 0),
  price         numeric(12, 2) not null check (price >= 0),
  tax_rate      numeric(5, 2) not null default 21 check (tax_rate between 0 and 100),
  stock         numeric(12, 3) not null default 0,           -- caché: solo lo mueve stock_movements
  min_stock     numeric(12, 3) not null default 0 check (min_stock >= 0),
  tracks_expiry boolean not null default false,              -- maneja lotes con vencimiento
  is_service    boolean not null default false,              -- consulta, baño, cirugía: sin stock
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (clinic_id, id),
  unique (clinic_id, sku),
  unique (clinic_id, barcode)
);
create index products_search_idx on public.products using gin (
  (name || ' ' || coalesce(sku, '') || ' ' || coalesce(barcode, '')) extensions.gin_trgm_ops
);

alter table public.immunizations
  add foreign key (clinic_id, product_id) references public.products (clinic_id, id) on delete set null (product_id);

create table public.product_batches (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics (id) on delete cascade,
  product_id   uuid not null,
  batch_number text,
  expires_on   date,
  quantity     numeric(12, 3) not null default 0 check (quantity >= 0),
  received_at  timestamptz not null default now(),
  unique (clinic_id, id),
  foreign key (clinic_id, product_id) references public.products (clinic_id, id) on delete cascade
);
create index product_batches_expiry_idx on public.product_batches (clinic_id, expires_on) where quantity > 0;

-- ---------------------------------------------------------------------
-- 7. Caja y ventas (POS)
-- ---------------------------------------------------------------------
create table public.cash_sessions (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  opened_by      uuid references public.profiles (id) on delete set null,
  opened_at      timestamptz not null default now(),
  opening_amount numeric(12, 2) not null default 0 check (opening_amount >= 0),
  closed_by      uuid references public.profiles (id) on delete set null,
  closed_at      timestamptz,
  expected_cash  numeric(12, 2),
  counted_cash   numeric(12, 2),
  notes          text,
  unique (clinic_id, id)
);
create unique index cash_sessions_one_open on public.cash_sessions (clinic_id) where closed_at is null;

create table public.sales (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  number          bigint not null,
  client_id       uuid,
  cash_session_id uuid,
  sold_by         uuid references public.profiles (id) on delete set null,
  sold_at         timestamptz not null default now(),
  subtotal        numeric(12, 2) not null default 0,
  discount        numeric(12, 2) not null default 0 check (discount >= 0),
  total           numeric(12, 2) not null default 0 check (total >= 0),
  status          public.sale_status not null default 'completada',
  voided_at       timestamptz,
  voided_by       uuid references public.profiles (id) on delete set null,
  void_reason     text,
  invoice_number  text,                                      -- factura electrónica (fase posterior)
  notes           text,
  created_at      timestamptz not null default now(),
  unique (clinic_id, id),
  unique (clinic_id, number),
  foreign key (clinic_id, client_id) references public.clients (clinic_id, id) on delete restrict,
  foreign key (clinic_id, cash_session_id) references public.cash_sessions (clinic_id, id) on delete set null (cash_session_id)
);
create index sales_clinic_time_idx on public.sales (clinic_id, sold_at desc);
create index sales_client_idx on public.sales (client_id, sold_at desc);

create table public.sale_items (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  sale_id     uuid not null,
  product_id  uuid,                                          -- null = ítem libre
  pet_id      uuid,                                          -- a qué paciente se aplicó (opcional)
  description text not null,
  quantity    numeric(12, 3) not null check (quantity > 0),
  unit_price  numeric(12, 2) not null check (unit_price >= 0),
  discount    numeric(12, 2) not null default 0 check (discount >= 0),
  line_total  numeric(12, 2) generated always as (round(quantity * unit_price - discount, 2)) stored,
  check (discount <= quantity * unit_price),
  foreign key (clinic_id, sale_id) references public.sales (clinic_id, id) on delete cascade,
  foreign key (clinic_id, product_id) references public.products (clinic_id, id) on delete restrict,
  foreign key (clinic_id, pet_id) references public.pets (clinic_id, id) on delete set null (pet_id)
);
create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_product_idx on public.sale_items (product_id);

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  sale_id         uuid,                                      -- null = pago a cuenta corriente
  client_id       uuid,
  cash_session_id uuid,
  method          public.payment_method not null,
  amount          numeric(12, 2) not null check (amount > 0),
  paid_at         timestamptz not null default now(),
  received_by     uuid references public.profiles (id) on delete set null,
  refunded_at     timestamptz,
  notes           text,
  check (sale_id is not null or client_id is not null),
  foreign key (clinic_id, sale_id) references public.sales (clinic_id, id) on delete cascade,
  foreign key (clinic_id, client_id) references public.clients (clinic_id, id) on delete restrict,
  foreign key (clinic_id, cash_session_id) references public.cash_sessions (clinic_id, id) on delete set null (cash_session_id)
);
create index payments_clinic_time_idx on public.payments (clinic_id, paid_at desc);
create index payments_client_idx on public.payments (client_id);

-- Libro de stock inmutable: toda variación de inventario queda registrada
create table public.stock_movements (
  id         bigint generated always as identity primary key,
  clinic_id  uuid not null references public.clinics (id) on delete cascade,
  product_id uuid not null,
  batch_id   uuid,
  type       public.stock_movement_type not null,
  quantity   numeric(12, 3) not null check (quantity <> 0),  -- con signo: + entra, − sale
  unit_cost  numeric(12, 2),
  sale_id    uuid,
  notes      text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (clinic_id, product_id) references public.products (clinic_id, id) on delete cascade,
  foreign key (clinic_id, batch_id) references public.product_batches (clinic_id, id) on delete set null (batch_id),
  foreign key (clinic_id, sale_id) references public.sales (clinic_id, id) on delete set null (sale_id)
);
create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);
create index stock_movements_sale_idx on public.stock_movements (sale_id) where sale_id is not null;

-- ---------------------------------------------------------------------
-- 8. Recordatorios (cola que consume la Edge Function de WhatsApp)
-- ---------------------------------------------------------------------
create table public.reminders (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null references public.clinics (id) on delete cascade,
  kind                public.reminder_kind not null,
  channel             public.reminder_channel not null default 'whatsapp',
  client_id           uuid not null,
  pet_id              uuid,
  appointment_id      uuid,
  immunization_id     uuid,
  scheduled_for       timestamptz not null,
  status              public.reminder_status not null default 'programado',
  template_name       text,
  payload             jsonb not null default '{}'::jsonb,
  provider_message_id text,
  error               text,
  attempts            smallint not null default 0,
  sent_at             timestamptz,
  created_at          timestamptz not null default now(),
  foreign key (clinic_id, client_id) references public.clients (clinic_id, id) on delete cascade,
  foreign key (clinic_id, pet_id) references public.pets (clinic_id, id) on delete cascade,
  foreign key (clinic_id, appointment_id) references public.appointments (clinic_id, id) on delete cascade,
  foreign key (clinic_id, immunization_id) references public.immunizations (clinic_id, id) on delete cascade
);
create index reminders_queue_idx on public.reminders (scheduled_for) where status = 'programado';
create unique index reminders_once_per_appointment on public.reminders (appointment_id, kind, channel) where appointment_id is not null;
create unique index reminders_once_per_immunization on public.reminders (immunization_id, kind, channel) where immunization_id is not null;
create unique index reminders_provider_msg on public.reminders (provider_message_id) where provider_message_id is not null;

-- =====================================================================
-- 9. Triggers
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['clinics', 'profiles', 'clients', 'pets', 'appointments', 'medical_records', 'immunizations', 'products']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- Alta automática del perfil al registrarse en Supabase Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sello de tiempo de cada cambio de estado del turno
create or replace function public.appointment_status_stamps()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    case new.status
      when 'confirmado' then new.confirmed_at  := coalesce(new.confirmed_at, now());
      when 'en_espera'  then new.checked_in_at := coalesce(new.checked_in_at, now());
      when 'atendido'   then new.attended_at   := coalesce(new.attended_at, now());
      when 'cancelado'  then new.cancelled_at  := coalesce(new.cancelled_at, now());
      else null;
    end case;
  end if;
  return new;
end $$;

create trigger appointments_status_stamps
  before update of status on public.appointments
  for each row execute function public.appointment_status_stamps();

-- El peso de la consulta más reciente pasa a la ficha del paciente
create or replace function public.sync_pet_weight()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.weight_kg is not null and not exists (
    select 1 from public.medical_records r
    where r.pet_id = new.pet_id and r.id <> new.id and r.weight_kg is not null and r.visit_at > new.visit_at
  ) then
    update public.pets set weight_kg = new.weight_kg where id = new.pet_id;
  end if;
  return new;
end $$;

create trigger medical_records_sync_weight
  after insert or update of weight_kg, visit_at on public.medical_records
  for each row execute function public.sync_pet_weight();

-- Cada movimiento de stock actualiza el producto y su lote
create or replace function public.apply_stock_movement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.products set stock = stock + new.quantity where id = new.product_id;
  if new.batch_id is not null then
    update public.product_batches set quantity = quantity + new.quantity where id = new.batch_id;
  end if;
  return new;
end $$;

create trigger stock_movements_apply
  after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- =====================================================================
-- 10. Vistas de negocio (security_invoker: respetan RLS del usuario)
-- =====================================================================
create view public.v_client_balances with (security_invoker = true) as
select
  c.id as client_id,
  c.clinic_id,
  coalesce(s.total, 0)                        as total_purchased,
  coalesce(p.total, 0)                        as total_paid,
  coalesce(s.total, 0) - coalesce(p.total, 0) as balance          -- > 0 = deuda
from public.clients c
left join (
  select client_id, sum(total) as total from public.sales
  where status = 'completada' and client_id is not null group by client_id
) s on s.client_id = c.id
left join (
  select client_id, sum(amount) as total from public.payments
  where refunded_at is null and client_id is not null group by client_id
) p on p.client_id = c.id;

-- Última aplicación de cada vacuna/antiparasitario por paciente con próxima dosis
create view public.v_immunizations_due with (security_invoker = true) as
select * from (
  select distinct on (i.pet_id, i.kind, lower(i.name))
    i.id as immunization_id, i.clinic_id, i.pet_id, p.name as pet_name, p.species,
    c.id as client_id, trim(c.first_name || ' ' || c.last_name) as client_name,
    c.phone, c.whatsapp_opt_in,
    i.kind, i.name, i.applied_on, i.next_due_on,
    (i.next_due_on - current_date) as days_left
  from public.immunizations i
  join public.pets p    on p.id = i.pet_id and p.deleted_at is null and p.deceased_at is null
  join public.clients c on c.id = p.client_id and c.deleted_at is null
  order by i.pet_id, i.kind, lower(i.name), i.applied_on desc
) latest
where next_due_on is not null;

create view public.v_low_stock with (security_invoker = true) as
select id as product_id, clinic_id, name, category, stock, min_stock
from public.products
where active and not is_service and stock <= min_stock;

create view public.v_expiring_batches with (security_invoker = true) as
select b.id as batch_id, b.clinic_id, b.product_id, p.name as product_name,
       b.batch_number, b.expires_on, b.quantity, (b.expires_on - current_date) as days_left
from public.product_batches b
join public.products p on p.id = b.product_id
where b.quantity > 0 and b.expires_on is not null and b.expires_on <= current_date + 90;

-- =====================================================================
-- 11. Funciones RPC (lógica transaccional; se llaman con supabase.rpc)
-- =====================================================================

-- Alta de clínica: el creador queda como owner
create or replace function public.create_clinic(p_name text, p_timezone text default 'America/Argentina/Buenos_Aires')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Necesitás iniciar sesión' using errcode = '42501';
  end if;
  perform now() at time zone p_timezone;  -- valida la zona horaria
  insert into public.clinics (name, timezone) values (p_name, p_timezone) returning id into v_id;
  insert into public.clinic_members (clinic_id, user_id, role) values (v_id, v_uid, 'owner');
  return v_id;
end $$;

-- Aceptar invitación de un colaborador
create or replace function public.accept_invitation(p_token uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv   public.clinic_invitations;
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    raise exception 'Necesitás iniciar sesión' using errcode = '42501';
  end if;
  select * into v_inv from public.clinic_invitations
  where token = p_token and accepted_at is null and expires_at > now()
  for update;
  if not found then
    raise exception 'La invitación no existe o está vencida';
  end if;
  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'Esta invitación es para otro email';
  end if;
  insert into public.clinic_members (clinic_id, user_id, role)
  values (v_inv.clinic_id, auth.uid(), v_inv.role)
  on conflict (clinic_id, user_id) do update set role = excluded.role, active = true;
  update public.clinic_invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.clinic_id;
end $$;

-- Ingreso de mercadería (crea lote si corresponde)
create or replace function public.receive_stock(
  p_product_id uuid, p_quantity numeric, p_unit_cost numeric default null,
  p_batch_number text default null, p_expires_on date default null, p_notes text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_p     public.products;
  v_batch uuid;
begin
  select * into v_p from public.products where id = p_product_id for update;
  if not found or not public.is_member(v_p.clinic_id) then
    raise exception 'Producto inexistente' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;
  if v_p.tracks_expiry then
    if p_expires_on is null then
      raise exception 'Este producto requiere fecha de vencimiento';
    end if;
    insert into public.product_batches (clinic_id, product_id, batch_number, expires_on)
    values (v_p.clinic_id, v_p.id, p_batch_number, p_expires_on) returning id into v_batch;
  end if;
  insert into public.stock_movements (clinic_id, product_id, batch_id, type, quantity, unit_cost, notes, created_by)
  values (v_p.clinic_id, v_p.id, v_batch, 'compra', p_quantity, p_unit_cost, p_notes, auth.uid());
  if p_unit_cost is not null then
    update public.products set cost = p_unit_cost where id = v_p.id;
  end if;
end $$;

-- Ajuste manual de inventario (rotura, conteo, uso interno, vencido)
create or replace function public.adjust_stock(
  p_product_id uuid, p_quantity numeric, p_type public.stock_movement_type default 'ajuste',
  p_batch_id uuid default null, p_notes text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_clinic uuid;
begin
  select clinic_id into v_clinic from public.products where id = p_product_id;
  if v_clinic is null or not public.has_role(v_clinic, array['owner', 'admin', 'vet']::public.member_role[]) then
    raise exception 'No tenés permiso para ajustar stock' using errcode = '42501';
  end if;
  if p_type not in ('ajuste', 'uso_interno', 'vencimiento') then
    raise exception 'Tipo de ajuste inválido';
  end if;
  insert into public.stock_movements (clinic_id, product_id, batch_id, type, quantity, notes, created_by)
  values (v_clinic, p_product_id, p_batch_id, p_type, p_quantity, p_notes, auth.uid());
end $$;

-- Apertura y cierre de caja diaria
create or replace function public.open_cash_session(p_clinic_id uuid, p_opening_amount numeric default 0)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_member(p_clinic_id) then
    raise exception 'No pertenecés a esta clínica' using errcode = '42501';
  end if;
  insert into public.cash_sessions (clinic_id, opened_by, opening_amount)
  values (p_clinic_id, auth.uid(), coalesce(p_opening_amount, 0)) returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Ya hay una caja abierta en esta clínica';
end $$;

create or replace function public.close_cash_session(p_session_id uuid, p_counted_cash numeric, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_s        public.cash_sessions;
  v_by_method jsonb;
  v_cash     numeric;
begin
  select * into v_s from public.cash_sessions where id = p_session_id and closed_at is null for update;
  if not found or not public.is_member(v_s.clinic_id) then
    raise exception 'La caja no existe o ya está cerrada';
  end if;
  select coalesce(jsonb_object_agg(method, total), '{}'::jsonb) into v_by_method from (
    select method, sum(amount) as total from public.payments
    where cash_session_id = v_s.id and refunded_at is null group by method
  ) t;
  v_cash := v_s.opening_amount + coalesce((v_by_method ->> 'efectivo')::numeric, 0);
  update public.cash_sessions
     set closed_at = now(), closed_by = auth.uid(), expected_cash = v_cash,
         counted_cash = p_counted_cash, notes = p_notes
   where id = v_s.id;
  return jsonb_build_object('by_method', v_by_method, 'expected_cash', v_cash,
                            'counted_cash', p_counted_cash, 'difference', p_counted_cash - v_cash);
end $$;

-- Venta atómica: ítems + descuento de stock (FEFO por lote) + pagos
-- p_items:    [{"product_id": uuid, "quantity": 1, "unit_price": opcional, "discount": 0, "pet_id": opcional}
--              | {"description": "Consulta clínica", "quantity": 1, "unit_price": 12000}]
-- p_payments: [{"method": "efectivo", "amount": 5000}, ...]  (si suman menos que el total, el saldo va a cuenta corriente)
create or replace function public.create_sale(
  p_clinic_id uuid, p_client_id uuid, p_items jsonb,
  p_payments jsonb default '[]'::jsonb, p_discount numeric default 0, p_notes text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_sale    uuid;
  v_number  bigint;
  v_session uuid;
  v_item    jsonb;
  v_pay     jsonb;
  v_p       public.products;
  v_qty     numeric;
  v_price   numeric;
  v_left    numeric;
  v_take    numeric;
  v_batch   record;
  v_total   numeric;
  v_paid    numeric := 0;
begin
  if not public.is_member(p_clinic_id) then
    raise exception 'No pertenecés a esta clínica' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene ítems';
  end if;

  update public.clinics set last_sale_number = last_sale_number + 1
   where id = p_clinic_id returning last_sale_number into v_number;
  select id into v_session from public.cash_sessions where clinic_id = p_clinic_id and closed_at is null;

  insert into public.sales (clinic_id, number, client_id, cash_session_id, sold_by, discount, notes)
  values (p_clinic_id, v_number, p_client_id, v_session, auth.uid(), coalesce(p_discount, 0), p_notes)
  returning id into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Cantidad inválida en un ítem';
    end if;

    if nullif(v_item ->> 'product_id', '') is not null then
      select * into v_p from public.products
       where id = (v_item ->> 'product_id')::uuid and clinic_id = p_clinic_id and active
       for update;
      if not found then
        raise exception 'Producto inexistente o inactivo';
      end if;
      v_price := coalesce((v_item ->> 'unit_price')::numeric, v_p.price);
      insert into public.sale_items (clinic_id, sale_id, product_id, pet_id, description, quantity, unit_price, discount)
      values (p_clinic_id, v_sale, v_p.id, nullif(v_item ->> 'pet_id', '')::uuid, v_p.name, v_qty, v_price,
              coalesce((v_item ->> 'discount')::numeric, 0));

      if not v_p.is_service then
        v_left := v_qty;
        if v_p.tracks_expiry then
          for v_batch in
            select id, quantity from public.product_batches
             where product_id = v_p.id and quantity > 0 and (expires_on is null or expires_on >= current_date)
             order by expires_on nulls last, received_at
             for update
          loop
            exit when v_left <= 0;
            v_take := least(v_left, v_batch.quantity);
            insert into public.stock_movements (clinic_id, product_id, batch_id, type, quantity, sale_id, created_by)
            values (p_clinic_id, v_p.id, v_batch.id, 'venta', -v_take, v_sale, auth.uid());
            v_left := v_left - v_take;
          end loop;
        end if;
        if v_left > 0 then
          insert into public.stock_movements (clinic_id, product_id, type, quantity, sale_id, created_by)
          values (p_clinic_id, v_p.id, 'venta', -v_left, v_sale, auth.uid());
        end if;
      end if;
    else
      v_price := (v_item ->> 'unit_price')::numeric;
      if v_price is null or v_price < 0 or nullif(trim(v_item ->> 'description'), '') is null then
        raise exception 'Los ítems libres necesitan descripción y precio';
      end if;
      insert into public.sale_items (clinic_id, sale_id, pet_id, description, quantity, unit_price, discount)
      values (p_clinic_id, v_sale, nullif(v_item ->> 'pet_id', '')::uuid, trim(v_item ->> 'description'),
              v_qty, v_price, coalesce((v_item ->> 'discount')::numeric, 0));
    end if;
  end loop;

  select coalesce(sum(line_total), 0) into v_total from public.sale_items where sale_id = v_sale;
  update public.sales
     set subtotal = v_total, total = greatest(v_total - coalesce(p_discount, 0), 0)
   where id = v_sale
   returning total into v_total;

  for v_pay in select * from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) loop
    insert into public.payments (clinic_id, sale_id, client_id, cash_session_id, method, amount, received_by)
    values (p_clinic_id, v_sale, p_client_id, v_session,
            (v_pay ->> 'method')::public.payment_method, (v_pay ->> 'amount')::numeric, auth.uid());
    v_paid := v_paid + (v_pay ->> 'amount')::numeric;
  end loop;

  if v_paid > v_total then
    raise exception 'Los pagos superan el total de la venta (registrá el vuelto en el punto de venta)';
  end if;
  if v_paid < v_total and p_client_id is null then
    raise exception 'Para dejar saldo en cuenta corriente la venta necesita un cliente';
  end if;

  return v_sale;
end $$;

-- Anulación: devuelve el stock a sus lotes y marca los pagos como reintegrados
create or replace function public.void_sale(p_sale_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_s public.sales;
  v_m record;
begin
  select * into v_s from public.sales where id = p_sale_id for update;
  if not found or not public.has_role(v_s.clinic_id, array['owner', 'admin']::public.member_role[]) then
    raise exception 'No tenés permiso para anular ventas' using errcode = '42501';
  end if;
  if v_s.status = 'anulada' then
    raise exception 'La venta ya está anulada';
  end if;
  for v_m in select product_id, batch_id, quantity from public.stock_movements where sale_id = v_s.id and type = 'venta' loop
    insert into public.stock_movements (clinic_id, product_id, batch_id, type, quantity, sale_id, notes, created_by)
    values (v_s.clinic_id, v_m.product_id, v_m.batch_id, 'anulacion_venta', -v_m.quantity, v_s.id, p_reason, auth.uid());
  end loop;
  update public.payments set refunded_at = now() where sale_id = v_s.id and refunded_at is null;
  update public.sales
     set status = 'anulada', voided_at = now(), voided_by = auth.uid(), void_reason = p_reason
   where id = v_s.id;
end $$;

-- Cobro de deuda de cuenta corriente
create or replace function public.register_account_payment(
  p_client_id uuid, p_method public.payment_method, p_amount numeric, p_notes text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_clinic  uuid;
  v_session uuid;
  v_id      uuid;
begin
  select clinic_id into v_clinic from public.clients where id = p_client_id;
  if v_clinic is null or not public.is_member(v_clinic) then
    raise exception 'Cliente inexistente' using errcode = '42501';
  end if;
  select id into v_session from public.cash_sessions where clinic_id = v_clinic and closed_at is null;
  insert into public.payments (clinic_id, client_id, cash_session_id, method, amount, received_by, notes)
  values (v_clinic, p_client_id, v_session, p_method, p_amount, auth.uid(), p_notes)
  returning id into v_id;
  return v_id;
end $$;

-- Métricas del dashboard en la zona horaria de la clínica
create or replace function public.dashboard_summary(p_clinic_id uuid, p_date date default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_tz   text;
  v_day  date;
  v_from timestamptz;
  v_to   timestamptz;
begin
  select timezone into v_tz from public.clinics where id = p_clinic_id;
  if v_tz is null then
    raise exception 'Clínica no encontrada';
  end if;
  v_day  := coalesce(p_date, (now() at time zone v_tz)::date);
  v_from := v_day::timestamp at time zone v_tz;
  v_to   := (v_day + 1)::timestamp at time zone v_tz;

  return jsonb_build_object(
    'date', v_day,
    'appointments_today', (select count(*) from public.appointments a
                            where a.clinic_id = p_clinic_id and a.starts_at >= v_from and a.starts_at < v_to
                              and a.status not in ('cancelado', 'ausente')),
    'attended_today',     (select count(*) from public.appointments a
                            where a.clinic_id = p_clinic_id and a.starts_at >= v_from and a.starts_at < v_to
                              and a.status = 'atendido'),
    'waiting_now',        (select count(*) from public.appointments a
                            where a.clinic_id = p_clinic_id and a.starts_at >= v_from and a.starts_at < v_to
                              and a.status in ('en_espera', 'en_atencion')),
    'revenue_today',      (select coalesce(sum(p.amount), 0) from public.payments p
                            where p.clinic_id = p_clinic_id and p.paid_at >= v_from and p.paid_at < v_to
                              and p.refunded_at is null),
    'sales_today',        (select count(*) from public.sales s
                            where s.clinic_id = p_clinic_id and s.sold_at >= v_from and s.sold_at < v_to
                              and s.status = 'completada'),
    'vaccines_overdue',   (select count(*) from public.v_immunizations_due d
                            where d.clinic_id = p_clinic_id and d.next_due_on < v_day),
    'vaccines_due_7d',    (select count(*) from public.v_immunizations_due d
                            where d.clinic_id = p_clinic_id and d.next_due_on between v_day and v_day + 7),
    'low_stock',          (select count(*) from public.v_low_stock l where l.clinic_id = p_clinic_id),
    'expiring_batches_30d', (select count(*) from public.v_expiring_batches e
                              where e.clinic_id = p_clinic_id and e.expires_on <= v_day + 30)
  );
end $$;

-- Las RPC solo las pueden llamar usuarios autenticados
revoke execute on function
  public.create_clinic(text, text),
  public.accept_invitation(uuid),
  public.receive_stock(uuid, numeric, numeric, text, date, text),
  public.adjust_stock(uuid, numeric, public.stock_movement_type, uuid, text),
  public.open_cash_session(uuid, numeric),
  public.close_cash_session(uuid, numeric, text),
  public.create_sale(uuid, uuid, jsonb, jsonb, numeric, text),
  public.void_sale(uuid, text),
  public.register_account_payment(uuid, public.payment_method, numeric, text),
  public.dashboard_summary(uuid, date)
from public, anon;

grant execute on function
  public.create_clinic(text, text),
  public.accept_invitation(uuid),
  public.receive_stock(uuid, numeric, numeric, text, date, text),
  public.adjust_stock(uuid, numeric, public.stock_movement_type, uuid, text),
  public.open_cash_session(uuid, numeric),
  public.close_cash_session(uuid, numeric, text),
  public.create_sale(uuid, uuid, jsonb, jsonb, numeric, text),
  public.void_sale(uuid, text),
  public.register_account_payment(uuid, public.payment_method, numeric, text),
  public.dashboard_summary(uuid, date)
to authenticated;

revoke execute on function
  public.handle_new_user(), public.sync_pet_weight(), public.apply_stock_movement()
from public, anon, authenticated;

-- =====================================================================
-- 12. Row Level Security
-- =====================================================================
alter table public.clinics            enable row level security;
alter table public.profiles           enable row level security;
alter table public.clinic_members     enable row level security;
alter table public.clinic_invitations enable row level security;

create policy clinics_select on public.clinics for select to authenticated
  using (public.is_member(id));
create policy clinics_update on public.clinics for update to authenticated
  using (public.has_role(id, array['owner', 'admin']::public.member_role[]))
  with check (public.has_role(id, array['owner', 'admin']::public.member_role[]));
-- Alta de clínicas solo vía create_clinic(); last_sale_number solo vía create_sale()
revoke update on public.clinics from authenticated;
grant update (name, slug, tax_id, phone, email, address, city, country_code, timezone, currency,
              whatsapp_phone_number_id, settings) on public.clinics to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_clinic_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy members_select on public.clinic_members for select to authenticated
  using (public.is_member(clinic_id));
create policy members_insert on public.clinic_members for insert to authenticated
  with check (public.has_role(clinic_id, array['owner', 'admin']::public.member_role[]) and role <> 'owner');
create policy members_update on public.clinic_members for update to authenticated
  using (public.has_role(clinic_id, array['owner']::public.member_role[]))
  with check (public.has_role(clinic_id, array['owner']::public.member_role[]));
create policy members_delete on public.clinic_members for delete to authenticated
  using (public.has_role(clinic_id, array['owner']::public.member_role[]) and user_id <> (select auth.uid()));

create policy invitations_all on public.clinic_invitations for all to authenticated
  using (public.has_role(clinic_id, array['owner', 'admin']::public.member_role[]))
  with check (public.has_role(clinic_id, array['owner', 'admin']::public.member_role[]));

-- Datos operativos: cualquier miembro lee y escribe; borran solo owner/admin
do $$
declare t text;
begin
  foreach t in array array['clients', 'pets', 'appointments', 'immunizations', 'attachments',
                           'products', 'product_batches', 'reminders']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(clinic_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_member(clinic_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_member(clinic_id)) with check (public.is_member(clinic_id))', t || '_update', t);
    execute format($f$create policy %I on public.%I for delete to authenticated using (public.has_role(clinic_id, array['owner','admin']::public.member_role[]))$f$, t || '_delete', t);
  end loop;
end $$;

-- Historia clínica: la lee todo el equipo, la escriben profesionales
alter table public.medical_records enable row level security;
create policy medical_records_select on public.medical_records for select to authenticated
  using (public.is_member(clinic_id));
create policy medical_records_insert on public.medical_records for insert to authenticated
  with check (public.has_role(clinic_id, array['owner', 'admin', 'vet']::public.member_role[]));
create policy medical_records_update on public.medical_records for update to authenticated
  using (public.has_role(clinic_id, array['owner', 'admin', 'vet']::public.member_role[]))
  with check (public.has_role(clinic_id, array['owner', 'admin', 'vet']::public.member_role[]));
create policy medical_records_delete on public.medical_records for delete to authenticated
  using (public.has_role(clinic_id, array['owner', 'admin']::public.member_role[]));

-- Stock e importes: lectura para miembros; escritura solo vía RPC (sin políticas de escritura)
do $$
declare t text;
begin
  foreach t in array array['cash_sessions', 'sales', 'sale_items', 'payments', 'stock_movements']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(clinic_id))', t || '_select', t);
  end loop;
end $$;

-- El stock y el último peso no se editan a mano desde la API
revoke insert, update on public.products from authenticated;
grant insert (clinic_id, sku, barcode, name, category, description, unit, cost, price, tax_rate,
              min_stock, tracks_expiry, is_service, active) on public.products to authenticated;
grant update (sku, barcode, name, category, description, unit, cost, price, tax_rate,
              min_stock, tracks_expiry, is_service, active) on public.products to authenticated;
revoke insert, update on public.product_batches from authenticated;
grant update (batch_number, expires_on) on public.product_batches to authenticated;

-- =====================================================================
-- 13. Storage: archivos adjuntos privados por clínica
--     Ruta obligatoria: {clinic_id}/{pet_id}/{archivo}
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('clinic-files', 'clinic-files', false, 26214400)
on conflict (id) do nothing;

create or replace function public.storage_clinic_id(p_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;
end $$;

create policy clinic_files_select on storage.objects for select to authenticated
  using (bucket_id = 'clinic-files' and public.is_member(public.storage_clinic_id(name)));
create policy clinic_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'clinic-files' and public.is_member(public.storage_clinic_id(name)));
create policy clinic_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'clinic-files'
         and public.has_role(public.storage_clinic_id(name), array['owner', 'admin', 'vet']::public.member_role[]));

-- =====================================================================
-- 14. Realtime: el turnero se actualiza en vivo en todas las pantallas
-- =====================================================================
alter publication supabase_realtime add table public.appointments;
