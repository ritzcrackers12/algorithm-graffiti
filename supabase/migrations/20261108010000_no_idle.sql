-- Remove the inactivity (idle) drop: when p_idle <= 0, the active visitor is
-- never dropped for being idle. The turn ends only when the visitor finishes
-- (report) or staff skip. The "phone gone" (p_gone) safety still applies so a
-- fully disconnected phone eventually frees the station.
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
  p_idle  := least(greatest(coalesce(p_idle, 0), 0), 300);   -- 0 = idle disabled
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
       or (p_idle > 0 and jsonb_typeof(v_busy) is distinct from 'object'
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
