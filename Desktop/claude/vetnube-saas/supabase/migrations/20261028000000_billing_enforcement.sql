-- =============================================================================
-- VetNube · Modo solo lectura para clínicas sin suscripción vigente
-- =============================================================================
-- Con la prueba vencida o la suscripción cancelada/pausada, la clínica puede
-- VER todos sus datos pero no cargar ni modificar nada. El bloqueo vive en la
-- base (trigger por tabla), así cubre la app, las RPC y cualquier llamada directa.
--
-- Reglas (espejo de readOnly en src/lib/billing.ts):
--   active, past_due        → habilitada (con past_due Mercado Pago reintenta el cobro)
--   trial                   → habilitada hasta trial_ends_at
--   pending                 → habilitada mientras dure la prueba
--   cancelled, paused       → habilitada hasta next_billing_at (el mes ya pagado)
-- Además: tabla de solicitudes del "botón de arrepentimiento" (Res. 424/2020).
-- =============================================================================

create or replace function public.clinic_is_writable(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case c.subscription_status
           when 'active' then true
           when 'past_due' then true
           when 'trial' then c.trial_ends_at > now()
           when 'pending' then c.trial_ends_at > now()
           else coalesce(c.next_billing_at > now(), false)
         end
  from public.clinics c
  where c.id = p_clinic_id
$$;

revoke all on function public.clinic_is_writable(uuid) from public;
grant execute on function public.clinic_is_writable(uuid) to authenticated, service_role;

create or replace function public.enforce_clinic_writable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic uuid := case when tg_op = 'DELETE' then old.clinic_id else new.clinic_id end;
begin
  -- El servidor (webhooks, tareas internas) no queda bloqueado
  if coalesce(auth.role(), '') = 'service_role' then
    return coalesce(new, old);
  end if;
  -- Clínica inexistente (p. ej. borrado en cascada de la clínica): no bloquear
  if coalesce(public.clinic_is_writable(v_clinic), true) then
    return coalesce(new, old);
  end if;
  raise exception 'La suscripción de la clínica no está vigente: los datos quedan en modo solo lectura.'
    using errcode = 'VN402',
          hint = 'Suscribite en Configuración → Plan y facturación.';
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'appointments', 'attachments', 'cash_sessions', 'clients', 'clinic_invitations',
    'immunizations', 'medical_records', 'payments', 'pets', 'product_batches',
    'products', 'reminders', 'sale_items', 'sales', 'stock_movements'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'a_' || t || '_billing_guard', t);
    -- Nombre con prefijo "a_" para que corra antes que los demás triggers BEFORE
    execute format(
      'create trigger %I before insert or update or delete on public.%I
         for each row execute function public.enforce_clinic_writable()',
      'a_' || t || '_billing_guard', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Una sola prueba gratuita por persona: si ya es dueña de otra clínica, la
-- nueva arranca sin prueba (si no, alcanzaría con crear clínicas cada 14 días).
-- -----------------------------------------------------------------------------
create or replace function public.create_clinic(p_name text, p_timezone text default 'America/Argentina/Buenos_Aires')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_had_trial boolean;
begin
  if v_uid is null then
    raise exception 'Necesitás iniciar sesión' using errcode = '42501';
  end if;
  perform now() at time zone p_timezone;  -- valida la zona horaria

  select exists (select 1 from public.clinic_members where user_id = v_uid and role = 'owner') into v_had_trial;

  insert into public.clinics (name, timezone, trial_ends_at)
  values (p_name, p_timezone, case when v_had_trial then now() else now() + interval '14 days' end)
  returning id into v_id;
  insert into public.clinic_members (clinic_id, user_id, role) values (v_id, v_uid, 'owner');
  return v_id;
end $$;

-- -----------------------------------------------------------------------------
-- Botón de arrepentimiento: lo completa cualquiera desde /arrepentimiento.
-- Solo escribe el servidor (service role); nadie lo lee desde la app.
-- -----------------------------------------------------------------------------
create table if not exists public.withdrawal_requests (
  id bigint generated always as identity primary key,
  code text not null unique,
  full_name text not null,
  email text not null,
  clinic_name text,
  details text,
  status text not null default 'pendiente' check (status in ('pendiente', 'resuelta')),
  created_at timestamptz not null default now()
);

alter table public.withdrawal_requests enable row level security;
revoke all on public.withdrawal_requests from anon, authenticated;
