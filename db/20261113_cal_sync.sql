-- 📅 v5.01 구글 캘린더 연동(daily-view-spec D2 · daily-design.md §5-2)
-- 🔒 주소는 여기 넣지 않는다(Edge Function 비밀값 CAL_ICS_<KEY>) · 쓰기는 Edge Function(service role)만
-- 🔒 학사 캘린더 제목에는 학생 이름이 있다 — 다른 방(actors)에 읽기를 주지 않는다 · events 이력 트리거를 걸지 않는다
create table if not exists public.cal_sources(
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]{1,16}$'),
  name text not null,
  color text,
  show boolean not null default true,
  ord int not null default 0,
  last_sync_at timestamptz,
  last_status text,
  primary key (user_id, key)
);
create table if not exists public.cal_events(
  user_id uuid not null,
  src text not null,
  uid text not null,
  inst text not null default '',
  title text not null default '',
  cat text,
  all_day boolean not null default false,
  d0 date not null,
  d1 date not null,
  t0 timestamptz,
  t1 timestamptz,
  loc text,
  note text,
  updated_at timestamptz not null default now(),
  gone_at timestamptz,
  primary key (user_id, src, uid, inst),
  foreign key (user_id, src) references public.cal_sources(user_id, key) on delete cascade
);
create index if not exists cal_events_range on public.cal_events(user_id, d0, d1);
alter table public.cal_sources enable row level security;
alter table public.cal_events enable row level security;
drop policy if exists cal_sources_own on public.cal_sources;
create policy cal_sources_own on public.cal_sources for select to authenticated using (user_id = auth.uid());
drop policy if exists cal_events_own on public.cal_events;
create policy cal_events_own on public.cal_events for select to authenticated using (user_id = auth.uid());
revoke all on public.cal_sources, public.cal_events from anon, public;
revoke insert, update, delete on public.cal_sources, public.cal_events from authenticated;
grant select on public.cal_sources, public.cal_events to authenticated;
-- 앱의 켜고 끄기는 기기에 기억한다(rb_ui) — show 는 기본값만
insert into public.cal_sources(user_id, key, name, color, ord) values
  ('1f3a300f-9189-47c0-b750-cca6efc9dd1f', 'me', '내 일정', '#3f6fd8', 0),
  ('1f3a300f-9189-47c0-b750-cca6efc9dd1f', 'ac', '채움 학사', '#d8a13f', 1),
  ('1f3a300f-9189-47c0-b750-cca6efc9dd1f', 'hd', '휴일', '#d64545', 2)
on conflict (user_id, key) do nothing;
-- 30분마다(pg_cron + pg_net) — 공개 anon 키로 부른다(함수는 verify_jwt 를 켰고, 쓰기는 함수 안의 service role)
-- pg_net 은 extensions 스키마에(보안 점검 extension_in_public) · 함수는 net.* 에 있다
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
-- 공개 anon 키(앱에 이미 실려 있는 값)로 부른다. 함수가 verify_jwt 를 하고, 쓰기는 함수 안의 service role 이 한다
select cron.schedule('cal-sync-30m','*/30 * * * *', $cron$select net.http_post(
  url:='https://ytkbrdgbklnijbwkvino.supabase.co/functions/v1/cal-sync',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer <anon 키 — index.html SUPA_KEY>'),
  body:='{}'::jsonb, timeout_milliseconds:=60000)$cron$);
