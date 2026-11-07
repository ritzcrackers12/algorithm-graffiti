-- Phase B (5-reel test): library table. Embeddings stored as jsonb (384-d gte-small).

create table if not exists public.ag_reels (
  id text primary key,
  file text,
  link text,
  creator text,
  topic text,
  subtopic text,
  audience text,
  mood text,
  energy text,
  format text,
  vibe text,
  depth int,
  keywords text,
  description text,
  curator_notes text,
  notes text,
  sponsored boolean not null default false,
  ad_category text,
  transcript text,
  video_url text,
  embedding jsonb,
  ai_filled text,
  extra jsonb
);

alter table public.ag_reels enable row level security;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public)
    values ('reels', 'reels', true)
    on conflict (id) do nothing;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'reels_public_read') then
      execute $p$ create policy reels_public_read on storage.objects for select using (bucket_id = 'reels') $p$;
    end if;
  end if;
end $$;
