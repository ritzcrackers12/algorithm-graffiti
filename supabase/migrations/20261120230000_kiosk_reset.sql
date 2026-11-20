-- Kiosk "reset the queue" button on the iPad.
--
-- A narrow, public version of the admin "skip": drop whoever currently holds
-- the station (usually a phone that left without finishing), prune waiting
-- phones that have gone quiet, then promote the next awake person in line.
-- It cannot touch mock mode, tokens, or anything else the admin page can.
create or replace function public.ag_kiosk_reset(
  p_turn int, p_idle int, p_gone int, p_wait int, p_reset text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.ag_state;
  v_gone int := least(greatest(coalesce(p_gone, 12), 5), 120);
begin
  select * into s from public.ag_state where id = 1 for update;
  if s.active_session is not null then
    delete from public.ag_queue where session_id = s.active_session;
  end if;
  delete from public.ag_queue where last_seen < clock_timestamp() - make_interval(secs => v_gone);
  update public.ag_state set
    active_session = null, turn_started_at = null, last_activity_at = null,
    display = jsonb_build_object(
      'open', null, 'view', 'original', 'busy', null, 'openedAt', 0,
      'completed', '[]'::jsonb, 'used', '[]'::jsonb, 'articleId', null),
    altered = case when p_reset = 'persist' then altered else '{}'::jsonb end,
    profile = '{}'::jsonb,
    version = version + 1, updated_at = now()
  where id = 1;
  perform public.ag__advance(p_turn, p_idle, p_gone, p_wait, p_reset);
  perform public.ag__notify();
  return public.ag__snapshot(null);
end $$;

grant execute on function public.ag_kiosk_reset(int, int, int, int, text) to anon, authenticated;
