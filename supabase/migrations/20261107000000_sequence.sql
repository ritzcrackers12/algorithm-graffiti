-- Sequential visit: visitors finish one object at a time. `done` locks it and
-- clears `open` so the phone can open the next ready object (or end the turn).

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

  v_home := jsonb_build_object(
    'open', null, 'view', 'original', 'busy', v_busy, 'openedAt', 0, 'completed', '[]'::jsonb);

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
    s.display := v_home;
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
      s.display := v_home;
      if p_reset = 'per_visitor' then s.altered := '{}'::jsonb; end if;
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
  v_open text;
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
    v_done := coalesce(s.display -> 'completed', '[]'::jsonb);
    if v_done @> jsonb_build_array(p_arg) then
      return public.ag__snapshot(p_session) || '{"ok":false}'::jsonb;
    end if;
    s.display := s.display || jsonb_build_object(
      'open', p_arg,
      'view', case when s.altered ? p_arg then 'altered' else 'original' end,
      'openedAt', public.ag__ms(clock_timestamp()),
      'completed', v_done);
  elsif p_cmd = 'home' then
    s.display := s.display || '{"open":null}'::jsonb;
  elsif p_cmd = 'done' then
    v_open := s.display ->> 'open';
    v_done := coalesce(s.display -> 'completed', '[]'::jsonb);
    if v_open is not null and v_open <> '' and not (v_done @> jsonb_build_array(v_open)) then
      v_done := v_done || jsonb_build_array(v_open);
    end if;
    s.display := s.display || jsonb_build_object('open', null, 'completed', v_done);
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
