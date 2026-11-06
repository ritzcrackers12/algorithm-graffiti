-- Algorithm Graffiti, Session 1: shared installation state, visitor queue, generation counter.
-- Visitors and the iPad never touch these tables directly: everything goes through the
-- ag_* functions below (security definer), and the Edge Functions use the service role.

create table if not exists public.ag_state (
  id               int primary key default 1 check (id = 1),
  active_session   text,
  turn_started_at  timestamptz,
  last_activity_at timestamptz,
  display          jsonb not null default '{"open":null,"view":"original","busy":null,"openedAt":0}'::jsonb,
  altered          jsonb not null default '{}'::jsonb,
  mock_mode        boolean not null default true,
  version          bigint not null default 0,
  updated_at       timestamptz not null default now()
);
insert into public.ag_state (id) values (1) on conflict (id) do nothing;

create table if not exists public.ag_queue (
  session_id text primary key,
  joined_at  timestamptz not null default clock_timestamp(),
  last_seen  timestamptz not null default now()
);

create table if not exists public.ag_generations (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  object     text not null,
  source     text not null -- pending | ai | mock | fallback | cap
);
create index if not exists ag_generations_created_at on public.ag_generations (created_at);

alter table public.ag_state enable row level security;
alter table public.ag_queue enable row level security;
alter table public.ag_generations enable row level security;

-- ---------- helpers ----------

create or replace function public.ag__ms(t timestamptz) returns bigint
language sql immutable as $$ select case when t is null then null else (extract(epoch from t) * 1000)::bigint end $$;

create or replace function public.ag__notify() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(
    jsonb_build_object('v', (select version from public.ag_state where id = 1)),
    'state', 'ag-installation', false);
exception when others then
  null; -- broadcast is a speed-up only; clients also poll
end $$;

create or replace function public.ag__snapshot(p_session text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.ag_state;
  v_waiting int;
  v_pos int := -1;
  v_joined timestamptz;
begin
  select * into s from public.ag_state where id = 1;
  select count(*) into v_waiting from public.ag_queue where session_id is distinct from s.active_session;
  if p_session is not null then
    if s.active_session = p_session then
      v_pos := 0;
    else
      select joined_at into v_joined from public.ag_queue where session_id = p_session;
      if found then
        select count(*) + 1 into v_pos from public.ag_queue q
         where q.session_id is distinct from s.active_session
           and (q.joined_at, q.session_id) < (v_joined, p_session);
      end if;
    end if;
  end if;
  return jsonb_build_object(
    'hasActive', s.active_session is not null,
    'turnStartedAt', public.ag__ms(s.turn_started_at),
    'lastActivityAt', public.ag__ms(s.last_activity_at),
    'display', s.display,
    'altered', s.altered,
    'mockMode', s.mock_mode,
    'version', s.version,
    'serverNow', public.ag__ms(clock_timestamp()),
    'waiting', v_waiting,
    'position', v_pos
  );
end $$;

-- Ends expired turns, drops vanished phones, promotes the next visitor.
-- Caller must already hold the ag_state row lock.
create or replace function public.ag__advance(p_turn int, p_idle int, p_gone int, p_wait int, p_reset text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  s public.ag_state;
  v_now timestamptz := now();
  v_next text;
  v_changed boolean := false;
  v_busy jsonb;
begin
  p_turn  := least(greatest(coalesce(p_turn, 90), 15), 600);
  p_idle  := least(greatest(coalesce(p_idle, 20), 5), 300);
  p_gone  := least(greatest(coalesce(p_gone, 12), 5), 120);
  p_wait  := least(greatest(coalesce(p_wait, 180), p_gone), 1800);
  p_reset := case when p_reset = 'persist' then 'persist' else 'per_visitor' end;

  select * into s from public.ag_state where id = 1 for update;
  v_busy := s.display -> 'busy';
  if jsonb_typeof(v_busy) = 'object'
     and (v_busy ->> 'startedAt')::bigint < public.ag__ms(v_now) - 90000 then
    v_busy := 'null'::jsonb;
    v_changed := true;
  end if;

  delete from public.ag_queue where last_seen < v_now - make_interval(secs => p_wait);

  if s.active_session is not null and (
       not exists (select 1 from public.ag_queue where session_id = s.active_session
                     and last_seen >= v_now - make_interval(secs => p_gone))
       or s.turn_started_at <= v_now - make_interval(secs => p_turn)
       or (jsonb_typeof(v_busy) is distinct from 'object'
           and s.last_activity_at <= v_now - make_interval(secs => p_idle))) then
    delete from public.ag_queue where session_id = s.active_session;
    s.active_session := null;
    s.turn_started_at := null;
    s.last_activity_at := null;
    s.display := jsonb_build_object('open', null, 'view', 'original', 'busy', v_busy, 'openedAt', 0);
    if p_reset = 'per_visitor' then s.altered := '{}'::jsonb; end if;
    v_changed := true;
  end if;

  if s.active_session is null then
    select session_id into v_next from public.ag_queue
     where last_seen >= v_now - make_interval(secs => p_gone)
     order by joined_at, session_id limit 1;
    if v_next is not null then
      s.active_session := v_next;
      s.turn_started_at := v_now;
      s.last_activity_at := v_now;
      s.display := jsonb_build_object('open', null, 'view', 'original', 'busy', v_busy, 'openedAt', 0);
      if p_reset = 'per_visitor' then s.altered := '{}'::jsonb; end if;
      v_changed := true;
    end if;
  end if;

  if v_changed then
    update public.ag_state set
      active_session = s.active_session,
      turn_started_at = s.turn_started_at,
      last_activity_at = s.last_activity_at,
      display = jsonb_set(s.display, '{busy}', coalesce(v_busy, 'null'::jsonb)),
      altered = s.altered,
      version = s.version + 1,
      updated_at = v_now
    where id = 1;
  end if;
  return v_changed;
end $$;

-- ---------- public API (phones + iPad) ----------

create or replace function public.ag_heartbeat(
  p_session text, p_join boolean, p_turn int, p_idle int, p_gone int, p_wait int, p_reset text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_joined boolean := false;
begin
  if p_session is null or p_session !~ '^[A-Za-z0-9_-]{8,64}$' then
    raise exception 'invalid session';
  end if;
  perform 1 from public.ag_state where id = 1 for update;
  update public.ag_queue set last_seen = now() where session_id = p_session;
  if not found and p_join then
    insert into public.ag_queue (session_id) values (p_session) on conflict do nothing;
    v_joined := true;
  end if;
  if public.ag__advance(p_turn, p_idle, p_gone, p_wait, p_reset) or v_joined then
    perform public.ag__notify();
  end if;
  return public.ag__snapshot(p_session);
end $$;

create or replace function public.ag_tick(p_turn int, p_idle int, p_gone int, p_wait int, p_reset text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.ag_state where id = 1 for update;
  if public.ag__advance(p_turn, p_idle, p_gone, p_wait, p_reset) then
    perform public.ag__notify();
  end if;
  return public.ag__snapshot(null);
end $$;

create or replace function public.ag_command(
  p_session text, p_cmd text, p_arg text, p_turn int, p_idle int, p_gone int, p_wait int, p_reset text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.ag_state;
begin
  perform 1 from public.ag_state where id = 1 for update;
  if public.ag__advance(p_turn, p_idle, p_gone, p_wait, p_reset) then
    perform public.ag__notify();
  end if;
  select * into s from public.ag_state where id = 1;
  if s.active_session is distinct from p_session then
    return public.ag__snapshot(p_session) || '{"ok":false}'::jsonb;
  end if;
  update public.ag_queue set last_seen = now() where session_id = p_session;

  if p_cmd = 'touch' then
    update public.ag_state set last_activity_at = now() where id = 1;
    return public.ag__snapshot(p_session) || '{"ok":true}'::jsonb;
  elsif p_cmd = 'open' then
    if p_arg is null or p_arg not in ('reel', 'website', 'article', 'image', 'song') then
      raise exception 'invalid object';
    end if;
    s.display := s.display || jsonb_build_object(
      'open', p_arg,
      'view', case when s.altered ? p_arg then 'altered' else 'original' end,
      'openedAt', public.ag__ms(clock_timestamp()));
  elsif p_cmd = 'home' then
    s.display := s.display || '{"open":null}'::jsonb;
  elsif p_cmd = 'view' then
    if p_arg not in ('original', 'altered') then raise exception 'invalid view'; end if;
    s.display := s.display || jsonb_build_object('view', p_arg);
  elsif p_cmd = 'end' then
    delete from public.ag_queue where session_id = p_session;
    perform public.ag__advance(p_turn, p_idle, p_gone, p_wait, p_reset);
    perform public.ag__notify();
    return public.ag__snapshot(p_session) || '{"ok":true}'::jsonb;
  else
    raise exception 'invalid command';
  end if;

  update public.ag_state set
    display = s.display, last_activity_at = now(), version = version + 1, updated_at = now()
  where id = 1;
  perform public.ag__notify();
  return public.ag__snapshot(p_session) || '{"ok":true}'::jsonb;
end $$;

-- ---------- server-only API (Edge Functions, service role) ----------

create or replace function public.ag_begin_generation(
  p_session text, p_object text, p_eta_ai int, p_eta_mock int, p_rate int, p_cap int, p_tz text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.ag_state;
  v_last timestamptz;
  v_today int;
  v_id bigint;
  v_busy jsonb;
  v_mock boolean;
  v_cap boolean;
begin
  select * into s from public.ag_state where id = 1 for update;
  if s.active_session is distinct from p_session then
    return '{"ok":false,"reason":"not_active"}'::jsonb;
  end if;
  v_busy := s.display -> 'busy';
  if jsonb_typeof(v_busy) = 'object'
     and (v_busy ->> 'startedAt')::bigint > public.ag__ms(now()) - 90000 then
    return '{"ok":false,"reason":"busy"}'::jsonb;
  end if;
  select max(created_at) into v_last from public.ag_generations;
  if v_last is not null and v_last > now() - make_interval(secs => p_rate) then
    return jsonb_build_object('ok', false, 'reason', 'cooldown',
      'secondsLeft', ceil(extract(epoch from (v_last + make_interval(secs => p_rate) - now()))));
  end if;
  select count(*) into v_today from public.ag_generations
   where source = 'ai'
     and created_at >= (date_trunc('day', now() at time zone p_tz) at time zone p_tz);
  v_cap := v_today >= p_cap;
  v_mock := s.mock_mode;
  insert into public.ag_generations (object, source) values (p_object, 'pending') returning id into v_id;
  update public.ag_state set
    display = jsonb_set(display, '{busy}', jsonb_build_object(
      'id', v_id, 'object', p_object, 'startedAt', public.ag__ms(clock_timestamp()),
      'etaSeconds', case when v_mock or v_cap then p_eta_mock else p_eta_ai end)),
    last_activity_at = now(), version = version + 1, updated_at = now()
  where id = 1;
  perform public.ag__notify();
  return jsonb_build_object('ok', true, 'id', v_id, 'mockMode', v_mock, 'capReached', v_cap);
end $$;

create or replace function public.ag_finish_generation(
  p_id bigint, p_session text, p_object text, p_result jsonb, p_source text, p_reset text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.ag_state;
  v_keep boolean;
begin
  select * into s from public.ag_state where id = 1 for update;
  update public.ag_generations set source = p_source where id = p_id;
  v_keep := s.active_session = p_session or p_reset = 'persist';
  if (s.display -> 'busy' ->> 'id')::bigint = p_id then
    s.display := jsonb_set(s.display, '{busy}', 'null'::jsonb);
  end if;
  if v_keep and p_result is not null then
    s.altered := s.altered || jsonb_build_object(p_object, p_result);
    if s.display ->> 'open' = p_object then
      s.display := s.display || '{"view":"altered"}'::jsonb;
    end if;
  end if;
  update public.ag_state set
    display = s.display,
    altered = s.altered,
    last_activity_at = case when active_session = p_session then now() else last_activity_at end,
    version = version + 1, updated_at = now()
  where id = 1;
  perform public.ag__notify();
  return jsonb_build_object('ok', true, 'kept', v_keep);
end $$;

create or replace function public.ag_admin(p_action text, p_tz text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.ag_state;
  v_day timestamptz := date_trunc('day', now() at time zone p_tz) at time zone p_tz;
  v_home jsonb := '{"open":null,"view":"original","busy":null,"openedAt":0}'::jsonb;
begin
  select * into s from public.ag_state where id = 1 for update;
  if p_action = 'reset' then
    update public.ag_state set altered = '{}'::jsonb, display = v_home,
      version = version + 1, updated_at = now() where id = 1;
  elsif p_action = 'skip' then
    delete from public.ag_queue where session_id = s.active_session;
    update public.ag_state set active_session = null, turn_started_at = null, last_activity_at = null,
      display = v_home, version = version + 1, updated_at = now() where id = 1;
  elsif p_action = 'clear_queue' then
    delete from public.ag_queue;
    update public.ag_state set active_session = null, turn_started_at = null, last_activity_at = null,
      display = v_home, version = version + 1, updated_at = now() where id = 1;
  elsif p_action = 'mock_on' then
    update public.ag_state set mock_mode = true, version = version + 1, updated_at = now() where id = 1;
  elsif p_action = 'mock_off' then
    update public.ag_state set mock_mode = false, version = version + 1, updated_at = now() where id = 1;
  elsif p_action <> 'status' then
    raise exception 'invalid action';
  end if;
  if p_action <> 'status' then perform public.ag__notify(); end if;
  select * into s from public.ag_state where id = 1;
  return jsonb_build_object(
    'mockMode', s.mock_mode,
    'hasActive', s.active_session is not null,
    'turnStartedAt', public.ag__ms(s.turn_started_at),
    'waiting', (select count(*) from public.ag_queue where session_id is distinct from s.active_session),
    'busy', s.display -> 'busy',
    'open', s.display -> 'open',
    'alteredObjects', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(s.altered) k),
    'today', jsonb_build_object(
      'ai', (select count(*) from public.ag_generations where created_at >= v_day and source = 'ai'),
      'mock', (select count(*) from public.ag_generations where created_at >= v_day and source = 'mock'),
      'fallback', (select count(*) from public.ag_generations where created_at >= v_day and source in ('fallback', 'cap')),
      'total', (select count(*) from public.ag_generations where created_at >= v_day)),
    'serverNow', public.ag__ms(clock_timestamp())
  );
end $$;

-- ---------- permissions ----------

revoke all on function public.ag__ms(timestamptz) from public, anon, authenticated;
revoke all on function public.ag__notify() from public, anon, authenticated;
revoke all on function public.ag__snapshot(text) from public, anon, authenticated;
revoke all on function public.ag__advance(int, int, int, int, text) from public, anon, authenticated;
revoke all on function public.ag_heartbeat(text, boolean, int, int, int, int, text) from public;
revoke all on function public.ag_tick(int, int, int, int, text) from public;
revoke all on function public.ag_command(text, text, text, int, int, int, int, text) from public;
revoke all on function public.ag_begin_generation(text, text, int, int, int, int, text) from public, anon, authenticated;
revoke all on function public.ag_finish_generation(bigint, text, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.ag_admin(text, text) from public, anon, authenticated;

grant execute on function public.ag_heartbeat(text, boolean, int, int, int, int, text) to anon, authenticated;
grant execute on function public.ag_tick(int, int, int, int, text) to anon, authenticated;
grant execute on function public.ag_command(text, text, text, int, int, int, int, text) to anon, authenticated;
grant execute on function public.ag_begin_generation(text, text, int, int, int, int, text) to service_role;
grant execute on function public.ag_finish_generation(bigint, text, text, jsonb, text, text) to service_role;
grant execute on function public.ag_admin(text, text) to service_role;
