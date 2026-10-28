-- ============================================================
-- 仮説検証のための追加（2026-10-29）
-- 「ARKIVE 仮説検証プラン」の5つの仮説を、開発を増やさずに測るための最小限の項目。
-- 既存のテーブル・データは変更しない（列とテーブルの追加のみ）。何度実行しても同じ結果になる。
-- ============================================================

-- 仮説3・4・1：参加登録ごとに「事前マッチング希望」「紹介元」「交流会のあとの面談・入塾」を記録する
alter table public.registrations add column if not exists wants_intro boolean not null default false;
alter table public.registrations add column if not exists intro_sent_at timestamptz;
alter table public.registrations add column if not exists referral_code text;
alter table public.registrations add column if not exists interview_requested_at timestamptz;
alter table public.registrations add column if not exists interview_done_at timestamptz;
alter table public.registrations add column if not exists enrolled_at timestamptz;

create index if not exists registrations_referral_code_idx
  on public.registrations(referral_code);

-- 仮説2：ログインしていない人も、開催予定・受付終了の交流会を見られるようにする
grant select on public.events to anon;
drop policy if exists events_select_public on public.events;
create policy events_select_public on public.events
  for select to anon
  using (status in ('upcoming', 'closed'));

-- 仮説2：公開ページの閲覧数と「参加登録する」ボタンの押下数
-- 書き込みはサーバー（サービスロール）からのみ。閲覧は運営のみ。
create table if not exists public.funnel_events (
  id bigserial primary key,
  event_id uuid references public.events(id) on delete cascade,
  kind text not null check (kind in ('public_view', 'register_click')),
  visitor_id text,
  referral_code text,
  created_at timestamptz not null default now()
);

create index if not exists funnel_events_event_kind_idx
  on public.funnel_events(event_id, kind);

alter table public.funnel_events enable row level security;

drop policy if exists funnel_events_admin_select on public.funnel_events;
create policy funnel_events_admin_select on public.funnel_events
  for select using (public.is_admin());

-- 仮説1・5：主催者インタビューの結果や、従来の受付時間など、運営が手で入れる検証メモ
create table if not exists public.validation_notes (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.validation_notes enable row level security;

drop policy if exists validation_notes_admin_all on public.validation_notes;
create policy validation_notes_admin_all on public.validation_notes
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.validation_notes to authenticated;
