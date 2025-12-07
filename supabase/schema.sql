-- Supabase schema for saved items, notes, highlights, and drawings.
-- Enable required extensions.
create extension if not exists "pgcrypto";

-- Root saved page per user.
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  page_url text not null,
  title text,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_user_page_unique unique (user_id, page_url)
);

-- Notes attached to an item.
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  content text,
  position_json jsonb,
  rects_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_item_idx on public.notes (item_id);

-- Highlights captured from an item.
create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  text text,
  rects_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists highlights_item_idx on public.highlights (item_id);

-- Drawings stored in object storage, referenced here.
create table if not exists public.drawings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  blob_ref text not null,
  bounds_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drawings_item_idx on public.drawings (item_id);
