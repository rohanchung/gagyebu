-- 🩺 EMR 1단계 — 중계 모드 테이블·함수 (health-design.md §3·§4)
-- 적용: 로버트(클로드 코드, Supabase MCP) · 2026-09-18
-- 🔒 대화는 app_state 밖에 둔다 — 단일 JSON + 낙관적 잠금에 넣으면 AI 방이 쓸 때마다 앱과 충돌한다(v3.6).
-- 🔒 격리: provider P 가 볼 수 있는 것 = 질문 행 전부 + P 의 답 행. 이 조회는 emr_thread 하나뿐이다.

-- ── 설정(단일 행) — 두 AI 가 똑같이 받는 공통 운영원칙은 여기 한 벌만 둔다(방 지침에 복사하지 않는다) ──
create table if not exists public.health_settings (
  id int primary key default 1 check (id = 1),
  principles text not null,
  updated_at timestamptz not null default now()
);

-- ── 문제 목록 ──
create table if not exists public.health_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null check (length(trim(slug)) > 0),
  title text not null check (length(trim(title)) > 0),
  status text not null default 'active' check (status in ('active','watch','closed')),
  summary text not null default '',
  sources jsonb,                                   -- null 이면 기본 범위(§5.2)
  rooms jsonb not null default '{}'::jsonb,        -- {"claude":"순환기","openai":"수연"} — 화면 안내용
  source_handoff_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

-- ── 대화 ──
create table if not exists public.health_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_id uuid not null references public.health_problems(id) on delete cascade,
  turn_no int not null check (turn_no >= 1),
  role text not null check (role in ('user','assistant')),
  provider text check (provider in ('claude','openai')),
  content text not null default '',
  facts text,
  mode text check (mode in ('relay','mock','live')),
  room text,
  status text not null default 'ok' check (status in ('ok','error','refused','pending')),
  error text,
  model text, in_tokens int, out_tokens int, cache_read_tokens int, cost_krw numeric,   -- live(API) 전용
  created_at timestamptz not null default now(),
  -- 질문 행은 provider 가 없고(양쪽 공유) 사실 묶음을 갖는다. 답 행은 provider 가 있고 사실 묶음이 없다
  check ((role = 'user' and provider is null and mode is null) or (role = 'assistant' and provider is not null and facts is null))
);
create index if not exists health_messages_problem_turn on public.health_messages (problem_id, turn_no);
-- 한 턴에 질문은 하나
create unique index if not exists health_messages_one_question
  on public.health_messages (problem_id, turn_no) where role = 'user';
-- 한 턴에 AI 별 '답함'(ok·refused)은 하나. 「다시 받기」는 기존 답을 error 로 돌리므로 이력은 남는다
create unique index if not exists health_messages_one_answer
  on public.health_messages (problem_id, turn_no, provider) where role = 'assistant' and status in ('ok','refused');

-- ── updated_at ──
create or replace function public.emr_touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists health_problems_touch on public.health_problems;
create trigger health_problems_touch before update on public.health_problems for each row execute function public.emr_touch();
drop trigger if exists health_settings_touch on public.health_settings;
create trigger health_settings_touch before update on public.health_settings for each row execute function public.emr_touch();

-- ── RLS — 기존 app_state 와 같은 모양 ──
alter table public.health_settings enable row level security;
alter table public.health_problems enable row level security;
alter table public.health_messages enable row level security;
drop policy if exists read_settings on public.health_settings;
create policy read_settings on public.health_settings for select to authenticated using (true);
drop policy if exists own_problems on public.health_problems;
create policy own_problems on public.health_problems for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists own_messages on public.health_messages;
create policy own_messages on public.health_messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ══════ 중계 함수 셋 (§4) — AI 방은 이것만 부른다 ══════
-- AI 방은 MCP 로 로그인 세션 없이 부르므로 auth.uid() 가 null 이다. 그때는 slug 가 하나로 정해져야만 진행한다.
create or replace function public.emr_problem_id(p_slug text) returns uuid
language plpgsql stable set search_path = public as $$
declare ids uuid[];
begin
  select array_agg(id) into ids from health_problems
   where slug = p_slug and (auth.uid() is null or user_id = auth.uid());
  if ids is null then raise exception 'EMR: 문제 "%" 가 없다', p_slug; end if;
  if array_length(ids, 1) > 1 then raise exception 'EMR: 문제 "%" 가 여럿이다', p_slug; end if;
  return ids[1];
end $$;

create or replace function public.emr_check_provider(p_provider text) returns void
language plpgsql immutable set search_path = public as $$
begin
  if p_provider is null or p_provider not in ('claude','openai') then
    raise exception 'EMR: provider 는 claude 또는 openai 다 (받은 값: %)', p_provider;
  end if;
end $$;

-- ① 답할 게 있나 — 질문은 있는데 그 provider 가 아직 답하지(ok·refused) 않은 턴. 종료된 문제는 빠진다
create or replace function public.emr_pending(p_provider text)
returns table (slug text, title text, turn_no int, asked_at timestamptz, room text)
language plpgsql stable set search_path = public as $$
begin
  perform emr_check_provider(p_provider);
  return query
  select p.slug, p.title, q.turn_no, q.created_at, p.rooms ->> p_provider
    from health_messages q join health_problems p on p.id = q.problem_id
   where q.role = 'user' and p.status <> 'closed'
     and (auth.uid() is null or p.user_id = auth.uid())
     and not exists (select 1 from health_messages a
                      where a.problem_id = q.problem_id and a.turn_no = q.turn_no and a.role = 'assistant'
                        and a.provider = p_provider and a.status in ('ok','refused'))
   order by q.created_at;
end $$;

-- ② 내 몫만 읽기 — 🔒 상대 provider 의 행은 조회 조건에 없다. 상대 답을 담는 필드도 없다
create or replace function public.emr_thread(p_slug text, p_provider text) returns jsonb
language plpgsql stable set search_path = public as $$
declare pid uuid; pr health_problems%rowtype; turns jsonb;
begin
  perform emr_check_provider(p_provider);
  pid := emr_problem_id(p_slug);
  select * into pr from health_problems where id = pid;
  select coalesce(jsonb_agg(jsonb_build_object(
           'turn_no', q.turn_no, 'asked_at', q.created_at, 'question', q.content,
           'my_answer', a.content, 'my_status', a.status) order by q.turn_no), '[]'::jsonb)
    into turns
    from health_messages q
    left join lateral (select x.content, x.status from health_messages x
                        where x.problem_id = pid and x.turn_no = q.turn_no and x.role = 'assistant'
                          and x.provider = p_provider and x.status in ('ok','refused')
                        order by x.created_at desc limit 1) a on true
   where q.problem_id = pid and q.role = 'user';
  return jsonb_build_object(
    'problem', jsonb_build_object('slug', pr.slug, 'title', pr.title, 'status', pr.status),
    'principles', (select principles from health_settings where id = 1),
    -- 🔒 사실은 가장 최근 질문의 것 — 과거 턴의 사실은 그 턴 당시 것이라 오래됐다
    'facts', (select facts from health_messages where problem_id = pid and role = 'user' order by turn_no desc limit 1),
    'turns', turns,
    'to_answer', coalesce((select jsonb_agg(t -> 'turn_no') from jsonb_array_elements(turns) t
                            where t -> 'my_answer' = 'null'::jsonb), '[]'::jsonb));
end $$;

-- ③ 답 쓰기 — 질문 없는 턴·이미 답한 턴은 거부(덮어쓰기 없음. 고치려면 로한이 EMR 에서 「다시 받기」)
create or replace function public.emr_reply(p_slug text, p_turn_no int, p_provider text, p_content text,
                                            p_room text default null, p_status text default 'ok') returns jsonb
language plpgsql set search_path = public as $$
declare pid uuid; uid uuid;
begin
  perform emr_check_provider(p_provider);
  if p_status not in ('ok','refused') then raise exception 'EMR: status 는 ok 또는 refused 다'; end if;
  if p_content is null or length(trim(p_content)) = 0 then raise exception 'EMR: 빈 답은 기록하지 않는다'; end if;
  pid := emr_problem_id(p_slug);
  select user_id into uid from health_problems where id = pid;
  if not exists (select 1 from health_messages where problem_id = pid and turn_no = p_turn_no and role = 'user') then
    raise exception 'EMR: "%" 턴 % 에는 질문이 없다', p_slug, p_turn_no;
  end if;
  if exists (select 1 from health_messages where problem_id = pid and turn_no = p_turn_no and role = 'assistant'
              and provider = p_provider and status in ('ok','refused')) then
    raise exception 'EMR: "%" 턴 % 에 % 는 이미 답했다 — 고치려면 로한이 EMR 에서 다시 받기', p_slug, p_turn_no, p_provider;
  end if;
  insert into health_messages (user_id, problem_id, turn_no, role, provider, content, mode, room, status)
  values (uid, pid, p_turn_no, 'assistant', p_provider, p_content, 'relay', p_room, p_status);
  return jsonb_build_object('saved', true, 'slug', p_slug, 'turn_no', p_turn_no, 'provider', p_provider);
end $$;

-- 익명(anon)에게는 열지 않는다
revoke all on function public.emr_problem_id(text), public.emr_check_provider(text), public.emr_pending(text),
  public.emr_thread(text, text), public.emr_reply(text, int, text, text, text, text) from public, anon;
grant execute on function public.emr_problem_id(text), public.emr_check_provider(text), public.emr_pending(text),
  public.emr_thread(text, text), public.emr_reply(text, int, text, text, text, text) to authenticated, service_role;

-- ── 공통 운영원칙 (§6.1) ──
insert into public.health_settings (id, principles) values (1,
'이 글은 로한북 EMR 에서 온 것이다. 너는 로한의 건강 기록을 함께 읽는 상담 파트너다.
- 너는 의사가 아니다. 진단·처방을 하지 않는다. 기록 해석, 경과 정리, 진료 때 물을 질문 준비를 돕는다.
- [사실 묶음]은 로한북에서 뽑은 것이고 사실의 정본이다. 거기 없는 수치를 지어내지 않는다. 모르면 모른다고 한다.
- ''기록 없음''은 ''하지 않음''이 아니다. 기록이 빈 날을 금식·운동 안 함 등으로 해석하지 않는다.
- 응급 징후(흉통, 호흡곤란, 의식 변화 등)가 언급되면 다른 말보다 먼저 즉시 진료·119를 권한다.
- 같은 질문을 다른 AI 도 독립적으로 받는다. 너는 그 답을 볼 수 없고, 찾아서도 안 된다. 네 판단을 말하라.
- 한국어로, 짧고 구체적으로. 필요하면 "진료 때 물어볼 것"을 따로 정리한다.')
on conflict (id) do nothing;

-- ── 초기 이관 (1회성 · 2026-09-18 적용 완료) — handoffs 문제방 → health_problems (§8.1) ──
-- 방 이름은 handoffs.room 값을 그대로 쓴다(추측하지 않는다). summary = handoff 본문. 원본 handoffs 는 건드리지 않는다.
insert into health_problems (user_id, slug, title, status, summary, rooms, source_handoff_id)
select (select id from auth.users limit 1), v.slug, v.title, v.status, h.body,
       jsonb_build_object('claude', h.room, 'openai', '수연'), h.id
from (values (5,'순환기','순환기 — 박성미 교수 추적','active'),
             (4,'오십견','오른쪽 어깨 오십견 재활','active'),
             (6,'칼륨식단','칼륨 제한 식단','watch')) v(hid,slug,title,status)
join handoffs h on h.id = v.hid
on conflict (user_id, slug) do nothing;
