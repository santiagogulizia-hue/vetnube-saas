-- =====================================================================
-- VetNube SaaS · Migración 2 · Reportes de ganancias y directorio del equipo
-- Ejecutar DESPUÉS de 20261011000000_init.sql. Se puede correr una sola vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Costo histórico en cada línea de venta
--    Guarda el costo del producto al momento de vender, para que la
--    ganancia de un mes no cambie cuando después se actualiza el costo.
-- ---------------------------------------------------------------------
alter table public.sale_items
  add column if not exists unit_cost numeric(12, 2) not null default 0 check (unit_cost >= 0);

-- Ventas anteriores a esta migración: se completan con el costo actual del producto
update public.sale_items si
   set unit_cost = p.cost
  from public.products p
 where p.id = si.product_id
   and si.unit_cost = 0;

create or replace function public.set_sale_item_cost()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.product_id is not null and coalesce(new.unit_cost, 0) = 0 then
    select cost into new.unit_cost from public.products where id = new.product_id;
  end if;
  new.unit_cost := coalesce(new.unit_cost, 0);
  return new;
end $$;

drop trigger if exists sale_items_set_cost on public.sale_items;
create trigger sale_items_set_cost
  before insert on public.sale_items
  for each row execute function public.set_sale_item_cost();

revoke execute on function public.set_sale_item_cost() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Reporte de ventas, ganancias y actividad clínica de un período
--    Fechas inclusivas, interpretadas en la zona horaria de la clínica.
--    SECURITY INVOKER: respeta RLS (solo miembros de la clínica).
-- ---------------------------------------------------------------------
create or replace function public.sales_report(p_clinic_id uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_tz     text;
  v_start  timestamptz;
  v_end    timestamptz;
  v_result jsonb;
begin
  select timezone into v_tz from public.clinics where id = p_clinic_id;
  if v_tz is null then
    raise exception 'Clínica no encontrada';
  end if;
  if p_to < p_from then
    raise exception 'La fecha final es anterior a la inicial';
  end if;
  if p_to - p_from > 731 then
    raise exception 'El período máximo del reporte es de 2 años';
  end if;

  v_start := p_from::timestamp at time zone v_tz;
  v_end   := (p_to + 1)::timestamp at time zone v_tz;

  with s as (
    select id, total, discount, (sold_at at time zone v_tz)::date as day
      from public.sales
     where clinic_id = p_clinic_id and status = 'completada'
       and sold_at >= v_start and sold_at < v_end
  ),
  i as (
    select si.sale_id, si.product_id, si.description, si.quantity, si.discount, si.line_total,
           si.quantity * si.unit_cost as cost,
           coalesce(p.category::text, 'servicio') as category,
           coalesce(p.is_service, true) as is_service
      from public.sale_items si
      join s on s.id = si.sale_id
      left join public.products p on p.id = si.product_id
  ),
  sale_cost as (
    select sale_id, sum(cost) as cost from i group by sale_id
  ),
  pay as (
    select method, amount
      from public.payments
     where clinic_id = p_clinic_id and refunded_at is null
       and paid_at >= v_start and paid_at < v_end
  ),
  daily as (
    select s.day, sum(s.total) as revenue, sum(coalesce(sc.cost, 0)) as cost, count(*) as sales
      from s left join sale_cost sc on sc.sale_id = s.id
     group by s.day
  )
  select jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'sales_count',      (select count(*) from s),
    'revenue',          (select coalesce(sum(total), 0) from s),
    'cost',             (select coalesce(sum(cost), 0) from i),
    'discounts',        (select coalesce(sum(discount), 0) from s) + (select coalesce(sum(discount), 0) from i),
    'services_revenue', (select coalesce(sum(line_total), 0) from i where is_service),
    'products_revenue', (select coalesce(sum(line_total), 0) from i where not is_service),
    'collected',        (select coalesce(sum(amount), 0) from pay),
    'by_method',        (select coalesce(jsonb_agg(jsonb_build_object('method', method, 'amount', amount) order by amount desc), '[]'::jsonb)
                           from (select method, sum(amount) as amount from pay group by method) m),
    'daily',            (select jsonb_agg(jsonb_build_object('day', d.day, 'revenue', coalesce(x.revenue, 0),
                                                             'cost', coalesce(x.cost, 0), 'sales', coalesce(x.sales, 0))
                                          order by d.day)
                           from (select generate_series(p_from, p_to, interval '1 day')::date as day) d
                           left join daily x on x.day = d.day),
    'top_products',     (select coalesce(jsonb_agg(t order by t.revenue desc), '[]'::jsonb)
                           from (select product_id, max(description) as name, sum(quantity) as quantity,
                                        sum(line_total) as revenue, sum(line_total) - sum(cost) as profit
                                   from i
                                  group by product_id, case when product_id is null then description end
                                  order by sum(line_total) desc
                                  limit 10) t),
    'by_category',      (select coalesce(jsonb_agg(c order by c.revenue desc), '[]'::jsonb)
                           from (select category, sum(line_total) as revenue, sum(line_total) - sum(cost) as profit
                                   from i group by category) c),
    'consultations',    (select count(*) from public.medical_records
                          where clinic_id = p_clinic_id and visit_at >= v_start and visit_at < v_end),
    'appointments',     (select count(*) from public.appointments
                          where clinic_id = p_clinic_id and starts_at >= v_start and starts_at < v_end
                            and status <> 'cancelado'),
    'attended',         (select count(*) from public.appointments
                          where clinic_id = p_clinic_id and starts_at >= v_start and starts_at < v_end
                            and status = 'atendido'),
    'no_show',          (select count(*) from public.appointments
                          where clinic_id = p_clinic_id and starts_at >= v_start and starts_at < v_end
                            and status = 'ausente'),
    'new_clients',      (select count(*) from public.clients
                          where clinic_id = p_clinic_id and created_at >= v_start and created_at < v_end),
    'new_pets',         (select count(*) from public.pets
                          where clinic_id = p_clinic_id and created_at >= v_start and created_at < v_end),
    'vaccines_applied', (select count(*) from public.immunizations
                          where clinic_id = p_clinic_id and applied_on between p_from and p_to)
  ) into v_result;

  return v_result;
end $$;

revoke execute on function public.sales_report(uuid, date, date) from public, anon;
grant execute on function public.sales_report(uuid, date, date) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Directorio del equipo (incluye el email, que vive en auth.users)
-- ---------------------------------------------------------------------
create or replace function public.clinic_team(p_clinic_id uuid)
returns table (
  user_id        uuid,
  full_name      text,
  email          text,
  phone          text,
  license_number text,
  role           public.member_role,
  active         boolean,
  joined_at      timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_member(p_clinic_id) then
    raise exception 'No pertenecés a esta clínica' using errcode = '42501';
  end if;
  return query
    select m.user_id, p.full_name, u.email::text, p.phone, p.license_number, m.role, m.active, m.created_at
      from public.clinic_members m
      join public.profiles p on p.id = m.user_id
      join auth.users u on u.id = m.user_id
     where m.clinic_id = p_clinic_id
     order by m.active desc, m.role, p.full_name;
end $$;

revoke execute on function public.clinic_team(uuid) from public, anon;
grant execute on function public.clinic_team(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Vista previa de una invitación (para la pantalla "Te invitaron a…")
--    Solo responde a quien tiene el token (un UUID secreto del link).
-- ---------------------------------------------------------------------
create or replace function public.invitation_preview(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_inv   record;
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  select i.email, i.role, i.expires_at, i.accepted_at, c.name as clinic_name
    into v_inv
    from public.clinic_invitations i
    join public.clinics c on c.id = i.clinic_id
   where i.token = p_token;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'clinic_name', v_inv.clinic_name,
    'role', v_inv.role,
    'email', v_inv.email,
    'email_matches', lower(v_inv.email) = lower(coalesce(v_email, '')),
    'expired', v_inv.expires_at <= now(),
    'accepted', v_inv.accepted_at is not null
  );
end $$;

revoke execute on function public.invitation_preview(uuid) from public, anon;
grant execute on function public.invitation_preview(uuid) to authenticated;
