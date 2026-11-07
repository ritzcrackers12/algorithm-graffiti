-- Version 2 Phase A: no turn timer, 4 objects, visitor profile on state.

alter table public.ag_state
  add column if not exists profile jsonb not null default '{}'::jsonb;

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
    'profile', coalesce(s.profile, '{}'::jsonb),
    'mockMode', s.mock_mode,
    'version', s.version,
    'serverNow', public.ag__ms(clock_timestamp()),
    'waiting', v_waiting,
    'position', v_pos
  );
end $$;

create or replace function public.ag__advance(
  p_turn int, p_idle int, p_gone int, p_wait int, p_reset text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  s public.ag_state;
  v_now timestamptz := clock_timestamp();
  v_next text;
  v_changed boolean := false;
  v_busy jsonb;
  v_home jsonb;
  v_turn_expired boolean := false;
begin
  p_turn  := coalesce(p_turn, 0);
  p_idle  := least(greatest(coalesce(p_idle, 60), 5), 300);
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

  v_home := jsonb_build_object(
    'open', null, 'view', 'original', 'busy', v_busy, 'openedAt', 0,
    'completed', '[]'::jsonb, 'used', '[]'::jsonb, 'articleId', null);

  delete from public.ag_queue where last_seen < v_now - make_interval(secs => p_wait);

  if p_turn > 0 then
    v_turn_expired := s.turn_started_at is not null and s.turn_started_at <= v_now - make_interval(secs => p_turn);
  end if;

  if s.active_session is not null and (
       not exists (select 1 from public.ag_queue where session_id = s.active_session
                     and last_seen >= v_now - make_interval(secs => p_gone))
       or v_turn_expired
       or (jsonb_typeof(v_busy) is distinct from 'object'
           and s.last_activity_at <= v_now - make_interval(secs => p_idle))) then
    delete from public.ag_queue where session_id = s.active_session;
    s.active_session := null;
    s.turn_started_at := null;
    s.last_activity_at := null;
    s.display := v_home;
    if p_reset = 'per_visitor' then
      s.altered := '{}'::jsonb;
      s.profile := '{}'::jsonb;
    end if;
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
      s.display := v_home;
      if p_reset = 'per_visitor' then
        s.altered := '{}'::jsonb;
        s.profile := '{}'::jsonb;
      end if;
      v_changed := true;
    end if;
  end if;

  if v_changed then
    update public.ag_state set
      active_session = s.active_session,
      turn_started_at = s.turn_started_at,
      last_activity_at = s.last_activity_at,
      display = s.display,
      altered = s.altered,
      profile = s.profile,
      version = version + 1,
      updated_at = now()
    where id = 1;
  end if;
  return v_changed;
end $$;

create or replace function public.ag_command(
  p_session text, p_cmd text, p_arg text, p_turn int, p_idle int, p_gone int, p_wait int, p_reset text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.ag_state;
  v_done jsonb;
  v_used jsonb;
  v_open text;
  v_patch jsonb;
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
  elsif p_cmd = 'signal' then
    begin
      v_patch := p_arg::jsonb;
    exception when others then
      raise exception 'invalid profile';
    end;
    if jsonb_typeof(v_patch) <> 'object' then raise exception 'invalid profile'; end if;
    s.profile := coalesce(s.profile, '{}'::jsonb) || v_patch;
  elsif p_cmd = 'story' then
    if p_arg is null or p_arg !~ '^[a-z0-9-]{1,40}$' then
      raise exception 'invalid story';
    end if;
    v_done := coalesce(s.display -> 'completed', '[]'::jsonb);
    v_used := coalesce(s.display -> 'used', '[]'::jsonb);
    if not (v_used @> '["article"]'::jsonb) then v_used := v_used || '["article"]'::jsonb; end if;
    s.display := s.display || jsonb_build_object(
      'open', 'article',
      'articleId', p_arg,
      'view', case
        when coalesce(s.altered -> 'article' -> 'params' ->> 'articleId', '') = p_arg then 'altered'
        else 'original'
      end,
      'openedAt', public.ag__ms(clock_timestamp()),
      'completed', v_done,
      'used', v_used);
  elsif p_cmd = 'open' then
    if p_arg is null or p_arg not in ('reel', 'article', 'song', 'game') then
      raise exception 'invalid object';
    end if;
    v_done := coalesce(s.display -> 'completed', '[]'::jsonb);
    v_used := coalesce(s.display -> 'used', '[]'::jsonb);
    if not (v_used @> jsonb_build_array(p_arg)) then v_used := v_used || jsonb_build_array(p_arg); end if;
    s.display := s.display || jsonb_build_object(
      'open', p_arg,
      'view', case when s.altered ? p_arg then 'altered' else 'original' end,
      'openedAt', public.ag__ms(clock_timestamp()),
      'completed', v_done,
      'used', v_used,
      'articleId', case when p_arg = 'article' then s.display ->> 'articleId' else null end);
  elsif p_cmd = 'home' then
    s.display := s.display || '{"open":null,"articleId":null}'::jsonb;
  elsif p_cmd = 'done' then
    v_open := s.display ->> 'open';
    v_done := coalesce(s.display -> 'completed', '[]'::jsonb);
    if v_open is not null and v_open <> '' and not (v_done @> jsonb_build_array(v_open)) then
      v_done := v_done || jsonb_build_array(v_open);
    end if;
    s.display := s.display || jsonb_build_object('open', null, 'articleId', null, 'completed', v_done);
  elsif p_cmd = 'view' then
    if p_arg not in ('original', 'altered') then raise exception 'invalid view'; end if;
    s.display := s.display || jsonb_build_object('view', p_arg);
  elsif p_cmd = 'end' then
    delete from public.ag_queue where session_id = p_session;
    if p_reset = 'per_visitor' then
      update public.ag_state set profile = '{}'::jsonb where id = 1;
    end if;
    perform public.ag__advance(p_turn, p_idle, p_gone, p_wait, p_reset);
    perform public.ag__notify();
    return public.ag__snapshot(p_session) || '{"ok":true}'::jsonb;
  else
    raise exception 'invalid command';
  end if;

  update public.ag_state set
    display = s.display,
    profile = s.profile,
    last_activity_at = now(), version = version + 1, updated_at = now()
  where id = 1;
  perform public.ag__notify();
  return public.ag__snapshot(p_session) || '{"ok":true}'::jsonb;
end $$;

create or replace function public.ag_admin(p_action text, p_tz text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.ag_state;
  v_day timestamptz := date_trunc('day', now() at time zone p_tz) at time zone p_tz;
  v_home jsonb := '{"open":null,"view":"original","busy":null,"openedAt":0,"completed":[],"used":[],"articleId":null}'::jsonb;
begin
  select * into s from public.ag_state where id = 1 for update;
  if p_action = 'reset' then
    update public.ag_state set altered = '{}'::jsonb, profile = '{}'::jsonb, display = v_home,
      version = version + 1, updated_at = now() where id = 1;
  elsif p_action = 'skip' then
    delete from public.ag_queue where session_id = s.active_session;
    update public.ag_state set active_session = null, turn_started_at = null, last_activity_at = null,
      display = v_home, profile = '{}'::jsonb, version = version + 1, updated_at = now() where id = 1;
  elsif p_action = 'clear_queue' then
    delete from public.ag_queue;
    update public.ag_state set active_session = null, turn_started_at = null, last_activity_at = null,
      display = v_home, profile = '{}'::jsonb, version = version + 1, updated_at = now() where id = 1;
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
