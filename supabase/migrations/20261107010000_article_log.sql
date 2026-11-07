-- Store education / income / location (state or country only) on each generation.
alter table public.ag_generations
  add column if not exists params jsonb;

create or replace function public.ag_finish_generation(
  p_id bigint, p_session text, p_object text, p_result jsonb, p_source text, p_reset text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.ag_state;
  v_keep boolean;
  v_log jsonb;
begin
  select * into s from public.ag_state where id = 1 for update;
  v_log := null;
  if p_object = 'article' and p_result is not null then
    v_log := jsonb_build_object(
      'education', p_result -> 'params' -> 'education',
      'income', p_result -> 'params' -> 'income',
      'location', p_result -> 'params' -> 'location'
    );
  elsif p_result is not null then
    v_log := p_result -> 'params';
  end if;
  update public.ag_generations set source = p_source, params = v_log where id = p_id;
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
