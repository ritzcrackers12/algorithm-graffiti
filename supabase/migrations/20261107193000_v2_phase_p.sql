-- Phase P: proxy settings, AI cache, request log.

alter table public.ag_state
  add column if not exists replicate_mode text not null default 'proxy',
  add column if not exists proxy_token text,
  add column if not exists proxy_token_updated_at timestamptz,
  add column if not exists proxy_status text not null default 'unknown';

alter table public.ag_state
  drop constraint if exists ag_state_replicate_mode_check;
alter table public.ag_state
  add constraint ag_state_replicate_mode_check check (replicate_mode in ('proxy', 'direct'));

create table if not exists public.ag_ai_cache (
  key text primary key,
  job text not null,
  input jsonb,
  output jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ag_proxy_requests (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  job text not null,
  ok boolean not null,
  error text,
  ms int
);
create index if not exists ag_proxy_requests_created_at on public.ag_proxy_requests (created_at);

alter table public.ag_ai_cache enable row level security;
alter table public.ag_proxy_requests enable row level security;

create or replace function public.ag_proxy_today(p_tz text)
returns int
language sql security definer set search_path = public as $$
  select count(*)::int from public.ag_proxy_requests
   where created_at >= (date_trunc('day', now() at time zone p_tz) at time zone p_tz);
$$;

revoke all on function public.ag_proxy_today(text) from public, anon, authenticated;
grant execute on function public.ag_proxy_today(text) to service_role;
