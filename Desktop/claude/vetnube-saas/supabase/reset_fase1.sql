-- =====================================================================
-- VetNube SaaS · Limpieza de la Fase 1
-- Borra todo lo que crea 20261011000000_init.sql (tablas, datos, vistas,
-- funciones, tipos y políticas) para poder volver a ejecutarlo desde cero.
-- ATENCIÓN: elimina los datos de esas tablas. Usar solo en un proyecto nuevo.
-- =====================================================================

-- Realtime
do $$
begin
  if exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments') then
    alter publication supabase_realtime drop table public.appointments;
  end if;
end $$;

-- Políticas de Storage (el bucket clinic-files se conserva; el script principal lo reutiliza)
drop policy if exists clinic_files_select on storage.objects;
drop policy if exists clinic_files_insert on storage.objects;
drop policy if exists clinic_files_delete on storage.objects;

-- Trigger sobre auth.users
drop trigger if exists on_auth_user_created on auth.users;

-- Vistas
drop view if exists
  public.v_client_balances,
  public.v_immunizations_due,
  public.v_low_stock,
  public.v_expiring_batches
cascade;

-- Tablas (sus políticas, índices y triggers se van con ellas)
drop table if exists
  public.reminders,
  public.stock_movements,
  public.payments,
  public.sale_items,
  public.sales,
  public.cash_sessions,
  public.product_batches,
  public.attachments,
  public.immunizations,
  public.products,
  public.medical_records,
  public.appointments,
  public.pets,
  public.clients,
  public.clinic_invitations,
  public.clinic_members,
  public.profiles,
  public.clinics
cascade;

-- Funciones sin tipos propios en su firma
drop function if exists public.is_member(uuid) cascade;
drop function if exists public.shares_clinic_with(uuid) cascade;
drop function if exists public.storage_clinic_id(text) cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.appointment_status_stamps() cascade;
drop function if exists public.sync_pet_weight() cascade;
drop function if exists public.apply_stock_movement() cascade;
drop function if exists public.create_clinic(text, text) cascade;
drop function if exists public.accept_invitation(uuid) cascade;
drop function if exists public.receive_stock(uuid, numeric, numeric, text, date, text) cascade;
drop function if exists public.open_cash_session(uuid, numeric) cascade;
drop function if exists public.close_cash_session(uuid, numeric, text) cascade;
drop function if exists public.create_sale(uuid, uuid, jsonb, jsonb, numeric, text) cascade;
drop function if exists public.void_sale(uuid, text) cascade;
drop function if exists public.dashboard_summary(uuid, date) cascade;

-- Tipos (CASCADE elimina has_role, adjust_stock y register_account_payment, que los usan)
drop type if exists
  public.member_role,
  public.species,
  public.pet_sex,
  public.appointment_type,
  public.appointment_status,
  public.record_type,
  public.immunization_kind,
  public.product_category,
  public.stock_movement_type,
  public.payment_method,
  public.sale_status,
  public.reminder_kind,
  public.reminder_channel,
  public.reminder_status
cascade;
