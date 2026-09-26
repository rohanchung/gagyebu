-- 2026-09-26 · 아버지 당구 연습장(billiards) — 같은 프로젝트, 완전히 다른 방.
--
-- 계정 2개:
--   로한   1f3a300f-9189-47c0-b750-cca6efc9dd1f  → 로한북 테이블만
--   아버지 f1383a40-7161-4318-bf2d-e3ee82c24e67  → bb_* 테이블만 (app_metadata.app = 'billiards')
--
-- 🔒 app_metadata 는 사용자가 스스로 못 바꾼다(user_metadata 와 다르다). 그래서 표식은 여기에 둔다.
-- 🔒 로한북 테이블도 "자기 행이면 OK" → "로한 uid 만" 으로 좁힌다.
--    안 그러면 아버지가 로한북 주소로 로그인했을 때 빈 app_state 행이 새로 생긴다.

-- ① 아버지 표식
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"app":"billiards"}'::jsonb
 where id = 'f1383a40-7161-4318-bf2d-e3ee82c24e67';

-- ② 로한북 테이블: 로한만
drop policy if exists own_state on public.app_state;
create policy own_state on public.app_state for all to authenticated
  using      (user_id = auth.uid() and auth.uid() = '1f3a300f-9189-47c0-b750-cca6efc9dd1f'::uuid)
  with check (user_id = auth.uid() and auth.uid() = '1f3a300f-9189-47c0-b750-cca6efc9dd1f'::uuid);

drop policy if exists own_snap on public.app_state_snap;
create policy own_snap on public.app_state_snap for all to authenticated
  using      (user_id = auth.uid() and auth.uid() = '1f3a300f-9189-47c0-b750-cca6efc9dd1f'::uuid)
  with check (user_id = auth.uid() and auth.uid() = '1f3a300f-9189-47c0-b750-cca6efc9dd1f'::uuid);

drop policy if exists own_messages on public.health_messages;
create policy own_messages on public.health_messages for all to authenticated
  using      (user_id = auth.uid() and auth.uid() = '1f3a300f-9189-47c0-b750-cca6efc9dd1f'::uuid)
  with check (user_id = auth.uid() and auth.uid() = '1f3a300f-9189-47c0-b750-cca6efc9dd1f'::uuid);

drop policy if exists own_problems on public.health_problems;
create policy own_problems on public.health_problems for all to authenticated
  using      (user_id = auth.uid() and auth.uid() = '1f3a300f-9189-47c0-b750-cca6efc9dd1f'::uuid)
  with check (user_id = auth.uid() and auth.uid() = '1f3a300f-9189-47c0-b750-cca6efc9dd1f'::uuid);

-- ③ 당구 테이블
create or replace function public.bb_is_me(uid uuid) returns boolean
  language sql stable set search_path = '' as $$
  select uid = auth.uid() and coalesce(auth.jwt()->'app_metadata'->>'app','') = 'billiards'
$$;

create or replace function public.bb_touch() returns trigger
  language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

create table if not exists public.bb_boards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  balls      jsonb not null default '{}'::jsonb,   -- {w:{x,y}, y:{x,y}, r:{x,y}, cue:'w'|'y'} (다이아 단위 0~8 × 0~4)
  sort       int  not null default 0,
  deleted_at timestamptz,                          -- 휴지통(30일)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bb_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  board_id   uuid not null references public.bb_boards(id) on delete cascade,
  balls      jsonb not null default '{}'::jsonb,   -- 그 순간의 배치(판을 나중에 옮겨도 기록은 그대로)
  predict    jsonb not null default '[]'::jsonb,   -- 예측 경로 [{x,y}]
  actual     jsonb,                                -- 실제 경로 [{x,y}]
  tip        jsonb,                                -- 당점 {x,y} (-1~1)
  speed      smallint check (speed between 1 and 5),
  kmh        numeric(5,1),
  result     text check (result in ('hit','miss')),
  memo       text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bb_events (
  id       bigint generated always as identity primary key,
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  at       timestamptz not null default now(),
  kind     text not null,                           -- board.create / board.rename / attempt.save …
  board_id uuid,
  payload  jsonb
);

create index if not exists bb_boards_user   on public.bb_boards(user_id);
create index if not exists bb_attempts_board on public.bb_attempts(board_id, created_at desc);
create index if not exists bb_attempts_user  on public.bb_attempts(user_id, created_at desc);
create index if not exists bb_events_user    on public.bb_events(user_id, at desc);

drop trigger if exists bb_boards_touch on public.bb_boards;
create trigger bb_boards_touch before update on public.bb_boards for each row execute function public.bb_touch();
drop trigger if exists bb_attempts_touch on public.bb_attempts;
create trigger bb_attempts_touch before update on public.bb_attempts for each row execute function public.bb_touch();

alter table public.bb_boards   enable row level security;
alter table public.bb_attempts enable row level security;
alter table public.bb_events   enable row level security;

revoke all on public.bb_boards, public.bb_attempts, public.bb_events from anon;

create policy bb_own on public.bb_boards   for all to authenticated using (public.bb_is_me(user_id)) with check (public.bb_is_me(user_id));
create policy bb_own on public.bb_attempts for all to authenticated using (public.bb_is_me(user_id)) with check (public.bb_is_me(user_id));
-- 로그는 쓰고 읽기만. 고치거나 지우지 못한다.
create policy bb_read on public.bb_events for select to authenticated using (public.bb_is_me(user_id));
create policy bb_add  on public.bb_events for insert to authenticated with check (public.bb_is_me(user_id));

-- ④ 작업 중인 판(그어 둔 선·당점·속도)을 자동 저장하는 칸 — 기록하기 전에 창을 닫아도 남는다
alter table public.bb_boards add column if not exists draft jsonb not null default '{}'::jsonb;
