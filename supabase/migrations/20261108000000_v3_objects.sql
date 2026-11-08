-- v3 objects: article, reel, ad, chat (replaces song/game).
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
    if p_arg is null or p_arg not in ('reel', 'article', 'ad', 'chat') then
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
