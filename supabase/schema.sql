-- koryukai-connect: データベーススキーマ
-- Supabase の SQL Editor でそのまま実行できます(冪等)

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles: 参加者・運営共通のプロフィール(auth.users と1:1)
-- ===========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'participant' check (role in ('participant','admin')),
  name text,
  email text,
  company text,
  industry text,
  connect_with text,
  connect_with_tags text[] not null default '{}',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 新規サインアップ時に自動で profiles 行を作成
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.k�il))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
