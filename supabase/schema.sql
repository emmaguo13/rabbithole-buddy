-- Supabase schema for saved items, notes, highlights, and drawings.
-- Enable required extensions.
create extension if not exists "pgcrypto";

-- Groups of related saved items.
create table if not exists public.item_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint item_groups_user_label_unique unique (user_id, label)
);
create index if not exists item_groups_user_idx on public.item_groups (user_id);

-- Root saved page per user.
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  group_id uuid references public.item_groups(id) on delete set null,
  page_url text not null,
  title text,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_user_page_unique unique (user_id, page_url)
);
create index if not exists items_group_idx on public.items (group_id);

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
