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
  fee_note text,
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
  already_liked boolean,
  match_score int,
  shared_tags text[]
)
language sql
security definer set search_path = public
stable
as $$
  with mine as (
    select
      coalesce(nullif(mine_r.connect_with_tags, '{}'::text[]), mine_p.connect_with_tags, '{}'::text[]) as tags,
      mine_p.industry as industry
    from public.profiles mine_p
    left join public.registrations mine_r
      on mine_r.event_id = p_event_id and mine_r.participant_id = auth.uid()
    where mine_p.id = auth.uid()
  )
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
    ) as already_liked,
    (
      cardinality(
        array(
          select unnest(coalesce(nullif(r.connect_with_tags, '{}'::text[]), p.connect_with_tags, '{}'::text[]))
          intersect
          select unnest((select tags from mine))
        )
      ) * 10
      + case
          when (select industry from mine) is not null
           and coalesce(nullif(r.industry, ''), p.industry) is not null
           and (select industry from mine) = coalesce(nullif(r.industry, ''), p.industry)
          then 5 else 0
        end
    )::int as match_score,
    array(
      select unnest(coalesce(nullif(r.connect_with_tags, '{}'::text[]), p.connect_with_tags, '{}'::text[]))
      intersect
      select unnest((select tags from mine))
    ) as shared_tags
  from public.registrations r
  join public.profiles p on p.id = r.participant_id
  where r.event_id = p_event_id
    and r.attending = true
    and r.participant_id <> auth.uid()
    and exists (
      select 1 from public.registrations mine2
      where mine2.event_id = p_event_id
        and mine2.participant_id = auth.uid()
        and mine2.attending = true
    )
  order by match_score desc, p.name nulls last;
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
-- matched_at: いつマッチが成立したか(Pairs風のチャット冒頭「〇月〇日にマッチしました」表示用)
create or replace function public.get_conversation_partner(partner uuid)
returns table(
  participant_id uuid,
  name text,
  company text,
  job_title text,
  industry text,
  connect_with text,
  matched_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select
    p.id,
    p.name,
    p.company,
    p.job_title,
    p.industry,
    p.connect_with,
    (
      select greatest(a.created_at, b.created_at)
      from public.likes a
      join public.likes b
        on a.event_id = b.event_id and a.from_id = b.to_id and a.to_id = b.from_id
      where a.from_id = auth.uid() and a.to_id = partner
      order by greatest(a.created_at, b.created_at) desc
      limit 1
    ) as matched_at
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

-- ============================================================
-- get_my_capital_summary: 参加者向け「あなたの人的資本」ダッシュボード集計
-- (参加した交流会数・つながった人数・やりとりしたメッセージ数など)
-- ============================================================
create or replace function public.get_my_capital_summary()
returns table(
  events_attended int,
  connections_count int,
  messages_count int,
  first_attended_at timestamptz,
  latest_partner_name text,
  latest_matched_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  with att as (
    select count(*)::int as c, min(checked_in_at) as first_at
    from public.attendance
    where participant_id = auth.uid() and checked_in_at is not null
  ),
  conn as (
    select a.to_id as partner_id, min(least(a.created_at, b.created_at)) as matched_at
    from public.likes a
    join public.likes b
      on a.event_id = b.event_id and a.from_id = b.to_id and a.to_id = b.from_id
    where a.from_id = auth.uid()
    group by a.to_id
  ),
  latest as (
    select p.name, c.matched_at
    from conn c
    join public.profiles p on p.id = c.partner_id
    order by c.matched_at desc
    limit 1
  ),
  msg as (
    select count(*)::int as c from public.messages
    where sender_id = auth.uid() or recipient_id = auth.uid()
  )
  select
    coalesce((select c from att), 0),
    coalesce((select count(*)::int from conn), 0),
    coalesce((select c from msg), 0),
    (select first_at from att),
    (select name from latest),
    (select matched_at from latest);
$$;

grant execute on function public.get_my_capital_summary() to authenticated;

-- ============================================================
-- get_upcoming_events_public: 未ログインでも見られる公開イベント情報
-- (AIチャットボットが最新の開催予定を答えられるようにするための最小限の公開ビュー)
-- ============================================================
create or replace function public.get_upcoming_events_public()
returns table(
  title text,
  event_date date,
  start_time time,
  venue text,
  description text,
  fee_note text
)
language sql
security definer set search_path = public
stable
as $$
  select title, event_date, start_time, venue, description, fee_note
  from public.events
  where event_date >= current_date
    and status in ('upcoming','closed')
  order by event_date asc
  limit 5;
$$;

grant execute on function public.get_upcoming_events_public() to anon, authenticated;

-- ============================================================
-- support_inquiries: AIチャットボット経由の「通報」「運営への問い合わせ」
-- 未ログイン(anon)の来場者でも送信できるよう、insert は anon にも許可する。
-- 閲覧・更新(対応状況の変更)は運営(admin)のみ。本人は自分が送った分だけ閲覧可。
-- ============================================================
create table if not exists public.support_inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('report','contact')),
  participant_id uuid references public.profiles(id) on delete set null,
  contact_name text,
  contact_email text,
  summary text not null,
  details text,
  is_business_hours boolean,
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

create index if not exists support_inquiries_status_created_idx
  on public.support_inquiries (status, created_at desc);

alter table public.support_inquiries enable row level security;

-- insert: 誰でも送信可(anon含む)。ログイン中は自分の participant_id のみ指定可能。
drop policy if exists support_inquiries_insert_any on public.support_inquiries;
create policy support_inquiries_insert_any on public.support_inquiries
  for insert to anon, authenticated
  with check (participant_id is null or participant_id = auth.uid());

-- select: 運営は全件、本人は自分が送信した分のみ
drop policy if exists support_inquiries_select_own_or_admin on public.support_inquiries;
create policy support_inquiries_select_own_or_admin on public.support_inquiries
  for select using (
    public.is_admin()
    or (participant_id is not null and participant_id = auth.uid())
  );

-- update: 対応状況の変更は運営のみ
drop policy if exists support_inquiries_update_admin on public.support_inquiries;
create policy support_inquiries_update_admin on public.support_inquiries
  for update using (public.is_admin()) with check (public.is_admin());

grant insert on public.support_inquiries to anon, authenticated;
grant select, update on public.support_inquiries to authenticated;

-- 運営向け: 対応済みにする
create or replace function public.resolve_support_inquiry(inquiry_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  update public.support_inquiries
  set status = 'resolved', resolved_at = now(), resolved_by = auth.uid()
  where id = inquiry_id;
end;
$$;

grant execute on function public.resolve_support_inquiry(uuid) to authenticated;

-- ============================================================
-- event_feedback: 参加後アンケート(満足度・NPS・自由記述)
-- ============================================================
create table if not exists public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  would_recommend text not null check (would_recommend in ('yes', 'neutral', 'no')),
  comment text,
  created_at timestamptz not null default now(),
  unique (event_id, participant_id)
);

create index if not exists event_feedback_event_idx on public.event_feedback(event_id);

alter table public.event_feedback enable row level security;

drop policy if exists event_feedback_insert_own on public.event_feedback;
create policy event_feedback_insert_own on public.event_feedback
  for insert to authenticated
  with check (participant_id = auth.uid());

drop policy if exists event_feedback_update_own on public.event_feedback;
create policy event_feedback_update_own on public.event_feedback
  for update to authenticated
  using (participant_id = auth.uid())
  with check (participant_id = auth.uid());

drop policy if exists event_feedback_select_own_or_admin on public.event_feedback;
create policy event_feedback_select_own_or_admin on public.event_feedback
  for select using (participant_id = auth.uid() or public.is_admin());

grant insert, update, select on public.event_feedback to authenticated;

-- get_pending_feedback_events: 自分が参加した(開催日が過ぎた)、まだアンケート未回答の交流会
create or replace function public.get_pending_feedback_events()
returns table(
  event_id uuid,
  title text,
  event_date date
)
language sql
security definer set search_path = public
stable
as $$
  select e.id, e.title, e.event_date
  from public.events e
  join public.registrations r on r.event_id = e.id
  where r.participant_id = auth.uid()
    and r.attending = true
    and e.event_date < current_date
    and not exists (
      select 1 from public.event_feedback f
      where f.event_id = e.id and f.participant_id = auth.uid()
    )
  order by e.event_date desc;
$$;

grant execute on function public.get_pending_feedback_events() to authenticated;

-- submit_event_feedback: アンケート送信/更新
create or replace function public.submit_event_feedback(
  p_event_id uuid,
  p_rating int,
  p_would_recommend text,
  p_comment text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.event_feedback (event_id, participant_id, rating, would_recommend, comment)
  values (p_event_id, auth.uid(), p_rating, p_would_recommend, nullif(p_comment, ''))
  on conflict (event_id, participant_id)
  do update set
    rating = excluded.rating,
    would_recommend = excluded.would_recommend,
    comment = excluded.comment;
end;
$$;

grant execute on function public.submit_event_feedback(uuid, int, text, text) to authenticated;

-- get_event_feedback_summary: 運営向け集計(イベントごとの平均評価・NPS内訳)
create or replace function public.get_event_feedback_summary()
returns table(
  event_id uuid,
  title text,
  event_date date,
  response_count int,
  avg_rating numeric,
  promoters int,
  neutrals int,
  detractors int,
  nps int
)
language sql
security definer set search_path = public
stable
as $$
  select
    e.id,
    e.title,
    e.event_date,
    count(f.id)::int as response_count,
    round(avg(f.rating)::numeric, 1) as avg_rating,
    count(*) filter (where f.would_recommend = 'yes')::int as promoters,
    count(*) filter (where f.would_recommend = 'neutral')::int as neutrals,
    count(*) filter (where f.would_recommend = 'no')::int as detractors,
    case when count(f.id) = 0 then 0
      else round(
        (count(*) filter (where f.would_recommend = 'yes')::numeric
         - count(*) filter (where f.would_recommend = 'no')::numeric)
        / count(f.id) * 100
      )::int
    end as nps
  from public.events e
  left join public.event_feedback f on f.event_id = e.id
  where public.is_admin()
  group by e.id, e.title, e.event_date
  having count(f.id) > 0
  order by e.event_date desc;
$$;

grant execute on function public.get_event_feedback_summary() to authenticated;

-- ============================================================
-- admin_notes: 運営メンバーが参加者に残すメモ・フォローアップ
-- ============================================================
create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_notes_participant_idx on public.admin_notes(participant_id, created_at desc);

alter table public.admin_notes enable row level security;

drop policy if exists admin_notes_admin_all on public.admin_notes;
create policy admin_notes_admin_all on public.admin_notes
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, delete on public.admin_notes to authenticated;

-- get_participant_admin_summary: 運営向け、特定参加者の参加実績サマリ
create or replace function public.get_participant_admin_summary(p_participant_id uuid)
returns table(
  events_attended int,
  last_attended_at timestamptz,
  matches_count int,
  messages_count int
)
language sql
security definer set search_path = public
stable
as $$
  with att as (
    select count(*)::int as c, max(checked_in_at) as last_at
    from public.attendance
    where participant_id = p_participant_id and checked_in_at is not null
  ),
  conn as (
    select a.to_id as partner_id
    from public.likes a
    join public.likes b
      on a.event_id = b.event_id and a.from_id = b.to_id and a.to_id = b.from_id
    where a.from_id = p_participant_id
    group by a.to_id
  ),
  msg as (
    select count(*)::int as c from public.messages
    where sender_id = p_participant_id or recipient_id = p_participant_id
  )
  select
    coalesce((select c from att), 0),
    (select last_at from att),
    coalesce((select count(*)::int from conn), 0),
    coalesce((select c from msg), 0)
  where public.is_admin();
$$;

grant execute on function public.get_participant_admin_summary(uuid) to authenticated;

-- get_participant_activity: 運営向け、全参加者の最終参加日・累計参加回数(一覧の休眠判定に使う)
create or replace function public.get_participant_activity()
returns table(
  participant_id uuid,
  last_attended_at timestamptz,
  events_attended int
)
language sql
security definer set search_path = public
stable
as $$
  select
    a.participant_id,
    max(a.checked_in_at) as last_attended_at,
    count(a.id)::int as events_attended
  from public.attendance a
  where public.is_admin() and a.checked_in_at is not null
  group by a.participant_id;
$$;

grant execute on function public.get_participant_activity() to authenticated;

-- ============================================================
-- business_cards: 名刺のデジタル化(OCR抽出結果の保存。画像そのものは保存しない)
-- ============================================================
create table if not exists public.business_cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text,
  company text,
  job_title text,
  phone text,
  email text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists business_cards_owner_idx on public.business_cards(owner_id, created_at desc);

alter table public.business_cards enable row level security;

drop policy if exists business_cards_owner_all on public.business_cards;
create policy business_cards_owner_all on public.business_cards
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select, insert, update, delete on public.business_cards to authenticated;

-- ============================================================
-- posts / post_likes: 交流会の合間を埋めるコミュニティフィード
-- ============================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_idx on public.posts(created_at desc);

alter table public.posts enable row level security;

drop policy if exists posts_select_authenticated on public.posts;
create policy posts_select_authenticated on public.posts
  for select to authenticated using (true);

drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts
  for insert to authenticated with check (author_id = auth.uid());

drop policy if exists posts_delete_own_or_admin on public.posts;
create policy posts_delete_own_or_admin on public.posts
  for delete using (author_id = auth.uid() or public.is_admin());

grant select, insert, delete on public.posts to authenticated;

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, participant_id)
);

alter table public.post_likes enable row level security;

drop policy if exists post_likes_select_authenticated on public.post_likes;
create policy post_likes_select_authenticated on public.post_likes
  for select to authenticated using (true);

drop policy if exists post_likes_insert_own on public.post_likes;
create policy post_likes_insert_own on public.post_likes
  for insert to authenticated with check (participant_id = auth.uid());

drop policy if exists post_likes_delete_own on public.post_likes;
create policy post_likes_delete_own on public.post_likes
  for delete using (participant_id = auth.uid());

grant select, insert, delete on public.post_likes to authenticated;

-- get_feed_posts: フィード一覧(著者情報・いいね数・自分がいいね済みか)
create or replace function public.get_feed_posts(p_limit int default 50)
returns table(
  post_id uuid,
  content text,
  created_at timestamptz,
  author_id uuid,
  author_name text,
  author_company text,
  like_count int,
  liked_by_me boolean
)
language sql
security definer set search_path = public
stable
as $$
  select
    p.id,
    p.content,
    p.created_at,
    p.author_id,
    prof.name,
    prof.company,
    (select count(*)::int from public.post_likes l where l.post_id = p.id) as like_count,
    exists(
      select 1 from public.post_likes l2
      where l2.post_id = p.id and l2.participant_id = auth.uid()
    ) as liked_by_me
  from public.posts p
  join public.profiles prof on prof.id = p.author_id
  order by p.created_at desc
  limit p_limit;
$$;

grant execute on function public.get_feed_posts(int) to authenticated;

-- ============================================================
-- 運営コード(共通コード)による管理者自己昇格 + プロフィール画像 (2026-09)
-- ============================================================

-- profiles.role を不正な直接更新から保護する。
-- これまでは profiles_update_own_or_admin ポリシーに列単位の制限がなく、
-- 認証済みユーザーが自分自身の role を直接 'admin' に書き換えられてしまう
-- 隙間があったため、トリガーで塞ぐ。
-- 許可されるのは (a) 管理者自身によるUI経由の更新 (is_admin()) と
-- (b) サーバー側の service_role クライアント経由の更新
-- (運営コードによる自己昇格・Stripe/Slack等のサーバー処理) のみ。
create or replace function public.protect_profile_role_field()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;
  new.role := old.role;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_field_trigger on public.profiles;
create trigger protect_profile_role_field_trigger
  before update on public.profiles
  for each row execute procedure public.protect_profile_role_field();

-- プロフィール画像
alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 以下、プロフィール画像をアプリ内の各所(マッチング・名簿・チャット・フィード)に
-- 表示するため、既存のプロフィール参照RPCを avatar_url 込みで再定義する。
-- 戻り値の列構成(RETURNS TABLE)が変わるため、create or replace の前に
-- 一度 drop function する必要がある(Postgresの制約: 戻り値型は置き換え不可)。

drop function if exists public.get_event_attendees(uuid);
create or replace function public.get_event_attendees(p_event_id uuid)
returns table(
  participant_id uuid,
  name text,
  company text,
  industry text,
  connect_with text,
  already_liked boolean,
  match_score int,
  shared_tags text[],
  avatar_url text
)
language sql
security definer set search_path = public
stable
as $$
  with mine as (
    select
      coalesce(nullif(mine_r.connect_with_tags, '{}'::text[]), mine_p.connect_with_tags, '{}'::text[]) as tags,
      mine_p.industry as industry
    from public.profiles mine_p
    left join public.registrations mine_r
      on mine_r.event_id = p_event_id and mine_r.participant_id = auth.uid()
    where mine_p.id = auth.uid()
  )
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
    ) as already_liked,
    (
      cardinality(
        array(
          select unnest(coalesce(nullif(r.connect_with_tags, '{}'::text[]), p.connect_with_tags, '{}'::text[]))
          intersect
          select unnest((select tags from mine))
        )
      ) * 10
      + case
          when (select industry from mine) is not null
           and coalesce(nullif(r.industry, ''), p.industry) is not null
           and (select industry from mine) = coalesce(nullif(r.industry, ''), p.industry)
          then 5 else 0
        end
    )::int as match_score,
    array(
      select unnest(coalesce(nullif(r.connect_with_tags, '{}'::text[]), p.connect_with_tags, '{}'::text[]))
      intersect
      select unnest((select tags from mine))
    ) as shared_tags,
    p.avatar_url
  from public.registrations r
  join public.profiles p on p.id = r.participant_id
  where r.event_id = p_event_id
    and r.attending = true
    and r.participant_id <> auth.uid()
    and exists (
      select 1 from public.registrations mine2
      where mine2.event_id = p_event_id
        and mine2.participant_id = auth.uid()
        and mine2.attending = true
    )
  order by match_score desc, p.name nulls last;
$$;

grant execute on function public.get_event_attendees(uuid) to authenticated;

drop function if exists public.get_member_directory();
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
  events_attended int,
  avatar_url text
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
    ) as events_attended,
    p.avatar_url
  from public.profiles p
  where p.role = 'participant'
    and p.id <> auth.uid()
  order by p.name nulls last;
$$;

grant execute on function public.get_member_directory() to authenticated;

drop function if exists public.get_conversation_partner(uuid);
create or replace function public.get_conversation_partner(partner uuid)
returns table(
  participant_id uuid,
  name text,
  company text,
  job_title text,
  industry text,
  connect_with text,
  matched_at timestamptz,
  avatar_url text
)
language sql
security definer set search_path = public
stable
as $$
  select
    p.id,
    p.name,
    p.company,
    p.job_title,
    p.industry,
    p.connect_with,
    (
      select greatest(a.created_at, b.created_at)
      from public.likes a
      join public.likes b
        on a.event_id = b.event_id and a.from_id = b.to_id and a.to_id = b.from_id
      where a.from_id = auth.uid() and a.to_id = partner
      order by greatest(a.created_at, b.created_at) desc
      limit 1
    ) as matched_at,
    p.avatar_url
  from public.profiles p
  where p.id = partner
    and public.is_matched_with(partner);
$$;

grant execute on function public.get_conversation_partner(uuid) to authenticated;

drop function if exists public.get_my_conversations();
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
  first_matched_at timestamptz,
  avatar_url text
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
    m.first_matched_at,
    p.avatar_url
  from mutual m
  join public.profiles p on p.id = m.partner_id
  left join last_msg lm on lm.partner_id = m.partner_id
  left join unread u on u.partner_id = m.partner_id
  order by coalesce(lm.created_at, m.first_matched_at) desc;
$$;

grant execute on function public.get_my_conversations() to authenticated;

drop function if exists public.get_feed_posts(int);
create or replace function public.get_feed_posts(p_limit int default 50)
returns table(
  post_id uuid,
  content text,
  created_at timestamptz,
  author_id uuid,
  author_name text,
  author_company text,
  like_count int,
  liked_by_me boolean,
  author_avatar_url text
)
language sql
security definer set search_path = public
stable
as $$
  select
    p.id,
    p.content,
    p.created_at,
    p.author_id,
    prof.name,
    prof.company,
    (select count(*)::int from public.post_likes l where l.post_id = p.id) as like_count,
    exists(
      select 1 from public.post_likes l2
      where l2.post_id = p.id and l2.participant_id = auth.uid()
    ) as liked_by_me,
    prof.avatar_url
  from public.posts p
  join public.profiles prof on prof.id = p.author_id
  order by p.created_at desc
  limit p_limit;
$$;

grant execute on function public.get_feed_posts(int) to authenticated;

-- ============================================================
-- アカウント自己管理: メールアドレス変更をprofilesへ同期
-- ============================================================
-- 本人がマイページからメールアドレスを変更すると、Supabase Authの確認フローを経て
-- auth.users.email が実際に更新されたタイミングでこのトリガーが発火し、
-- 表示用に複製している public.profiles.email も追随させる。
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute procedure public.handle_user_email_change();
