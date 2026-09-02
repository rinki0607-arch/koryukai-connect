-- koryukai-connect: データベーススキーマ
-- Supabase の SQL Editor でそのまま実行できます(冪等)

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles: 参加者・運営共通のプロフィール(auth.users と1:1)
-- ============================================================
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
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 管理者判定(RLS再帰を避けるため security definer)
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists(
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- events: 交流会
-- ============================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  start_time time,
  end_time time,
  venue text,
  description text,
  has_afterparty boolean not null default true,
  status text not null default 'upcoming' check (status in ('upcoming','closed','past','canceled')),
  capacity int,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- registrations: 交流会ごとの参加登録(参加可否・二次会可否・業種・繋がりたい人)
-- ============================================================
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  attending boolean not null,
  afterparty boolean not null default false,
  industry text,
  connect_with text,
  connect_with_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, participant_id)
);

-- ============================================================
-- likes: 「話してみたい」の意思表示(双方が押すとマッチ成立)
-- ============================================================
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, from_id, to_id),
  check (from_id <> to_id)
);

-- ============================================================
-- RLS 有効化
-- ============================================================
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.likes enable row level security;

-- profiles ポリシー
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- events ポリシー: ログイン済みなら誰でも閲覧可、書き込みは管理者のみ
drop policy if exists events_select_authenticated on public.events;
create policy events_select_authenticated on public.events
  for select using (auth.role() = 'authenticated');

drop policy if exists events_admin_write on public.events;
create policy events_admin_write on public.events
  for all using (public.is_admin()) with check (public.is_admin());

-- registrations ポリシー
drop policy if exists registrations_select_own_or_admin on public.registrations;
create policy registrations_select_own_or_admin on public.registrations
  for select using (participant_id = auth.uid() or public.is_admin());

drop policy if exists registrations_insert_own on public.registrations;
create policy registrations_insert_own on public.registrations
  for insert with check (participant_id = auth.uid());

drop policy if exists registrations_update_own_or_admin on public.registrations;
create policy registrations_update_own_or_admin on public.registrations
  for update using (participant_id = auth.uid() or public.is_admin())
  with check (participant_id = auth.uid() or public.is_admin());

-- likes ポリシー: 自分が送った「いいね」だけ見える/出せる(相手からのいいねは見えない=フェアなマッチング)
drop policy if exists likes_select_own_or_admin on public.likes;
create policy likes_select_own_or_admin on public.likes
  for select using (from_id = auth.uid() or public.is_admin());

drop policy if exists likes_insert_own on public.likes;
create policy likes_insert_own on public.likes
  for insert with check (from_id = auth.uid());

drop policy if exists likes_delete_own on public.likes;
create policy likes_delete_own on public.likes
  for delete using (from_id = auth.uid());

-- ============================================================
-- get_event_attendees: 自分と同じ交流会に「参加する」で登録した他の参加者一覧
-- (自分自身もその交流会に attending=true で登録していることが条件)
-- ============================================================
create or replace function public.get_event_attendees(p_event_id uuid)
returns table(
  participant_id uuid,
  name text,
  company text,
  industry text,
  connect_with text,
  already_liked boolean
)
language sql
security definer set search_path = public
stable
as $$
  select
    r.participant_id,
    p.name,
    p.company,
    coalesce(nullif(r.industry, ''), p.industry) as industry,
    coalesce(nullif(r.connect_with, ''), p.connect_with) as connect_with,
    exists(
      select 1 from public.likes l
      where l.event_id = p_event_id
        and l.from_id = auth.uid()
        and l.to_id = r.participant_id
    ) as already_liked
  from public.registrations r
  join public.profiles p on p.id = r.participant_id
  where r.event_id = p_event_id
    and r.attending = true
    and r.participant_id <> auth.uid()
    and exists (
      select 1 from public.registrations mine
      where mine.event_id = p_event_id
        and mine.participant_id = auth.uid()
        and mine.attending = true
    )
  order by p.name nulls last;
$$;

-- ============================================================
-- get_my_matches: 相互に「話してみたい」が成立した相手の一覧(連絡先を開示)
-- ============================================================
create or replace function public.get_my_matches()
returns table(
  event_id uuid,
  event_title text,
  participant_id uuid,
  name text,
  company text,
  industry text,
  connect_with text,
  email text,
  matched_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select
    a.event_id,
    e.title as event_title,
    a.to_id as participant_id,
    p.name,
    p.company,
    coalesce(nullif(r.industry, ''), p.industry) as industry,
    coalesce(nullif(r.connect_with, ''), p.connect_with) as connect_with,
    p.email,
    greatest(a.created_at, b.created_at) as matched_at
  from public.likes a
  join public.likes b
    on a.event_id = b.event_id
   and a.from_id = b.to_id
   and a.to_id = b.from_id
  join public.profiles p on p.id = a.to_id
  join public.events e on e.id = a.event_id
  left join public.registrations r
    on r.event_id = a.event_id and r.participant_id = a.to_id
  where a.from_id = auth.uid()
  order by matched_at desc;
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_event_attendees(uuid) to authenticated;
grant execute on function public.get_my_matches() to authenticated;

-- ============================================================
-- QRチェックイン: 個人チケットトークン + 出欠(入場/退場)記録
-- ============================================================
alter table public.profiles
  add column if not exists ticket_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_ticket_token_idx
  on public.profiles(ticket_token);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, participant_id)
);

alter table public.attendance enable row level security;

drop policy if exists attendance_select_own_or_admin on public.attendance;
create policy attendance_select_own_or_admin on public.attendance
  for select using (participant_id = auth.uid() or public.is_admin());

-- 書き込みは運営(受付担当)のみ。QR受付は管理画面から行う
drop policy if exists attendance_admin_write on public.attendance;
create policy attendance_admin_write on public.attendance
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 新着交流会メール通知の送信状況
-- ============================================================
alter table public.events
  add column if not exists notified_at timestamptz;
alter table public.events
  add column if not exists notified_count int;

-- ============================================================
-- get_member_directory: 参加者名簿(参加者アプリ側から他の参加者のプロフィールを閲覧)
-- メールアドレスは含めない(連絡先はマッチング成立後のみ開示)
-- ============================================================
create or replace function public.get_member_directory()
returns table(
  participant_id uuid,
  name text,
  company text,
  industry text,
  connect_with text,
  connect_with_tags text[],
  bio text,
  events_attended int
)
language sql
security definer set search_path = public
stable
as $$
  select
    p.id as participant_id,
    p.name,
    p.company,
    p.industry,
    p.connect_with,
    p.connect_with_tags,
    p.bio,
    (
      select count(*)::int from public.registrations r
      where r.participant_id = p.id and r.attending = true
    ) as events_attended
  from public.profiles p
  where p.role = 'participant'
    and p.id <> auth.uid()
  order by p.name nulls last;
$$;

grant execute on function public.get_member_directory() to authenticated;

-- ============================================================
-- 参加者プロフィール項目の追加(職種・役職・電話番号)
-- ============================================================
alter table public.profiles add column if not exists job_type text;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists phone text;

-- get_member_directory を職種・役職も返すように再定義(電話番号は含めない)
create or replace function public.get_member_directory()
returns table(
  participant_id uuid,
  name text,
  company text,
  job_type text,
  job_title text,
  industry text,
  connect_with text,
  connect_with_tags text[],
  bio text,
  events_attended int
)
language sql
security definer set search_path = public
stable
as $$
  select
    p.id as participant_id,
    p.name,
    p.company,
    p.job_type,
    p.job_title,
    p.industry,
    p.connect_with,
    p.connect_with_tags,
    p.bio,
    (
      select count(*)::int from public.registrations r
      where r.participant_id = p.id and r.attending = true
    ) as events_attended
  from public.profiles p
  where p.role = 'participant'
    and p.id <> auth.uid()
  order by p.name nulls last;
$$;

grant execute on function public.get_member_directory() to authenticated;

-- ============================================================
-- messages: マッチ成立した相手同士のチャット(履歴は交流会をまたいで蓄積)
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists messages_pair_created_idx
  on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);

create index if not exists messages_recipient_unread_idx
  on public.messages (recipient_id, read_at);

-- 過去含め、いずれかの交流会で相互に「話してみたい」が成立している相手か
create or replace function public.is_matched_with(other_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists(
    select 1 from public.likes a
    join public.likes b
      on a.event_id = b.event_id
     and a.from_id = b.to_id
     and a.to_id = b.from_id
    where a.from_id = auth.uid() and a.to_id = other_id
  );
$$;

grant execute on function public.is_matched_with(uuid) to authenticated;

alter table public.messages enable row level security;

drop policy if exists messages_select_own on public.messages;
create policy messages_select_own on public.messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());

-- 送信はマッチが成立している相手にのみ許可(既読フラグの更新は mark_conversation_read 経由のみ)
drop policy if exists messages_insert_matched on public.messages;
create policy messages_insert_matched on public.messages
  for insert with check (
    sender_id = auth.uid() and public.is_matched_with(recipient_id)
  );

create or replace function public.mark_conversation_read(partner uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.messages
  set read_at = now()
  where recipient_id = auth.uid() and sender_id = partner and read_at is null;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- チャット相手のプロフィール(マッチしている場合のみ返す。profiles は本人のみ閲覧可のため専用RPCが必要)
create or replace function public.get_conversation_partner(partner uuid)
returns table(
  participant_id uuid,
  name text,
  company text,
  job_title text,
  industry text,
  connect_with text
)
language sql
security definer set search_path = public
stable
as $$
  select p.id, p.name, p.company, p.job_title, p.industry, p.connect_with
  from public.profiles p
  where p.id = partner
    and public.is_matched_with(partner);
$$;

grant execute on function public.get_conversation_partner(uuid) to authenticated;

create or replace function public.get_unread_message_count()
returns int
language sql
security definer set search_path = public
stable
as $$
  select count(*)::int from public.messages
  where recipient_id = auth.uid() and read_at is null;
$$;

grant execute on function public.get_unread_message_count() to authenticated;

-- 「メッセージ」一覧(旧マッチ一覧): マッチ相手ごとに1行、交流会をまたいで集約
create or replace function public.get_my_conversations()
returns table(
  partner_id uuid,
  name text,
  company text,
  job_title text,
  last_message text,
  last_message_at timestamptz,
  last_sender_id uuid,
  unread_count int,
  matched_events text[],
  first_matched_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  with mutual as (
    select a.to_id as partner_id,
           min(least(a.created_at, b.created_at)) as first_matched_at,
           array_agg(distinct e.title order by e.title) as matched_events
    from public.likes a
    join public.likes b
      on a.event_id = b.event_id and a.from_id = b.to_id and a.to_id = b.from_id
    join public.events e on e.id = a.event_id
    where a.from_id = auth.uid()
    group by a.to_id
  ),
  last_msg as (
    select distinct on (partner_id)
      partner_id, content, created_at, sender_id
    from (
      select
        case when sender_id = auth.uid() then recipient_id else sender_id end as partner_id,
        content, created_at, sender_id
      from public.messages
      where sender_id = auth.uid() or recipient_id = auth.uid()
    ) x
    order by partner_id, created_at desc
  ),
  unread as (
    select sender_id as partner_id, count(*)::int as cnt
    from public.messages
    where recipient_id = auth.uid() and read_at is null
    group by sender_id
  )
  select
    m.partner_id,
    p.name,
    p.company,
    p.job_title,
    lm.content as last_message,
    lm.created_at as last_message_at,
    lm.sender_id as last_sender_id,
    coalesce(u.cnt, 0) as unread_count,
    m.matched_events,
    m.first_matched_at
  from mutual m
  join public.profiles p on p.id = m.partner_id
  left join last_msg lm on lm.partner_id = m.partner_id
  left join unread u on u.partner_id = m.partner_id
  order by coalesce(lm.created_at, m.first_matched_at) desc;
$$;

grant execute on function public.get_my_conversations() to authenticated;

-- Realtime: チャットの新着メッセージをクライアントに配信できるようにする
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
