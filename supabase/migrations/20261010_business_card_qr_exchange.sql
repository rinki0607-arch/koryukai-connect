-- QR profile / business-card exchange
-- プロフィールQRコードを見せ合うだけで、双方の名刺(business_cards)を自動的に交換できるようにする。

alter table public.profiles
  add column if not exists card_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_card_token_key on public.profiles(card_token);

alter table public.business_cards
  add column if not exists contact_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists source text not null default 'photo',
  add column if not exists avatar_url text;

alter table public.business_cards
  drop constraint if exists business_cards_source_check;
alter table public.business_cards
  add constraint business_cards_source_check check (source in ('photo','qr','manual'));

-- 同じ相手との QR 交換カードは1件に保つ(再スキャンで最新情報に更新)
create unique index if not exists business_cards_owner_contact_uidx
  on public.business_cards(owner_id, contact_user_id)
  where contact_user_id is not null;

-- 自分の card_token(QR)を相手がスキャンしたときに呼ばれる。
-- 双方の business_cards を自動作成し、メッセージができるよう mutual likes も作成する。
create or replace function public.redeem_card_qr(p_token uuid)
returns table(
  participant_id uuid,
  name text,
  company text,
  job_title text,
  avatar_url text,
  already_exchanged boolean
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  me uuid := auth.uid();
  target record;
  mine record;
  was_existing boolean := false;
begin
  if me is null then
    raise exception 'ログインが必要です';
  end if;

  select p.id, p.name, p.company, p.job_title, p.phone, p.email, p.avatar_url
  into target
  from public.profiles p
  where p.card_token = p_token;

  if target.id is null then
    raise exception '無効なQRコードです';
  end if;

  if target.id = me then
    raise exception '自分のQRコードです';
  end if;

  select p.id, p.name, p.company, p.job_title, p.phone, p.email, p.avatar_url
  into mine
  from public.profiles p
  where p.id = me;

  select true into was_existing
  from public.business_cards
  where owner_id = me and contact_user_id = target.id
  limit 1;
  was_existing := coalesce(was_existing, false);

  -- 自分側: 相手の名刺を保存
  insert into public.business_cards (owner_id, contact_user_id, name, company, job_title, phone, email, avatar_url, source)
  values (me, target.id, target.name, target.company, target.job_title, target.phone, target.email, target.avatar_url, 'qr')
  on conflict (owner_id, contact_user_id) where contact_user_id is not null
  do update set
    name = excluded.name,
    company = excluded.company,
    job_title = excluded.job_title,
    phone = excluded.phone,
    email = excluded.email,
    avatar_url = excluded.avatar_url;

  -- 相手側: 自分の名刺を保存(ミューチュアル交換)
  insert into public.business_cards (owner_id, contact_user_id, name, company, job_title, phone, email, avatar_url, source)
  values (target.id, me, mine.name, mine.company, mine.job_title, mine.phone, mine.email, mine.avatar_url, 'qr')
  on conflict (owner_id, contact_user_id) where contact_user_id is not null
  do update set
    name = excluded.name,
    company = excluded.company,
    job_title = excluded.job_title,
    phone = excluded.phone,
    email = excluded.email,
    avatar_url = excluded.avatar_url;

  -- 双方向の likes を作成し、既存の is_matched_with() 判定でメッセージ送信を即解禁する
  if not exists (
    select 1 from public.likes where from_id = me and to_id = target.id and event_id is null
  ) then
    insert into public.likes (from_id, to_id, event_id) values (me, target.id, null);
  end if;

  if not exists (
    select 1 from public.likes where from_id = target.id and to_id = me and event_id is null
  ) then
    insert into public.likes (from_id, to_id, event_id) values (target.id, me, null);
  end if;

  if not was_existing then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      target.id,
      'business_card',
      '名刺交換をしました',
      coalesce(mine.name, '参加者') || 'さんとQRコードで名刺交換しました。',
      '/mypage/cards'
    );
  end if;

  return query select target.id, target.name, target.company, target.job_title, target.avatar_url, was_existing;
end;
$$;

grant execute on function public.redeem_card_qr(uuid) to authenticated;
