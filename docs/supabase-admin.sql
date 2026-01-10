/*
  -- Supabase setup is no longer used. This placeholder remains for historical reference.
drop table if exists orders cascade;
drop table if exists products cascade;
drop table if exists categories cascade;
drop table if exists support_messages cascade;
drop table if exists users cascade;

drop type if exists role_enum cascade;
drop type if exists order_status_enum cascade;
drop type if exists support_status_enum cascade;

create extension if not exists pgcrypto;
create extension if not exists http with schema extensions;
create extension if not exists pg_cron with schema extensions;

create type role_enum as enum ('user', 'admin');
create type order_status_enum as enum ('pending','paid','processing','out_for_delivery','delivered','cancelled');
create type support_status_enum as enum ('open','pending','closed');

create table users (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  email varchar(255) not null unique,
  password_hash varchar(255),
  role role_enum not null default 'user',
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null unique,
  slug varchar(140) not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name varchar(160) not null,
  slug varchar(180) not null unique,
  description text,
  price_per_kg double precision not null,
  image_url varchar(500),
  stock_kg double precision not null default 0,
  is_dry boolean not null default false,
  is_active boolean not null default true,
  category_id uuid not null references categories(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  total_amount double precision not null,
  status order_status_enum not null default 'pending',
  delivery_slot varchar(50),
  address_line varchar(255) not null,
  city varchar(120) not null default 'Edinburgh',
  postcode varchar(12) not null,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  qty_kg double precision not null check (qty_kg > 0),
  price_per_kg double precision not null check (price_per_kg > 0)
);

create table support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  subject varchar(160) not null,
  message text not null,
  response text,
  status support_status_enum not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table support_messages enable row level security;

-- RLS policies
create policy "Users can read their own profile" on users
  for select using (id = auth.uid());
create policy "Users can update their own profile" on users
  for update using (id = auth.uid());
create policy "Admins manage users" on users
  for all using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));

create policy "Public categories" on categories
  for select using (is_active = true);
create policy "Admins manage categories" on categories
  for all using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));

create policy "Public products" on products
  for select using (is_active = true);
create policy "Admins manage products" on products
  for all using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));

create policy "Users manage their orders" on orders
  for all using (user_id = auth.uid());
create policy "Admins manage orders" on orders
  for all using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));

create policy "Users read their order items" on order_items
  for select using (exists (
    select 1 from orders o where o.id = order_id and o.user_id = auth.uid()
  ));
create policy "Admins manage order items" on order_items
  for all using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));

create policy "Users manage own support tickets" on support_messages
  for all using (user_id = auth.uid());
create policy "Admins manage support" on support_messages
  for all using (exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));

create or replace function public.is_admin(uid uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  matched_role role_enum;
begin
  select role into matched_role
  from users
  where id = uid;

  if matched_role is null then
    begin
      update users as u
      set id = uid
      from auth.users as au
      where lower(u.email) = lower(au.email)
        and au.id = uid
        and u.id <> uid
      returning u.role into matched_role;
    exception when foreign_key_violation then
      matched_role := null;
    end;
  end if;

  if matched_role is null then
    select u.role into matched_role
    from users u
    join auth.users au on lower(u.email) = lower(au.email)
    where au.id = uid
    limit 1;
  end if;

  return coalesce(matched_role = 'admin', false);
end;
$$;

-- Auth → users sync trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  incoming_name text := coalesce(new.raw_user_meta_data->>'name', '');
  normalized_name text := case when length(trim(incoming_name)) > 0 then incoming_name else null end;
  incoming_role text := coalesce(new.raw_user_meta_data->>'role', '');
  normalized_role role_enum := case
    when lower(trim(incoming_role)) = 'admin' then 'admin'
    else 'user'
  end;
begin
  insert into users (id, name, email, role)
  values (new.id, coalesce(normalized_name, ''), new.email, normalized_role)
  on conflict (email) do update
    set id = excluded.id,
        name = case
          when length(trim(excluded.name)) > 0 then excluded.name
          else users.name
        end,
        role = case
          when users.role = 'admin' then users.role
          else excluded.role
        end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Analytics helpers
create or replace function get_monthly_sales()
returns table(month text, sales numeric)
language sql as $$
  select to_char(created_at, 'YYYY-MM') as month,
         coalesce(sum(total_amount), 0) as sales
  from orders
  group by 1
  order by 1;
$$;

create or replace function get_order_status_counts()
returns table(status text, count bigint)
language sql as $$
  select status, count(*)::bigint from orders group by status order by status;
$$;

create or replace function get_top_products()
returns table(product_id uuid, name text, orders bigint, revenue numeric)
language sql as $$
  select p.id, p.name,
         count(oi.id)::bigint as orders,
         coalesce(sum(oi.qty_kg * oi.price_per_kg), 0) as revenue
  from products p
  join order_items oi on oi.product_id = p.id
  join orders o on o.id = oi.order_id
  group by p.id, p.name
  order by revenue desc
  limit 10;
$$;

create or replace function build_sales_csv()
returns text
language plpgsql
as $$
declare
  rec record;
  out text := 'month,sales' || E'\n';
begin
  for rec in select * from get_monthly_sales() loop
    out := out || rec.month || ',' || coalesce(rec.sales, 0) || E'\n';
  end loop;
  return out;
end;
$$;

create or replace function send_sales_report_email(to_email text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  api_key text := vault.get_secret('RESEND_API_KEY');
  csv text := build_sales_csv();
  payload jsonb := jsonb_build_object(
    'from', 'Tarel Reports <reports@tarel.co.uk>',
    'to', to_email,
    'subject', 'Tarel Monthly Sales Report',
    'text', 'Attached is the latest sales CSV.',
    'attachments', jsonb_build_array(
      jsonb_build_object(
        'filename', 'tarel-monthly-sales.csv',
        'content', encode(csv::bytea, 'base64'),
        'type', 'text/csv'
      )
    )
  );
  _resp jsonb;
begin
  perform extensions.http(
    ('POST', 'https://api.resend.com/emails',
     ARRAY[
       extensions.http_header('Authorization', 'Bearer ' || api_key),
       extensions.http_header('Content-Type', 'application/json')
     ],
     payload::text
    )::extensions.http_request
  );
end;
$$;

create or replace function rpc_send_sales_report_email(to_email text)
returns void
language sql
security definer set search_path = public
as $$
  select send_sales_report_email(to_email);
$$;

-- Optional daily 8am UTC cron job
-- select extensions.cron.schedule(
--   job_name := 'tarel_daily_sales_email',
--   schedule := '0 8 * * *',
--   command := $$select send_sales_report_email('admin@tarel.co.uk');$$
-- );

-- Seed admin (adjust email/password hash as needed)
insert into users (id, name, email, role)
values (gen_random_uuid(), 'Admin', 'admin@tarel.co.uk', 'admin')
on conflict (email) do update
  set role = 'admin';
