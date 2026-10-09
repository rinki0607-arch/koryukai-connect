-- koryukai-connect: ãƒ‡ãƒ¼ã‚¿ãƒ™ãƒ¼ã‚¹ã‚¹ã‚­ãƒ¼ãƒ
-- Supabase ã® SQL Editor ã§ãã®ã¾ã¾å®Ÿè¡Œã§ãã¾ã™(å†ªç­‰)

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles: å‚åŠ è€…ãƒ»é‹å–¶å…±é€šã®ãƒ—ãƒ­ãƒ•ã‚£ãƒ¼ãƒ«(auth.users ã¨1:1)
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

-- æ–°è¦ã‚µã‚¤ãƒ³ã‚¢ãƒƒãƒ—æ™‚ã«è‡ªå‹•ã§ profiles è¡Œã‚’ä½œæˆ
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

-- ç¨¡ç†è€…åˆ¤å®š(RLSåå¸°ã‚’é¿ã‘ã‚‹ãŸã‚ security definer)
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
-- events: äº¤æµä¼š
-- =============================================================
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
-- registrations: äº¤æµä¼šã”ã¨ã®å‚åŠ ç™»éŒ²(å‚åŠ å¯å¦ãƒ»äºŒæ¬¡ä¼šå¯å¦ãƒ»æ¥­ç¨®ãƒ»ç¹‹ãŒã‚ŠãŸã„äºº)
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

-- ===========================================================
-- likes: ã€Œè©±±ã—ã¦ã¿ãŸã„ã€ã®æ„æ€è¡¨ç¤º(åŒæ–¹ãŒæŠ¼ã™ã¨ãƒãƒƒãƒæˆç«‹)
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
-- RLS æœ‰åŠ¹åŒ–
-- ============================================================
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.likes enable row level security;

-- profiles ãƒãƒªã‚·ãƒ¼
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- events ãƒãƒªã‚·ãƒ¼: ãƒ­ã‚°ã‚¤ãƒ³æ¸ˆã¿ãªã‚‰èª°ã§ã‚‚é–²è¦§å¯ã€æ›¸ãè¾¼ã¿ã¯ç®¡ç†è€…ã®ã¿
drop policy if exists events_select_authenticated on public.events;
create policy events_select_authenticated on public.events
  for select using (auth.role() = 'authenticated');

drop policy if exists events_admin_write on public.events;
create policy events_admin_write on public.events
  for all using (public.is_admin()) with check (public.is_admin());

-- registrations ãƒãƒªã‚·ãƒ¼
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

-- likes ãƒãƒªã‚·ãƒ¼: è‡ªåˆ†ãŒé€ã£ãgøà#8àa8àa8àkxà#xàh8àdz)¢øàb8à¢Ëùaî¸àføà¢Ê9æî9¢bøàbøà¢xàk¸àa8àa8àkxàkú)¢øàb8àj¸àaxàåxà©øà¨¸àj¸àç¸ààøààxàìøà¬
B™›ÜÛXŞHYˆ^\İÈZÙ\×ÜÙ[XİÛİÛ—ÛÜ—ØYZ[ˆÛˆX›XË›ZÙ\ÎÂ˜Ü™X]HÛXŞHZÙ\×ÜÙ[XİÛİÛ—ÛÜ—ØYZ[ˆÛˆX›XË›ZÙ\Âˆ›ÜˆÙ[Xİ\Ú[™È
œ›ÛWÚYH]]ZY

HÜˆX›XËš\×ØYZ[Š
JNÂ‚™›ÜÛXŞHYˆ^\İÈZÙ\×Ú[œÙ\ÛİÛˆÛˆX›XË›ZÙ\ÎÂ˜Ü™X]HÛXŞHZÙ\×Ú[œÙ\ÛİÛˆÛˆX›XË›ZÙ\Âˆ›Üˆ[œÙ\Ú]ÚXÚÈ
œ›ÛWÚYH]]ZY

JNÂ‚™›ÜÛXŞHYˆ^\İÈZÙ\×Ù[]WÛİÛˆÛˆX›XË›ZÙ\ÎÂ˜Ü™X]HÛXŞHZÙ\×Ù[]WÛİÛˆÛˆX›XË›ZÙ\Âˆ›Üˆ[]H\Ú[™È
œ›ÛWÚYH]]ZY

JNÂ‚‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB‹KHÙ]Ù]™[Ø][™Y\Îˆ:!ê¹b!¸àj9d#8àf9.©9­`y/&¸àjøà#9cà¹b¨8àfxà¢øà#xàiùænúc,¸àeøàgù.å¸àk¹cà¹b¨: !y. :)©Â‹KH
:!ê¹b!º!êº.ªøà ¸àgxàk¹.©9­`y/&¸àjÈ][™[™Ï]YH8àiùænúc,¸àeøài¸àa8à¢øàdøàj8àc9§hy.íŠB‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB˜Ü™X]HÜˆ™\XÙH[˜İ[ÛˆX›XË™Ù]Ù]™[Ø][™Y\ÊÙ]™[ÚY]ZY
Bœ™]\›œÈX›Jˆ\XÚ\[ÚY]ZYˆ˜[YH^ˆÛÛ\[H^ˆ[™\İH^ˆÛÛ›™XİİÚ]^ˆ[™XYWÛZÙY›ÛÛX[‹ˆX]ÚÜØÛÜ™H[ˆÚ\™YİYÜÈ^×BŠB›[™İXYÙHÜ[œÙXİ\š]HYš[™\ˆÙ]ÙX\˜ÚÜ]HX›XÂœİX›B˜\È		ˆÚ]Z[™H\È
ˆÙ[XİˆÛØ[\ØÙJ[YŠZ[™WÜ‹˜ÛÛ›™XİİÚ]İYÜË	ŞßIÎ^×JKZ[™WÜ˜ÛÛ›™XİİÚ]İYÜË	ŞßIÎ^×JH\ÈYÜËˆZ[™WÜš[™\İH\È[™\İBˆœ›ÛHX›XËœ›Ùš[\ÈZ[™WÜˆY›Ú[ˆX›XËœ™YÚ\İ˜][ÛœÈZ[™WÜ‚ˆÛˆZ[™WÜ‹™]™[ÚYHÙ]™[ÚY[™Z[™WÜ‹œ\XÚ\[ÚYH]]ZY

BˆÚ\™HZ[™WÜšYH]]ZY

Bˆ
BˆÙ[Xİˆ‹œ\XÚ\[ÚYˆ›˜[YKˆ˜ÛÛ\[KˆÛØ[\ØÙJ[YŠ‹š[™\İK	ÉÊKš[™\İJH\È[™\İKˆÛØ[\ØÙJ[YŠ‹˜ÛÛ›™XİİÚ]	ÉÊK˜ÛÛ›™XİİÚ]
H\ÈÛÛ›™XİİÚ]ˆ^\İÊˆÙ[XİHœ›ÛHX›XË›ZÙ\ÈˆÚ\™H™]™[ÚYHÙ]™[ÚYˆ[™™œ›ÛWÚYH]]ZY

Bˆ[™×ÚYH‹œ\XÚ\[ÚYˆ
H\È[™XYWÛZÙYˆ
ˆØ\™[˜[]Jˆ\œ˜^JˆÙ[Xİ[›™\İ
ÛØ[\ØÙJ[YŠ‹˜ÛÛ›™XİİÚ]İYÜË	ŞßIÎ^×JK˜ÛÛ›™XİİÚ]İYÜË	ŞßIÎ^×JJBˆ[\œÙXİˆÙ[Xİ[›™\İ

Ù[XİYÜÈœ›ÛHZ[™JJBˆ
Bˆ
H
ˆLˆ
ÈØ\ÙBˆÚ[ˆ
Ù[Xİ[™\İHœ›ÛHZ[™JH\È›İ[ˆ[™ÛØ[\ØÙJ[YŠ‹š[™\İK	ÉÊKš[™\İJH\È›İ[ˆ[™
Ù[Xİ[™\İHœ›ÛHZ[™JHHÛØ[\ØÙJ[YŠ‹š[™\İK	ÉÊKš[™\İJBˆ[ˆH[ÙHˆ[™ˆ
Nš[\ÈX]ÚÜØÛÜ™Kˆ\œ˜^JˆÙ[Xİ[›™\İ
ÛØ[\ØÙJ[YŠ‹˜ÛÛ›™XİİÚ]İYÜË	ŞßIÎ^×JK˜ÛÛ›™XİİÚ]İYÜË	ŞßIÎ^×JJBˆ[\œÙXİˆÙ[Xİ[›™\İ

Ù[XİYÜÈœ›ÛHZ[™JJBˆ
H\ÈÚ\™YİYÜÂˆœ›ÛHX›XËœ™YÚ\İ˜][ÛœÈ‚ˆ›Ú[ˆX›XËœ›Ùš[\ÈÛˆšYH‹œ\XÚ\[ÚYˆÚ\™H‹™]™[ÚYHÙ]™[ÚYˆ[™‹˜][™[™ÈHYBˆ[™‹œ\XÚ\[ÚYˆ]]ZY

Bˆ[™^\İÈ
ˆÙ[XİHœ›ÛHX›XËœ™YÚ\İ˜][ÛœÈZ[™L‚ˆÚ\™HZ[™L‹™]™[ÚYHÙ]™[ÚYˆ[™Z[™L‹œ\XÚ\[ÚYH]]ZY

Bˆ[™Z[™L‹˜][™[™ÈHYBˆ
BˆÜ™\ˆHX]ÚÜØÛÜ™H\ØË›˜[YH[È\İÂ‰	Â‚‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB‹KHÙ]Û^WÛX]Ú\Îˆ9æî9.¤¸àjøà#:*lxàeøài¸àoøàgøàa8à#xàc9¢$9êâøàeøàgùæî9¢bøàk¹. :)©Ê:`(ùíhyab8à¤ºe¢ùé.ŠB‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB˜Ü™X]HÜˆ™\XÙH[˜İ[ÛˆX›XË™Ù]Û^WÛX]Ú\Ê
Bœ™]\›œÈX›Jˆ]™[ÚY]ZYˆ]™[İ]H^ˆ\XÚ\[ÚY]ZYˆ˜[YH^ˆÛÛ\[H^ˆ[™\İH^ˆÛÛ›™XİİÚ]^ˆ[XZ[^ˆX]ÚYØ][Y\İ[\‚ŠB›[™İXYÙHÜ[œÙXİ\š]HYš[™\ˆÙ]ÙX\˜ÚÜ]HX›XÂœİX›B˜\È		ˆÙ[XİˆK™]™[ÚYˆK]H\È]™[İ]KˆK×ÚY\È\XÚ\[ÚYˆ›˜[YKˆ˜ÛÛ\[KˆÛØ[\ØÙJ[YŠ‹š[™\İK	ÉÊKš[™\İJH\È[™\İKˆÛØ[\ØÙJ[YŠ‹˜ÛÛ›™XİİÚ]	ÉÊK˜ÛÛ›™XİİÚ]
H\ÈÛÛ›™XİİÚ]ˆ™[XZ[ˆÜ™X]\İ
K˜Ü™X]YØ]‹˜Ü™X]YØ]
H\ÈX]ÚYØ]ˆœ›ÛHX›XË›ZÙ\ÈBˆ›Ú[ˆX›XË›ZÙ\È‚ˆÛˆK™]™[ÚYH‹™]™[ÚYˆ[™K™œ›ÛWÚYH‹×ÚYˆ[™K×ÚYH‹™œ›ÛWÚYˆ›Ú[ˆX›XËœ›Ùš[\ÈÛˆšYHK×ÚYˆ›Ú[ˆX›XË™]™[ÈHÛˆKšYHK™]™[ÚYˆY›Ú[ˆX›XËœ™YÚ\İ˜][ÛœÈ‚ˆÛˆ‹™]™[ÚYHK™]™[ÚY[™‹œ\XÚ\[ÚYHK×ÚYˆÚ\™HK™œ›ÛWÚYH]]ZY

BˆÜ™\ˆHX]ÚYØ]\ØÎÂ‰	Â‚™Ü˜[^Xİ]HÛˆ[˜İ[ÛˆX›XËš\×ØYZ[Š
HÈ]][XØ]YÂ™Ü˜[^Xİ]HÛˆ[˜İ[ÛˆX›XË™Ù]Ù]™[Ø][™Y\Ê]ZY
HÈ]][XØ]YÂ™Ü˜[^Xİ]HÛˆ[˜İ[ÛˆX›XË™Ù]Û^WÛX]Ú\Ê
HÈ]][XØ]YÂ‚‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB‹KHT¸ààxà©øààøà«øà©8àìÎˆ9`"ù.®¸ààxà¬xààøàâ8àâ8àï8à«øàìÈ
È9aî¹«(
9aiyh-ú` 9h-
z*&:c,‚‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB˜[\ˆX›HX›XËœ›Ùš[\ÂˆYÛÛ[[ˆYˆ›İ^\İÈXÚÙ]İÚÙ[ˆ]ZY›İ[Y˜][Ù[—Ü˜[™ÛWİ]ZY

NÂ‚˜Ü™X]H[š\]YH[™^Yˆ›İ^\İÈ›Ùš[\×İXÚÙ]İÚÙ[—ÚYˆÛˆX›XËœ›Ùš[\ÊXÚÙ]İÚÙ[ŠNÂ‚˜Ü™X]HX›HYˆ›İ^\İÈX›XË˜][™[˜ÙH
ˆY]ZYš[X\HÙ^HY˜][Ù[—Ü˜[™ÛWİ]ZY

Kˆ]™[ÚY]ZY›İ[™Y™\™[˜Ù\ÈX›XË™]™[ÊY
HÛˆ[]HØ\ØØYKˆ\XÚ\[ÚY]ZY›İ[™Y™\™[˜Ù\ÈX›XËœ›Ùš[\ÊY
HÛˆ[]HØ\ØØYKˆÚXÚÙYÚ[—Ø][Y\İ[\‹ˆÚXÚÙYÛİ]Ø][Y\İ[\‹ˆÜ™X]YØ][Y\İ[\ˆ›İ[Y˜][›İÊ
Kˆ[š\]YH
]™[ÚY\XÚ\[ÚY
BŠNÂ‚˜[\ˆX›HX›XË˜][™[˜ÙH[˜X›H›İÈ]™[ÙXİ\š]NÂ‚™›ÜÛXŞHYˆ^\İÈ][™[˜ÙWÜÙ[XİÛİÛ—ÛÜ—ØYZ[ˆÛˆX›XË˜][™[˜ÙNÂ˜Ü™X]HÛXŞH][™[˜ÙWÜÙ[XİÛİÛ—ÛÜ—ØYZ[ˆÛˆX›XË˜][™[˜ÙBˆ›ÜˆÙ[Xİ\Ú[™È
\XÚ\[ÚYH]]ZY

HÜˆX›XËš\×ØYZ[Š
JNÂ‚‹KH9¦î8àcz/¯8àoøàkú`bùe­Š9cåù.æ9¢áyodÊxàk¸àoøà ”T¹cåù.æ8àkùë¨yä!¹å.úgh¸àbøà¢z(c8àa‚™›ÜÛXŞHYˆ^\İÈ][™[˜ÙWØYZ[—İÜš]HÛˆX›XË˜][™[˜ÙNÂ˜Ü™X]HÛXŞH][™[˜ÙWØYZ[—İÜš]HÛˆX›XË˜][™[˜ÙBˆ›Üˆ[\Ú[™È
X›XËš\×ØYZ[Š
JHÚ]ÚXÚÈ
X›XËš\×ØYZ[Š
JNÂ‚‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB‹KH9¥¬9ç`9.©9­`y/&¸àèxàï8àêú`&¹çéxàkº` y/èyâ­¹¬àB‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB˜[\ˆX›HX›XË™]™[ÂˆYÛÛ[[ˆYˆ›İ^\İÈ›İYšYYØ][Y\İ[\Â˜[\ˆX›HX›XË™]™[ÂˆYÛÛ[[ˆYˆ›İ^\İÈ›İYšYYØÛİ[[Â‚‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB‹KHÙ]ÛY[X™\—Ù\™XİÜNˆ9cà¹b¨: !yd#yì/Ê9cà¹b¨: !xà¨¸àåøàê¹`m8àbøà¢y.å¸àk¹cà¹b¨: !xàk¸àåøàëxàåxà¨øàï8àêøà¤ºe¬º)©ÊB‹KH8àèxàï8àêøà¨¸àâxàë8à®xàkùd*øà xàj¸àa
:`(ùíhyab8àkøàç¸ààøààxàìøà¬9¢$9êâùo£8àk¸àoúe¢ùé.ŠB‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB˜Ü™X]HÜˆ™\XÙH[˜İ[ÛˆX›XË™Ù]ÛY[X™\—Ù\™XİÜJ
Bœ™]\›œÈX›Jˆ\XÚ\[ÚY]ZYˆ˜[YH^ˆÛÛ\[H^ˆ[™\İH^ˆÛÛ›™XİİÚ]^ˆÛÛ›™XİİÚ]İYÜÈ^×Kˆš[È^ˆ]™[×Ø][™Y[ŠB›[™İXYÙHÜ[œÙXİ\š]HYš[™\ˆÙ]ÙX\˜ÚÜ]HX›XÂœİX›B˜\È		ˆÙ[XİˆšY\È\XÚ\[ÚYˆ›˜[YKˆ˜ÛÛ\[Kˆš[™\İKˆ˜ÛÛ›™XİİÚ]ˆ˜ÛÛ›™XİİÚ]İYÜËˆ˜š[Ëˆ
ˆÙ[XİÛİ[

ŠNš[œ›ÛHX›XËœ™YÚ\İ˜][ÛœÈ‚ˆÚ\™H‹œ\XÚ\[ÚYHšY[™‹˜][™[™ÈHYBˆ
H\È]™[×Ø][™Yˆœ›ÛHX›XËœ›Ùš[\ÈˆÚ\™Hœ›ÛHH	Ü\XÚ\[	Âˆ[™šYˆ]]ZY

BˆÜ™\ˆH›˜[YH[È\İÂ‰	Â‚™Ü˜[^Xİ]HÛˆ[˜İ[ÛˆX›XË™Ù]ÛY[X™\—Ù\™XİÜJ
HÈ]][XØ]YÂ‚‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB‹KH9cà¹b¨: !xàåøàëxàåxà¨øàï8àêúh!yæë¸àkº/ïyb¨
: mùê+øàîùonz møàîúfîú*lyåj¹cíÊB‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB˜[\ˆX›HX›XËœ›Ùš[\ÈYÛÛ[[ˆYˆ›İ^\İÈ›Ø—İ\H^Â˜[\ˆX›HX›XËœ›Ùš[\ÈYÛÛ[[ˆYˆ›İ^\İÈ›Ø—İ]H^Â˜[\ˆX›HX›XËœ›Ùš[\ÈYÛÛ[[ˆYˆ›İ^\İÈÛ™H^Â‚‹KHÙ]ÛY[X™\—Ù\™XİÜH8à¤º mùê+¸àîùonnz møà º/å8àfxà¢8àa¸àjùa£yk¦¹ïªJ:fîú*lyåj¹cíøàkùd*øà xàj¸àa
B™›Ü[˜İ[ÛˆYˆ^\İÈX›XË™Ù]ÛY[X™\—Ù\™XİÜJ
NÂ˜Ü™X]HÜˆ™\XÙH[˜İ[ÛˆX›XË™Ù]ÛY[X™\—Ù\™XİÜJ
Bœ™]\›œÈX›Jˆ\XÚ\[ÚY]ZYˆ˜[YH^ˆÛÛ\[H^ˆ›Ø—İ\H^ˆ›Ø—İ]H^ˆ[™\İH^ˆÛÛ›™XİİÚ]^ˆÛÛ›™XİİÚ]İYÜÈ^×Kˆš[È^ˆ]™[×Ø][™Y[ŠB›[™İXYÙHÜ[œÙXİ\š]HYš[™\ˆÙ]ÙX\˜ÚÜ]HX›XÂœİX›B˜\È		ˆÙ[XİˆšY\È\XÚ\[ÚYˆ›˜[YKˆ˜ÛÛ\[Kˆš›Ø—İ\Kˆš›Ø—İ]Kˆš[™\İKˆ˜ÛÛ›™XİİÚ]ˆ˜ÛÛ›™XİİÚ]İYÜËˆ˜š[Ëˆ
ˆÙ[XİÛİ[

ŠNš[œ›ÛHX›XËœ™YÚ\İ˜][ÛœÈ‚ˆÚ\™H‹œ\XÚ\[ÚYHšY[™‹˜][™[™ÈHYBˆ
H\È]™[×Ø][™Yˆœ›ÛHX›XËœ›Ùš[\ÈˆÚ\™Hœ›ÛHH	Ü\XÚ\[	Âˆ[™šYˆ]]ZY

BˆÜ™\ˆH›˜[YH[È\İÂ‰	Â‚™Ü˜[^Xİ]HÛˆ[˜İ[ÛˆX›XË™Ù]ÛY[X™\—Ù\™XİÜJ
HÈ]][XØ]YÂ‚‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB‹KHY\ÜØYÙ\Îˆ8àç¸ààøàày¢$9êâøàeøàgùæî9¢bùd#9hêøàk¸ààxàèøààøàâ
9liy«m8àkù.©9­`y/&¸à¤¸ào¸àgøàa8àiú$á9êcJB‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB˜Ü™X]HX›HYˆ›İ^\İÈX›XË›Y\ÜØYÙ\È
ˆY]ZYš[X\HÙ^HY˜][Ù[—Ü˜[™ÛWİ]ZY

KˆÙ[™\—ÚY]ZY›İ[™Y™\™[˜Ù\ÈX›XËœ›Ùš[\ÊY
HÛˆ[]HØ\ØØYKˆ™XÚ\Y[ÚY]ZY›İ[™Y™\™[˜Ù\ÈX›XËœ›Ùš[\ÊY
HÛˆ[]HØ\ØØYKˆÛÛ[^›İ[ÚXÚÈ
Ú\—Û[™İ
š[JÛÛ[
JHˆ
Kˆ™XYØ][Y\İ[\‹ˆÜ™X]YØ][Y\İ[\ˆ›İ[Y˜][›İÊ
KˆÚXÚÈ
Ù[™\—ÚYˆ™XÚ\Y[ÚY
BŠNÂ‚˜Ü™X]H[™^Yˆ›İ^\İÈY\ÜØYÙ\×ÜZ\—ØÜ™X]YÚYˆÛˆX›XË›Y\ÜØYÙ\È
X\İ
Ù[™\—ÚY™XÚ\Y[ÚY
KÜ™X]\İ
Ù[™\—ÚY™XÚ\Y[ÚY
KÜ™X]YØ]
NÂ‚˜Ü™X]H[™^Yˆ›İ^\İÈY\ÜØYÙ\×Ü™XÚ\Y[İ[œ™XYÚYˆÛˆX›XË›Y\ÜØYÙ\È
™XÚ\Y[ÚY™XYØ]
NÂ‚‹KH:`c¹c®ùd*øà xà xàa8àf¸à£8àbøàk¹.©9­`y/&¸àiùæî9.¤¸àjøà#:*lxàeøài¸àoøàgøàa8à#xàc9¢$9êâøàeøài¸àa8à¢ùæî9¢bøàbÂ˜Ü™X]HÜˆ™\XÙH[˜İ[ÛˆX›XËš\×ÛX]ÚYİÚ]
İ\—ÚY]ZY
Bœ™]\›œÈ›ÛÛX[‚›[™İXYÙHÜ[œÙXİ\š]HYš[™\ˆÙ]ÙX\˜ÚÜ]HX›XÂœİX›B˜\È		ˆÙ[Xİ^\İÊˆÙ[XİHœ›ÛHX›XË›ZÙ\ÈBˆ›Ú[ˆX›XË›ZÙ\È‚ˆÛˆK™]™[ÚYH‹™]™[ÚYˆ[™K™œ›ÛWÚYH‹×ÚYˆ[™K×ÚYH‹™œ›ÛWÚYˆÚ\™HK™œ›ÛWÚYH]]ZY

H[™K×ÚYHİ\—ÚYˆ
NÂ‰	Â‚™Ü˜[^Xİ]HÛˆ[˜İ[ÛˆX›XËš\×ÛX]ÚYİÚ]
]ZY
HÈ]][XØ]YÂ‚˜[\ˆX›HX›XË›Y\ÜØYÙ\È[˜X›H›İÈ]™[ÙXİ\š]NÂ‚™›ÜÛXŞHYˆ^\İÈY\ÜØYÙ\×ÜÙ[XİÛİÛˆÛˆX›XË›Y\ÜØYÙ\ÎÂ˜Ü™X]HÛXŞHY\ÜØYÙ\×ÜÙ[XİÛİÛˆÛˆX›XË›Y\ÜØYÙ\Âˆ›ÜˆÙ[Xİ\Ú[™È
Ù[™\—ÚYH]]ZY

HÜˆ™XÚ\Y[ÚYH]]ZY

HÜˆX›XËš\×ØYZ[Š
JNÂ‚‹KH:` y/èxàkøàç¸ààøààxàc9¢$9êâøàeøài¸àa8à¢ùæî9¢bøàjøàk¸àoú*,ycëÊ9¥èº*«xàåxàêxà¬8àk¹¦í9¥¬8àkÈX\š×ØÛÛ™\œØ][Û—Ü™XY9íc9å,xàk¸àoÊB™›ÜÛXŞHYˆ^\İÈY\ÜØYÙ\×Ú[œÙ\ÛX]ÚYÛˆX›XË›Y\ÜØYÙ\ÎÂ˜Ü™X]HÛXŞHY\ÜØYÙ\×Ú[œÙ\ÛX]ÚYÛˆX›XË›Y\ÜØYÙ\Âˆ›Üˆ[œÙ\Ú]ÚXÚÈ
ˆÙ[™\—ÚYH]]ZY

H[™X›XËš\×ÛX]ÚYİÚ]
™XÚ\Y[ÚY
Bˆ
NÂ‚˜Ü™X]HÜˆ™\XÙH[˜İ[ÛˆX›XË›X\š×ØÛÛ™\œØ][Û—Ü™XY
\™\ˆ]ZY
Bœ™]\›œÈ›ÚY›[™İXYÙHÜ[œÙXİ\š]HYš[™\ˆÙ]ÙX\˜ÚÜ]HX›XÂ˜\È		ˆ\]HX›XË›Y\ÜØYÙ\ÂˆÙ]™XYØ]H›İÊ
BˆÚ\™H™XÚ\Y[ÚYH]]ZY

H[™Ù[™\—ÚYH\™\ˆ[™™XYØ]\È[Â‰	Â‚™Ü˜[^Xİ]HÛˆ[˜İ[ÛˆX›XË›X\š×ØÛÛ™\œØ][Û—Ü™XY
]ZY
HÈ]][XØ]YÂ‚‹KH8ààxàèøààøàâ9æî9¢bøàk¸àåøàëxàåxà¨øàï8àêÊ8àç¸ààøààxàeøài¸àa8à¢ùh-9d"8àk¸àoú/å8àfxà œ›Ùš[\È8àkù§+9.®¸àk¸àoúe¬º)©ùcëøàk¸àgøà yl ¹å*”øàc9oáz) JB‹KHX]ÚYØ]ˆ8àa8ài8àç¸ààøààxàc9¢$9êâøàeøàgøàbÊZ\œúhª8àk¸ààxàèøààøàâ9a¤ºh+xà#8à!ù§"8à!ù¥éxàjøàç¸ààøààxàeøào¸àeøàgøà#z(j9é.¹å*
B˜Ü™X]HÜˆ™\XÙH[˜İ[ÛˆX›XË™Ù]ØÛÛ™\œØ][Û—Ü\™\Š\™\ˆ]ZY
Bœ™]\›œÈX›Jˆ\XÚ\[ÚY]ZYˆ˜[YH^ˆÛÛ\[H^ˆ›Ø—İ]H^ˆ[™\İH^ˆÛÛ›™XİİÚ]^ˆX]ÚYØ][Y\İ[\‚ŠB›[™İXYÙHÜ[œÙXİ\š]HYš[™\ˆÙ]ÙX\˜ÚÜ]HX›XÂœİX›B˜\È		ˆÙ[XİˆšYˆ›˜[YKˆ˜ÛÛ\[Kˆš›Ø—İ]Kˆš[™\İKˆ˜ÛÛ›™XİİÚ]ˆ
ˆÙ[XİÜ™X]\İ
K˜Ü™X]YØ]‹˜Ü™X]YØ]
Bˆœ›ÛHX›XË›ZÙ\ÈBˆ›Ú[ˆX›XË›ZÙ\È‚ˆÛˆK™]™[ÚYH‹™]™[ÚY[™K™œ›ÛWÚYH‹×ÚY[™K×ÚYH‹™œ›ÛWÚYˆÚ\™HK™œ›ÛWÚYH]]ZY

H[™K×ÚYH\™\‚ˆÜ™\ˆHÜ™X]\İ
K˜Ü™X]YØ]‹˜Ü™X]YØ]
H\ØÂˆ[Z]Bˆ
H\ÈX]ÚYØ]ˆœ›ÛHX›XËœ›Ùš[\ÈˆÚ\™HšYH\™\‚ˆ[™X›XËš\×ÛX]ÚYİÚ]
\™\ŠNÂ‰	Â‚™Ü˜[^Xİ]HÛˆ[˜İ[ÛˆX›XË™Ù]ØÛÛ™\œØ][Û—Ü\™\Š]ZY
HÈ]][XØ]YÂ‚˜Ü™X]HÜˆ™\XÙH[˜İ[ÛˆX›XË™Ù]İ[œ™XYÛY\ÜØYÙWØÛİ[

Bœ™]\›œÈ[›[™İXYÙHÜ[œÙXİ\š]HYš[™\ˆÙ]ÙX\˜ÚÜ]HX›XÂœİX›B˜\È		ˆÙ[XİÛİ[

ŠNš[œ›ÛHX›XË›Y\ÜØYÙ\ÂˆÚ\™H™XÚ\Y[ÚYH]]ZY

H[™™XYØ]\È[Â‰	Â‚™Ü˜[^Xİ]HÛˆ[˜İ[ÛˆX›XË™Ù]İ[œ™XYÛY\ÜØYÙWØÛİ[

HÈ]][XØ]YÂ‚‹KH8à#8àèxààøà®øàï8à®8à#y. :)©Ê9¥éøàç¸ààøàày. :)©ÊNˆ8àç¸ààøààyæî9¢bøàe8àj8àjÌz(c8à y.©9­`y/&¸à¤¸ào¸àgøàa8àiúfá¹í!˜Ü™X]HÜˆ™\XÙH[˜İ[ÛˆX›XË™Ù]Û^WØÛÛ™\œØ][ÛœÊ
Bœ™]\›œÈX›Jˆ\™\—ÚY]ZYˆ˜[YH^ˆÛÛ\[H^ˆ›Ø—İ]H^ˆ\İÛY\ÜØYÙH^ˆ\İÛY\ÜØYÙWØ][Y\İ[\‹ˆ\İÜÙ[™\—ÚY]ZYˆ[œ™XYØÛİ[[ˆX]ÚYÙ]™[È^×Kˆš\œİÛX]ÚYØ][Y\İ[\‚ŠB›[™İXYÙHÜ[œÙXİ\š]HYš[™\ˆÙ]ÙX\˜ÚÜ]HX›XÂœİX›B˜\È		ˆÚ]]]X[\È
ˆÙ[XİK×ÚY\È\™\—ÚYˆZ[ŠX\İ
K˜Ü™X]YØ]‹˜Ü™X]YØ]
JH\Èš\œİÛX]ÚYØ]ˆ\œ˜^WØYÙÊ\İ[˜İK]HÜ™\ˆHK]JH\ÈX]ÚYÙ]™[Âˆœ›ÛHX›XË›ZÙ\ÈBˆ›Ú[ˆX›XË›ZÙ\È‚ˆÛˆK™]™[ÚYH‹™]™[ÚY[™K™œ›ÛWÚYH‹×ÚY[™K×ÚYH‹™œ›ÛWÚYˆ›Ú[ˆX›XË™]™[ÈHÛˆKšYHK™]™[ÚYˆÚ\™HK™œ›ÛWÚYH]]ZY

BˆÜ›İ\HK×ÚYˆ
Kˆ\İÛ\ÙÈ\È
ˆÙ[Xİ\İ[˜İÛˆ
\™\—ÚY
Bˆ\™\—ÚYÛÛ[Ü™X]YØ]Ù[™\—ÚYˆœ›ÛH
ˆÙ[XİˆØ\ÙHÚ[ˆÙ[™\—ÚYH]]ZY

H[ˆ™XÚ\Y[ÚY[ÙHÙ[™\—ÚY[™\È\™\—ÚYˆÛÛ[Ü™X]YØ]Ù[™\—ÚYˆœ›ÛHX›XË›Y\ÜØYÙ\ÂˆÚ\™HÙ[™\—ÚYH]]ZY

HÜˆ™XÚ\Y[ÚYH]]ZY

Bˆ
HˆÜ™\ˆH\™\—ÚYÜ™X]YØ]\ØÂˆ
Kˆ[œ™XY\È
ˆÙ[XİÙ[™\—ÚY\È\™\—ÚYÛİ[

ŠNš[\ÈÛˆœ›ÛHX›XË›Y\ÜØYÙ\ÂˆÚ\™H™XÚ\Y[ÚYH]]ZY

H[™™XYØ]\È[ˆÜ›İ\HÙ[™\—ÚYˆ
BˆÙ[XİˆKœ\™\—ÚYˆ›˜[YKˆ˜ÛÛ\[Kˆš›Ø—İ]KˆK˜ÛÛ[\È\İÛY\ÜØYÙKˆK˜Ü™X]YØ]\È\İÛY\ÜØYÙWØ]ˆKœÙ[™\—ÚY\È\İÜÙ[™\—ÚYˆÛØ[\ØÙJK˜Û
H\È[œ™XYØÛİ[ˆK›X]ÚYÙ]™[ËˆK™š\œİÛX]ÚYØ]ˆœ›ÛH]]X[Bˆ›Ú[ˆX›XËœ›Ùš[\ÈÛˆšYHKœ\™\—ÚYˆY›Ú[ˆ\İÛ\ÙÈHÛˆKœ\™\—ÚYHKœ\™\—ÚYˆY›Ú[ˆ[œ™XYHÛˆKœ\™\—ÚYHKœ\™\—ÚYˆÜ™\ˆHÛØ[\ØÙJK˜Ü™X]YØ]K™š\œİÛX]ÚYØ]
H\ØÎÂ‰	Â‚™Ü˜[^Xİ]HÛˆ[˜İ[ÛˆX›XË™Ù]Û^WØÛÛ™\œØ][ÛœÊ
HÈ]][XØ]YÂ‚‹KH™X[[YNˆ8ààxàèøààøàâ8àk¹¥¬9ç`8àèxààøà®øàï8à®8à¤¸à«øàêxà©8à¨¸àìøàâ8àjúacy/èxàiøàcxà¢øà¢8àa¸àjøàfxà¢Â™È		˜™YÚ[‚ˆYˆ›İ^\İÈ
ˆÙ[XİHœ›ÛH×ÜX›XØ][Û—İX›\ÂˆÚ\™HX›˜[YHH	Üİ\X˜\ÙWÜ™X[[YIÈ[™ØÚ[X[˜[YHH	ÜX›XÉÈ[™X›[˜[YHH	ÛY\ÜØYÙ\ÉÂˆ
H[‚ˆ[\ˆX›XØ][Ûˆİ\X˜\ÙWÜ™X[[YHYX›HX›XË›Y\ÜØYÙ\ÎÂˆ[™YÂ™[™		Â‚‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB‹KHÙ]Û^WØØ\][Üİ[[X\Nˆ9cà¹b¨: !yd$xàdxà#8à`¸àj¸àgøàk¹.®¹æ¡:,áù§+8à#xàà8ààøà­øàéN89Î8;Î88™¸nŠˆ€¢ÒÒXø.Xª8~8şKªNkXKÉ®i[8;¾8N8®8Î8>8şK«®i[8;¾8(N8(®88(®8~8ş8:88>8+¾8;Î8+i[8®8’¢ÒÒÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ¦7&VFR÷"&WÆ6RgVæ7F–öâV&Æ–2ævWEö×•ö6—FÅ÷7VÖÖ'’‚§&WGW&ç2F&ÆR€¢WfVçG5öGFVæFVB–çBÀ¢6öææV7F–öç5ö6÷VçB–çBÀ¢ÖW76vW5ö6÷VçB–çBÀ¢f—'7EöGFVæFVEöBF–ÖW7F×G¢À¢ÆFW7E÷'FæW%öæÖRFW‡BÀ¢ÆFW7EöÖF6†VEöBF–ÖW7F×G ¢¦ÆæwVvR7À§6V7W&—G’FVf–æW"6WB6V&6…÷F‚ÒV&Æ–0§7F&ÆP¦2B@¢v—F‚GB2€¢6VÆV7B6÷VçB‚¢“£¦–çB22ÂÖ–â†6†V6¶VEö–åöB’2f—'7Eö@¢g&öÒV&Æ–2æGFVæFæ6P¢v†W&R'F–6—çEö–BÒWF‚çV–B‚’æB6†V6¶VEö–åöB—2æ÷BçVÆÀ¢’À¢6öæâ2€¢6VÆV7BçFõö–B2'FæW%ö–BÂÖ–â†ÆV7B†æ7&VFVEöBÂ"æ7&VFVEöB’’2ÖF6†VEö@¢g&öÒV&Æ–2æÆ–¶W2¢¦ö–âV&Æ–2æÆ–¶W2 ¢öâæWfVçEö–BÒ"æWfVçEö–BæBæg&öÕö–BÒ"çFõö–BæBçFõö–BÒ"æg&öÕö–@¢v†W&Ræg&öÕö–BÒWF‚çV–B‚¢w&÷W'’çFõö–@¢’À¢ÆFW7B2€¢6VÆV7BææÖRÂ2æÖF6†VEö@¢g&öÒ6öæâ0¢¦ö–âV&Æ–2ç&öf–ÆW2öâæ–BÒ2ç'FæW%ö–@¢÷&FW"'’2æÖF6†VEöBFW60¢Æ–Ö—B¢’À¢×6r2€¢6VÆV7B6÷VçB‚¢“£¦–çB22g&öÒV&Æ–2æÖW76vW0¢v†W&R6VæFW%ö–BÒWF‚çV–B‚’÷"&V6—–VçEö–BÒWF‚çV–B‚¢¢6VÆV7@¢6öÆW66R‚‡6VÆV7B2g&öÒGB’Â’À¢6öÆW66R‚‡6VÆV7B6÷VçB‚¢“£¦–çBg&öÒ6öæâ’Â’À¢6öÆW66R‚‡6VÆV7B2g&öÒ×6r’Â’À¢‡6VÆV7Bf—'7EöBg&öÒGB’À¢‡6VÆV7BæÖRg&öÒÆFW7B’À¢‡6VÆV7BÖF6†VEöBg&öÒÆFW7B“°¢BC° ¦w&çBW†V7WFRöâgVæ7F–öâV&Æ–2ævWEö×•ö6—FÅ÷7VÖÖ'’‚’FòWF†VçF–6FVC° ¢ÒÒÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ¢ÒÒvWE÷W6öÖ–æuöWfVçG5÷V&Æ–3¢iÊ®8:Ş8+8*N8;>8~8(.Šh¾8(8(Î8(¾XZÎ™h¾8*N898;>88h8^Z¢ÒÒ„888:>88>8889Î88>888ÎiÈik8î™h¾X*ÎK¨Zé®8).zÙN88(8(Î8(¾8(8n8¾88(¾8ş8(8îiÈ[ş™™8îXZÎ™h¾89>8:^8;Â¢ÒÒÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ¦7&VFR÷"&WÆ6RgVæ7F–öâV&Æ–2ævWE÷W6öÖ–æuöWfVçG5÷V&Æ–2‚§&WGW&ç2F&ÆR€¢F—FÆRFW‡BÀ¢WfVçEöFFRFFRÀ¢7F'E÷F–ÖRF–ÖRÀ¢fVçVRFW‡BÀ¢FW67&—F–öâFW‡BÀ¢fVUöæ÷FRFW‡@¢¦ÆæwVvR7À§6V7W&—G’FVf–æW"6WB6V&6…÷F‚ÒV&Æ–0§7F&ÆP¦2B@¢6VÆV7BF—FÆRÂWfVçEöFFRÂ7F'E÷F–ÖRÂfVçVRÂFW67&—F–öâÂfVUöæ÷FP¢g&öÒV&Æ–2æWfVçG0¢v†W&RWfVçEöFFRãÒ7W'&VçEöFFP¢æB7FGW2–â‚wW6öÖ–ærrÂv6Æ÷6VBr¢÷&FW"'’WfVçEöFFR60¢Æ–Ö—BS°¢BC° ¦w&çBW†V7WFRöâgVæ7F–öâV&Æ–2ævWE÷W6öÖ–æuöWfVçG5÷V&Æ–2‚’FòæöâÂWF†VçF–6FVC° ¢ÒÒÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ¢ÒÒ7W÷'Eö–çV—&–W3¢888:>88>8889Î88>88{XÎyK8î8Î˜	®Z8Ş8Î˜¾Ykn88îYXş8NY8(ş8¾8Ğ¢ÒÒiÊ®8:Ş8+8*N8;2†æöâ8îiÚ^ZNˆ^8~8(.˜Kú8~8Ş8(¾8(8n8–ç6W'B8òæöâ8¾8(.Š‹Xúş88(¾8 ¢ÒÒ™k.Šj~8;¾i»NikZûî[ùÎx«nk88îZHi»B8ş˜¾Ykb†FÖ–â8î8ş8.iÊÎK«®8şˆz®Xˆn8Î˜8>8şXˆn88™k.Šj~Xúş8 ¢ÒÒÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ¦7&VFRF&ÆR–bæ÷BW†—7G2V&Æ–2ç7W÷'Eö–çV—&–W2€¢–BWV–B&–Ö'’¶W’FVfVÇBvVå÷&æFöÕ÷WV–B‚’À¢¶–æBFW‡Bæ÷BçVÆÂ6†V6²†¶–æB–â‚w&W÷'BrÂv6öçF7Br’’À¢'F–6—çEö–BWV–B&VfW&Væ6W2V&Æ–2ç&öf–ÆW2†–B’öâFVÆWFR6WBçVÆÂÀ¢6öçF7EöæÖRFW‡BÀ¢6öçF7EöVÖ–ÂFW‡BÀ¢7VÖÖ'’FW‡Bæ÷BçVÆÂÀ¢FWF–Ç2FW‡BÀ¢—5ö'W6–æW75ö†÷W'2&ööÆVâÀ¢7FGW2FW‡Bæ÷BçVÆÂFVfVÇBv÷Vâr6†V6²‡7FGW2–â‚v÷VârÂv–å÷&öw&W72rÂw&W6öÇfVBr’’À¢7&VFVEöBF–ÖW7F×G¢æ÷BçVÆÂFVfVÇBæ÷r‚’À¢&W6öÇfVEöBF–ÖW7F×G¢À¢&W6öÇfVEö'’WV–B&VfW&Væ6W2V&Æ–2ç&öf–ÆW2†–B’öâFVÆWFR6WBçVÆÀ¢“° ¦7&VFR–æFW‚–bæ÷BW†—7G27W÷'Eö–çV—&–W5÷7FGW5ö7&VFVEö–G€¢öâV&Æ–2ç7W÷'Eö–çV—&–W2‡7FGW2Â7&VFVEöBFW62“° ¦ÇFW"F&ÆRV&Æ–2ç7W÷'Eö–çV—&–W2Væ&ÆR&÷rÆWfVÂ6V7W&—G“° ¢ÒÒ–ç6W'C¢Š«8~8(.˜KúXúò†æöîY
¾8(8.8:Ş8+8*N8;>KŠŞ8şˆz®Xˆn8â'F–6—çEö–B8î8şhÈ~Zé®Xúşˆ;Ş8 ¦G&÷öÆ–7’–bW†—7G27W÷'Eö–çV—&–W5ö–ç6W'Eöç’öâV&Æ–2ç7W÷'Eö–çV—&–W3°¦7&VFRöÆ–7’7W÷'Eö–çV—&–W5ö–ç6W'Eöç’öâV&Æ–2ç7W÷'Eö–çV—&–W0¢f÷"–ç6W'BFòæöâÂWF†VçF–6FV@¢v—F‚6†V6²‡'F–6—çEö–B—2çVÆÂ÷"'F–6—çEö–BÒWF‚çV–B‚’“° ¢ÒÒ6VÆV7C¢˜¾Ykn8şXZK»n8iÊÎK«®8şˆz®Xˆn8Î˜Kú8~8şXˆn8î8ğ¦G&÷öÆ–7’–bW†—7G27W÷'Eö–çV—&–W5÷6VÆV7Eö÷våö÷%öFÖ–âöâV&Æ–2ç7W÷'Eö–çV—&–W3°¦7&VFRöÆ–7’7W÷'Eö–çV—&–W5÷6VÆV7Eö÷våö÷%öFÖ–âöâV&Æ–2ç7W÷'Eö–çV—&–W0¢f÷"6VÆV7BW6–ær€¢V&Æ–2æ—5öFÖ–â‚¢÷"‡'F–6—çEö–B—2æ÷BçVÆÂæB'F–6—çEö–BÒWF‚çV–B‚’¢“° ¢ÒÒWFFS¢Zûî[ùÎx«nk88îZHi»N8ş˜¾Ykn8î8ğ¦G&÷öÆ–7’–bW†—7G27W÷'Eö–çV—&–W5÷WFFUöFÖ–âöâV&Æ–2ç7W÷'Eö–çV—&–W3°¦7&VFRöÆ–7’7W÷'Eö–çV—&–W5÷WFFUöFÖ–âöâV&Æ–2ç7W÷'Eö–çV—&–W0¢f÷"WFFRW6–ær‡V&Æ–2æ—5öFÖ–â‚’’v—F‚6†V6²‡V&Æ–2æ—5öFÖ–â‚’“° ¦w&çB–ç6W'BöâV&Æ–2ç7W÷'Eö–çV—&–W2FòæöâÂWF†VçF–6FVC°¦w&çB6VÆV7BÂWFFRöâV&Æ–2ç7W÷'Eö–çV—&–W2FòWF†VçF–6FVC° ¢ÒÒ˜¾YknY	8¢Zûî[ùÎkˆ8ş8¾88(°¦7&VFR÷"&WÆ6RgVæ7F–öâV&Æ–2ç&W6öÇfU÷7W÷'Eö–çV—'’†–çV—'•ö–BWV–B§&WGW&ç2fö–@¦ÆæwVvRÇw7À§6V7W&—G’FVf–æW"6WB6V&6…÷F‚ÒV&Æ–0¦2B@¦&Vv–à¢–bæ÷BV&Æ–2æ—5öFÖ–â‚’F†Và¢&—6RW†6WF–öâvFÖ–âöæÇ’s°¢VæB–c°¢WFFRV&Æ–2ç7W÷'Eö–çV—&–W0¢6WB7FGW2Òw&W6öÇfVBrÂ&W6öÇfVEöBÒæ÷r‚’Â&W6öÇfVEö'’ÒWF‚çV–B‚¢v†W&R–BÒ–çV—'•ö–C°¦VæC°¢BC° ¦w&çBW†V7WFRöâgVæ7F–öâV&Æ–2ç&W6öÇfU÷7W÷'Eö–çV—'’‡WV–B’FòWF†VçF–6FVC° ¢ÒÒÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ¢ÒÒWfVçEöfVVF&6³¢Xø.Xª[èÎ8*.8;>8+8;Î88‚k¨‹k>[ªn8;´å>8;¾ˆz®yKŠ‰‹û¢ÒÒÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ¦7&VFRF&ÆR–b&æ÷BW†—7G2V&Æ–2æWfVçEöfVVF&6²€¢–BWV–B&–Ö'’¶W’FVfVÇBvVå÷&æFöÕ÷WV–B‚’À¢WfVçEö–BWV–Bæ÷BçVÆÂ&VfW&Væ6W2V&Æ–2æWfVçG2†–B’öâFVÆWFR666FRÀ¢'F–6—çEö–BWV–Bæ÷BçVÆÂ&VfW&Væ6W2V&Æ–2ç&öf–ÆW2†–B’öâFVÆWFR666FRÀ¢&F–ær–çBæ÷BçVÆÂ6†V6²‡&F–ær&WGvVVâæBR’À¢v÷VÆE÷&V6öÖÖVæBFW‡Bæ÷BçVÆÂ6†V6²‡v÷VÆE÷&V6öÖÖVæB–â‚w–W2rÂvæWWG&ÂrÂvæòr’’À¢6öÖÖVçBFW‡BÀ¢7&VFVEöBF–ÖW7F×G¢æ÷BçVÆÂFVfVÇBæ÷r‚’À¢Væ—VR†WfVçEö–BÂ'F–6—çEö–B¢“° ¦7&VFR–æFW‚–bæ÷BW†—7G2WfVçEöfVVF&6µöWfVçEö–G‚öâV&Æ–2æWfVçEöfVVF&6²†WfVçEö–B“° ¦ÇFW"F&ÆRV&Æ–2æWfVçEöfVVF&6²Væ&ÆR&÷rÆWfVÂ6V7W&—G“° ¦G&÷öÆ–7’–bW†—7G2WfVçEöfVVF&6µö–ç6W'Eö÷vâöâV&Æ–2æWfVçEöfVVF&6³°¦7&VFRöÆ–7’WfVçEöfVVF&6µö–ç6W'Eö÷vâöâV&Æ–2æWfVçEöfVVF&6°¢f÷"–ç6W'BFòWF†VçF–6FV@¢v—F‚6†V6²‡'F–6—çEö–BÒWF‚çV–B‚’“° ¦G&÷öÆ–7’–bW†—7G2WfVçEöfVVF&6µ÷WFFUö÷vâöâV&Æ–2æWfVçEöfVVF&6³°¦7&VFRöÆ–7’WfVçEöfVVF&6µ÷WFFUö÷vâöâV&Æ–2æWfVçEöfVVF&6°¢f÷"WFFRFòWF†VçF–6FV@¢W6–ær†‡'F–6—çEö–BÒWF‚çV–B‚’¢v—F‚6†V6²‡'F–6—çEö–BÒWF‚çV–B‚’“° ¦F–GGöÆ–7’–bW†—7G2WfVçEöfVVF&6µ÷6VÆV7Eö÷våö÷%öFÖ–âöâV&Æ–2æWfVçEöfVVF&6³°¦7&VFRöÆ–7’WfVçEöfVVF&6µ÷6VÆV7Eö÷våö÷%öFÖ–âöâV&Æ–2æWfVçEöfVVF&6°¢f÷"6VÆV7BW6–ær‡'F–6—çEö–BÒWF‚çV–B‚’÷"V&Æ–2æ—5öFÖ–â‚’“° ¦w&çB–ç6W'BÂWFFRÂ6VÆV7BöâV&Æ–2æWfVçEöfVVF&6²FòWF†VçF–6FVC° ¢ÒÒvWE÷VæF–æuöfVVF&6µöWfVçG3¢ˆz®Xˆn8ÎXø.Xª8~8ò™h¾X*Îiz^8Î˜î8î8ò88î88*.8;>8+8;Î88iÊ®Y¹îzÙN8îKªNkXKÉ ¦7&VFR÷"&WÆ6RgVæ7F–öâV&Æ–2ævWE÷VæF–æuöfVVF&6µöWfVçG2‚§&WGW&ç2F&ÆR€¢WfVçEö–BWV–BÀ¢F—FÆRFW‡BÀ¢WfVçEöFFRFFP¢¦ÆæwVvR7À§6V7W&—G’FVf–æW"6WB6V&6…÷F‚ÒV&Æ–0§7F&ÆP¦2B@¢6VÆV7BRæ–BÂRçF—FÆRÂRæWfVçEöFFP¢g&öÒV&Æ–2æWfVçG2P¢¦ö–âV&Æ–2ç&Vv—7G&F–öç2"öâ"æWfVçEö–BÒRæ–@¢v†W&R"ç'F–6—çEö–BÒWF‚çV–B‚¢æB"æGFVæF–ærÒG'VP¢æBRæWfVçEöFFRÂ7W'&VçEöFFP¢æBæ÷BW†—7G2€¢6VÆV7Bg&öÒV&Æ–2æWfVçEöfVVF&6²`¢v†W&RbæWfVçEö–BÒRæ–BæBbç'F–6—çEö–BÒWF‚çV–B‚¢¢÷&FW"'’RæWfVçEöFFRFW63°¢BC° ¦w&çBW†V7WFRöâgVæ7F–öâV&Æ–2ævWE÷VæF–æuöfVVF&6µöWfVçG2‚’FòWF†VçF–6FVC° ¢ÒÒ7V&Ö—EöWfVçEöfVVF&6³¢8*.8;>8+8;Î88˜Kúôù¦í9¥¬˜Ü™X]HÜˆ™\XÙH[˜İ[ÛˆX›XËœİX›Z]Ù]™[Ù™YY˜XÚÊˆÙ]™[ÚY]ZYˆÜ˜][™È[ˆİÛİ[Ü™XÛÛ[Y[™^ˆØÛÛ[Y[^ŠBœ™]\›œÈ›ÚY›[™İXYÙHÜÜ[œÙXİ\š]HYš[™\ˆÙ]ÙX\˜ÚÜ]HX›XÂ˜\È		˜™YÚ[‚ˆ[œÙ\[ÈX›XË™]™[Ù™YY˜XÚÈ
]™[ÚY\XÚ\[ÚY˜][™ËÛİ[Ü™XÛÛ[Y[™ÛÛ[Y[
Bˆ˜[Y\È
Ù]™[ÚY]]ZY

KÜ˜][™ËİÛİ[Ü™XÛÛ[Y[™[YŠØÛÛ[Y[	ÉÊJBˆÛˆÛÛ™›Xİ
]™[ÚY\XÚ\[ÚY
BˆÈ\]HÙ]ˆ˜][™ÈH^ÛYYœ˜][™ËˆÛİ[Ü™XÛÛ[Y[™H^ÛYYÛİ[Ü™XÛÛ[Y[™ˆÛÛ[Y[H^ÛYY˜ÛÛ[Y[Â™[™Â‰	Â‚™Ü˜[^Xİ]HÛˆ[˜İ[ÛˆX›XËœİX›Z]Ù]™[Ù™YY˜XÚÊ]ZY[^^
HÈ]][XØ]YÂ‚‹KHÙ]Ù]™[Ù™YY˜XÚ×Üİ[[X\Nˆ:`bùe­¹d$xàdzfáº*"
8à©8àæxàìøàâ8àe8àj8àk¹nlùgaú*ey/¨xàîÓ”ùa¡z*,ÊB˜Ü™X]HÜˆ™\XÙH[˜İ[ÛˆX›XË™Ù]Ù]™[Ù™YY˜XÚ×Üİ[[X\J
Bœ™]\›œÈX›Jˆ]™[ÚY]ZYˆ]H^ˆ]™[Ù]H]Kˆ™\ÜÛœÙWØÛİ[[ˆ]™×Ü˜][™È[Y\šXËˆ›Û[İ\œÈ[ˆ™]]˜[È[ˆ]˜XİÜœÈ[ˆœÈ[ŠB›[™İXYÙHÜ[œÙXİ\š]HYš[™\ˆÙ]ÙX\˜ÚÜ]HX›XÂœİX›B˜\È		ˆÙ[XİˆKšYˆK]KˆK™]™[Ù]KˆÛİ[
‹šY
Nš[\È™\ÜÛœÙWØÛİ[ˆ›İ[™
]™Ê‹œ˜][™ÊN›[Y\šXËJH\È]™×Ü˜][™ËˆÛİ[

ŠHš[\ˆ
Ú\™H‹Ûİ[Ü™XÛÛ[Y[™H	ŞY\ÉÊNš[\È›Û[İ\œËˆÛİ[

ŠHš[\ˆ
Ú\™H‹Ûİ[Ü™XÛÛ[Y[™H	Û™]]˜[	ÊNš[\È™]]˜[ËˆÛİ[

ŠHš[\ˆ
Ú\™H‹Ûİ[Ü™XÛÛ[Y[™H	Û›ÉÊNš[\È]˜XİÜœËˆØ\ÙHÚ[ˆÛİ[
‹šY
HH[ˆˆ[ÙH›İ[™
ˆ
Ûİ[

ŠHš[\ˆ
Ú\™H‹Ûİ[Ü™XÛÛ[Y[™H	ŞY\ÉÊN›[Y\šXÂˆHÛİ[

ŠHš[\ˆ
Ú\™H‹Ûİ[Ü™XÛÛ[Y[™H	Û›ÉÊN›[Y\šXÊBˆÈÛİ[
‹šY
H
ˆLˆ
Nš[ˆ[™\ÈœÂˆœ›ÛHX›XË™]™[ÈBˆY›Ú[ˆX›XË™]™[Ù™YY˜XÚÈˆÛˆ‹™]™[ÚYHKšYˆÚ\™HX›XËš\×ØYZ[Š
BˆÜ›İ\HKšYK]KK™]™[Ù]Bˆ]š[™ÈÛİ[
‹šY
HˆˆÜ™\ˆHK™]™[Ù]H\ØÎÂ‰	Â‚™Ü˜[^Xİ]HÛˆ[˜İ[ÛˆX›XË™Ù]Ù]™[Ù™YY˜XÚ×Üİ[[X\J
HÈ]][XØ]YÂ‚‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB‹KHYZ[—Û›İ\Îˆ:`bùe­¸àèxàìøàä8àï8àc9cà¹b¨: !xàjù«¢øàfxàèxàè¸àîøàåxàªxàëxàï8à¨¸ààøàåÂ‹KHOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOB˜Ü™X]HX›HYˆ›İ^\İÈX›XË˜YZ[—Û›İ\È
ˆY]ZYš[X\HÙ^HY˜][Ù[—Ü˜[™ÛWİ]ZY

Kˆ\XÚ\[ÚY]ZY›İ[™Y™\™[˜Ù\ÈX›XËœ›Ùš[\ÊY
HÛˆ[]HØ\ØØYKˆ]]Ü—ÚY]ZY™Y™\™[˜Ù\ÈX›XËœ›Ùš[\ÊY
HÛˆ[]HÙ][ˆ›İH^›İ[ˆÜ™X]YØ][Y\İ[\ˆ›İ[Y˜][›İÊ
BŠNÂ‚˜Ü™X]H[™^Yˆ›İ^\İÈYZ[—Û›İ\×Ü\XÚ\[ÚYÛˆX›XË˜YZ[—Û›İ\Ê\XÚ\[ÚYÜ™X]YØ]\ØÊNÂ‚˜[\ˆX›HX›XË˜YZ[—Û›İ\È[˜X›H›İÈ]™[ÙXİ\š]NÂ‚™›ÜÛXŞHYˆ^\İÈYZ[—Û›İ\×ØYZ[—Ø[ÛˆX›XË˜YZ[—Û›İ\ÎÂ˜Ü™X]HÛXŞHYZ[—Û›İ\×ØYZ[—Ø[ÛˆX›XË˜YZ[—Û›İ\Âˆ›Üˆ[\Ú[™È
X›XËš\×ØYZ[Š
JHÚ]ÚXÚÈ
X›XËš\×ØYZ[Š
JNÂ‚™Ü˜[Ù[Xİ[œÙ\[]HÛˆX›XË˜YZ[—Û›İ\ÈÈ]][XØ]YÂ‚‹KHÙ]Ü\XÚ\[ØYZ[—Üİ[[X\Nˆ:`bùe­¹d$xàdxà yânyk¦¹cà¹aªˆ^8îXø.XªZéş{‹î8+^89î8: ¦7&VFR÷"&WÆ6RgVæ7F–öâV&Æ–2ævWE÷'F–6—çEöFÖ–å÷7VÖÖ'’‡÷'F–6—çEö–BWV–B§&WGW&ç2F&ÆR€¢WfVçG5öGFVæFVB–çBÀ¢Æ7EöGFVæFVEöBF–ÖW7F×G¢À¢ÖF6†W5ö6÷VçB–çBÀ¢ÖW76vW5ö6÷VçB–ç@¢¦ÆæwVvR7À§6V7W&—G’FVf–æW"6WB6V&6…÷F‚ÒV&Æ–0§7F&ÆP¦2B@¢v—F‚GB2€¢6VÆV7B6÷VçB‚¢“£¦–çB22ÂÖ‚†6†V6¶VEö–åöB’2Æ7Eö@¢g&öÒV&Æ–2æGFVæFæ6P¢v†W&R'F–6—çEö–BÒ÷'F–6—çEö–BæB6†V6¶VEö–åöB—2æ÷BçVÆÀ¢’À¢6öæâ2€¢6VÆV7BçFõö–B2'FæW%ö–@¢g&öÒV&Æ–2æÆ–¶W2¢¦ö–âV&Æ–2æÆ–¶W2 ¢öâæWfVçEö–BÒ"æWfVçEö–BæBæg&öÕö–BÒ"çFõö–BæBçFõö–BÒ"æg&öÕö–@¢v†W&Ræg&öÕö–BÒ÷'F–6—çEö–@¢w&÷W'’çFõö–@¢’À¢×6r2€¢6VÆV7B6÷VçB‚¢“£¦–çB22g&öÒV&Æ–2æÖW76vW0¢v†W&R6VæFW%ö–BÒ÷'F–6—çEö–B÷"&V6—–VçEö–BÒ÷'F–6—çEö–@¢¢6VÆV7@¢6öÆW66R‚‡6VÆV7B2g&öÒGB’Â’À¢‡6VÆV7BÆ7EöBg&öÒGB’À¢6öÆW66R‚‡6VÆV7B6÷VçB‚¢“£¦–çBg&öÒ6öæâ’Â’À¢6öÆW66R‚‡6VÆV7B2g&öÒ×6r’Â¢v†W&RV&Æ–2æ—5öFÖ–â‚“°¢BC° ¦w&çBW†V7WFRöâgVæ7F–öâV&Æ–2ævWE÷'F–6—çEöFÖ–å÷7VÖÖ'’‡WV–B’FòWF†VçF–6FVC° ¢ÒÒvWE÷'F–6—çEö7F—f—G“¢˜¾YknY	88XZXø.Xªˆ^8îiÈ{X.Xø.Xªiz^8;¾{JşŠˆXø.XªY¹îi[KˆŠj~8îKÉyÊXŠNZé®8¾KÛş8b¦7&VFR÷"&WÆ6RgVæ7F–öâV&Æ–2ævWE÷'F–6—çEö7F—f—G’‚§&WGW&ç2F&ÆR€¢'F–6—çEö–BWV–BÀ¢Æ7EöGFVæFVEöBF–ÖW7F×G¢À¢WfVçG5öGFVæFVB–ç@¢¦ÆæwVvR7À§6V7W&—G’FVf–æW"6WB6V&6…÷F‚ÒV&Æ–0§7F&ÆP¦2B@¢6VÆV7@¢ç'F–6—çEö–BÀ¢Ö‚†æ6†V6¶VEö–åöB’2Æ7EöGFVæFVEöBÀ¢6÷VçB†æ–B“£¦–çB2WfVçG5öGFVæFV@¢g&öÒV&Æ–2æGFVæFæ6R¢v†W&RV&Æ–2æ—5öFÖ–â‚’æBæ6†V6¶VEö–åöB—2æ÷BçVÆÀ¢w&÷W'’ç'F–6—çEö–C°¢BC° ¦w&çBW†V7WFRöâgVæ7F–öâV&Æ–2ævWE÷'F–6—çEö7F—f—G’‚’FòWF†VçF–6FVC° ¢ÒÒÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ¢ÒÒ'W6–æW75ö6&G3¢YŞX‹®8î88~8+8+ş8:¾XÉb„ô5.h«ŞX{®{YiéÎ8îKùŞZÙ8.yK¾X8ş8Ş8î8(.8î8şKùŞZÙ8~8®8B¢ÒÒÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ¦7&VFRF&ÆR–bæ÷BW†—7G2V&Æ–2æ'W6–æW75ö6&G2€¢–BWV–B&–Ö'’¶W’FVfVÇBvVå÷&æFöÕ÷WV–B‚’À¢÷væW%ö–BWV–Bæ÷BçVÆÂ&VfW&Væ6W2V&Æ–2ç&öf–ÆW2†–B’öâFVÆWFR666FRÀ¢æÖRFW‡BÀ¢6ö×ç’FW‡BÀ¢¦ö%÷F—FÆRFW‡BÀ¢†öæRFW‡BÀ¢VÖ–ÂFW‡BÀ¢æ÷FRFW‡BÀ¢7&VFVEöBF–ÖW7F×G¢æ÷BçVÆÂFVfVÇBæ÷r‚¢“° ¦7&VFR–æFW‚–bæ÷BW†—7G2'W6–æW75ö6&G5ö÷væW%ö–G‚öâV&Æ–2æ'W6–æW75ö6&G2†÷væW%ö–BÂ7&VFVEöBFW62“° ¦ÇFW"F&ÆRV&Æ–2æ'W6–æW75ö6&G2Væ&ÆR&÷rÆWfVÂ6V7W&—G“° ¦G&÷öÆ–7’–bW†—7G2'W6–æW75ö6&G5ö÷væW%öÆÂöâV&Æ–2æ'W6–æW75ö6&G3°¦7&VFRöÆ–7’'W6–æW75ö6&G5ö÷væW%öÆÂöâV&Æ–2æ'W6–æW75ö6&G0¢f÷"ÆÂW6–ær†÷væW%ö–BÒWF‚çV–B‚’’v—F‚6†V6²†÷væW%ö–BÒWF‚çV–B‚’“° ¦w&çB6VÆV7BÂ–ç6W'BÂWFFRÂFVÆWFRöâV&Æ–2æ'W6–æW75ö6&G2FòWF†VçF–6FVC° ¢ÒÒÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ¢ÒÒ÷7G2ò÷7EöÆ–¶W3¢KªNkXKÉ®8îY™i>8).Yø¾8(8(¾8+>89ş8:^88¾88n8*>89^8:>8;Î88¢ÒÒÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ¦7&VFRF&ÆR–bæ÷BW†—7G2V&Æ–2ç÷7G2€¢–BWV–B&–Ö'’¶W’FVfVÇBvVå÷&æFöÕ÷WV–B‚’À¢WF†÷%ö–BWV–Bæ÷BçVÆÂ&VfW&Væ6W2V&Æ–2ç&öf–ÆW2†–B’öâFVÆWFR666FRÀ¢6öçFVçBFW‡Bæ÷BçVÆÂÀ¢7&VFVEöBF–ÖW7F×G¢æ÷BçVÆÂFVfVÇBæ÷r‚¢“° ¦7&VFR–æFW‚–bæ÷BW†—7G2÷7G5ö7&VFVEö–G‚öâV&Æ–2ç÷7G2†7&VFVEöBFW62“° ¦ÇFW"F&ÆRV&Æ–2ç÷7G2Væ&ÆR&÷rÆWfVÂ6V7W&—G“° ¦G&÷öÆ–7’–bW†—7G2÷7G5÷6VÆV7EöWF†VçF–6FVBöâV&Æ–2ç÷7G3°¦7&VFRöÆ–7’÷7G5÷6VÆV7EöWF†VçF–6FVBöâV&Æ–2ç÷7G0¢f÷"6VÆV7BFòWF†VçF–6FVBW6–ær‡G'VR“° ¦G&÷öÆ–7’–bW†—7G2÷7G5ö–ç6W'Eö÷vâöâV&Æ–2ç÷7G3°¦7&VFRöÆ–7’÷7G5ö–ç6W'Eö÷vâöâV&Æ–2ç÷7G0¢f÷"–ç6W'BFòWF†VçF–6FVBv—F‚6†V6²†WF†÷%ö–BÒWF‚çV–B‚’“° ¦G&÷öÆ–7’–bW†—7G2÷7G5öFVÆWFUö÷våö÷%öFÖ–âöâV&Æ–2ç÷7G3¶7&VFRöÆ–7’÷7G5öFVÆWFUö÷våö÷%öFÖ–âöâV&Æ–2ç÷7G0¢f÷"FVÆWFRW6–ær†WF†÷%ö–BÒWF‚çV–B‚’÷"V&Æ–2æ—5öFÖ–â‚’“° ¦w&çB6VÆV7BÂ–ç6W'BÂFVÆWFRöâV&Æ–2ç÷7G2FòWF†VçF–6FVC° ¦7&VFRF&ÆR–bæ÷BW†—7G2V&Æ–2ç÷7EöÆ–¶W2€¢÷7Eö–BWV–Bæ÷BçVÆÂ&VfW&Væ6W2V&Æ–2ç÷7G2†–B’öâFVÆWFR666FRÀ¢'F–6—çEö–BWV–Bæ÷BçVÆÂ&VfW&Væ6W2V&Æ–2ç&öf–ÆW2†–B’öâFVÆWFR666FRÀ¢7&VFVEöBF–ÖW7F×G¢æ÷BçVÆÂFVfVÇBæ÷r‚’À¢&–Ö'’¶W’‡÷7Eö–BÂ'F–6—çEö–B¢“° ¦ÇFW"F&ÆRV&Æ–2ç÷7EöÆ–¶W2Væ&ÆR&÷rÆWfVÂ6V7W&—G“° ¦G&÷öÆ–7’–bW†—7G2÷7EöÆ–¶W5÷6VÆV7EöWF†VçF–6FVBöâV&Æ–2ç÷7EöÆ–¶W3°¦7&VFRöÆ–7’÷7EöÆ–¶W5÷6VÆV7EöWF†VçF–6FVBöâV&Æ–2ç÷7EöÆ–¶W0¢f÷"6VÆV7BFòWF†VçF–6FVBW6–ær‡G'VR“° ¦G&÷öÆ–7’–bW†—7G2÷7EöÆ–¶W5ö–ç6W'Eö÷vâöâV&Æ–2ç÷7EöÆ–¶W3°¦7&VFRöÆ–7’÷7EöÆ–¶W5ö–ç6W'Eö÷vâöâV&Æ–2ç÷7EöÆ–¶W0¢f÷"–ç6W'BFòWF†VçF–6FVBv—F‚6†V6²‡'F–6—çEö–BÒWF‚çV–B‚’“° ¦G&÷öÆ–7’–bW†—7G2÷7EöÆ–¶W5öFVÆWFUö÷vâöâV&Æ–2ç÷7EöÆ–¶W3°¦7&VFRöÆ–7’÷7EöÆ–¶W5öFVÆWFUö÷vâöâV&Æ–2ç÷7EöÆ–¶W0¢f÷"FVÆWFRW6–ær‡'F–6—çEö–BÒWF‚çV–B‚’“° ¦w&çB6VÆV7BÂ–ç6W'BÂFVÆWFRöâV&Æ–2ç÷7EöÆ–¶W2FòWF†VçF–6FVC° ¢ÒÒvWEöfVVE÷÷7G3¢89^8*>8;Î8+hGRKˆŠjr‰~ˆ^h8^Z8;¾8N8N8Şi[8;¾ˆz®Xˆn8N8N8Şkˆ8ş8²¦7&VFR÷"