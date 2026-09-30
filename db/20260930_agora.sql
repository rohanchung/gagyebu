-- 🏛 아고라 0단계 — 월간 합의체 테이블·함수
-- 설계 정본: agora-design.md
--
-- 🔒 이 파일이 강제하는 것 7가지 (agora-design.md §11)
--   ① 제출 전엔 남의 평가·토론이 **안 보인다** — agora_read 가 가린다
--   ② 자기 평가 없이 남 평가만 할 수 없다 — comment 는 자기 review 가 있어야 들어간다
--   ③ submitted_at 은 **서버 시각만** — 나중에 쓰고 먼저 썼다고 할 수 없다
--   ④ 미제출과 「해당 없음」을 가른다 — status='na' 는 명시적 제출이다
--   ⑤ clarify·rate 는 로한만 / review·comment 는 방만 — 서로 이름을 빌릴 수 없다
--   ⑥ 잠긴 review 의 4칸은 못 고친다 — 고치려면 comment 로 덧붙인다
--   ⑦ 방은 테이블을 직접 만지지 않는다 — 중계 함수만 (전례: v4.11 재활의학과 직접 insert 사고)
--
-- 🚫 사실 묶음 테이블을 만들지 않는다. agora_facts(ym) 로 매번 계산한다(파생은 저장하지 않는다).

-- ══════════ 1. 명단 ══════════
-- 🔒 명단이 없으면 「누가 안 썼는지」를 말할 수 없다(빈 서랍 금지).
--    공용 한 벌이다 — health_settings 와 같은 모양으로 둔다(로한 1인 앱).
create table if not exists public.agora_members (
  slug     text primary key,
  name     text not null check (length(trim(name)) > 0),
  provider text not null check (provider in ('claude','openai')),
  domain   text not null default '',
  icon     text not null default '🏛',
  -- 🔒 빠진 방은 지우지 않는다 — 지우면 과거 달의 이름이 깨진다
  active   boolean not null default true,
  sort     int not null default 100
);

-- ══════════ 2. 세션 — 월 1개 ══════════
create table if not exists public.agora_sessions (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  ym        text not null check (ym ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  theme     text,                    -- 로한이 이번 달에 특별히 묻고 싶은 것
  status    text not null default 'open' check (status in ('open','discussing','closed')),
  opened_at timestamptz not null default now(),
  unique (user_id, ym)
);

-- ══════════ 3. 글 ══════════
create table if not exists public.agora_posts (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  ym        text not null check (ym ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  -- agora_members.slug 또는 'rohan'. FK 로 못 걸어서 트리거가 검사한다
  member    text not null,
  kind      text not null check (kind in ('review','comment','clarify','rate')),
  -- 🔒 ④ na = 「이번 달은 볼 게 없다」를 **말한 것**이다. 미제출과 다르다
  status    text not null default 'ok' check (status in ('ok','na')),
  parent_id uuid references public.agora_posts(id) on delete set null,
  -- review 4칸 (§3)
  summary   text,     -- 총평 한 줄 — 접었을 때 제목줄에 뜬다
  own       text,     -- 내 담당 영역
  others    text,     -- 🔒 다른 영역에 하는 말 — 아고라의 값어치가 여기 모인다
  ask       text,     -- 로한에게 요구하는 것
  content   text,     -- comment · clarify · rate · na 사유
  target    text,     -- rate 가 평가하는 방
  submitted_at timestamptz not null default now(),   -- 🔒 ③ 서버만
  created_at   timestamptz not null default now(),
  -- 🔒 ⑤ 종류마다 채우는 칸이 정해져 있다. 빈 서랍도, 엉뚱한 칸도 막는다
  constraint agora_posts_shape check (
       (kind='review'  and status='ok' and member<>'rohan' and target is null and content is null
          and summary is not null and length(trim(summary))>0)
    or (kind='review'  and status='na' and member<>'rohan' and target is null
          and summary is null and own is null and others is null and ask is null
          and content is not null and length(trim(content))>0)
    or (kind='comment' and status='ok' and member<>'rohan' and target is null
          and summary is null and own is null and others is null and ask is null
          and content is not null and length(trim(content))>0)
    or (kind='clarify' and status='ok' and member='rohan'  and target is null
          and summary is null and own is null and others is null and ask is null
          and content is not null and length(trim(content))>0)
    or (kind='rate'    and status='ok' and member='rohan'
          and summary is null and own is null and others is null and ask is null
          and target is not null and length(trim(target))>0
          and content is not null and length(trim(content))>0)
  )
);
-- 🔒 한 달에 방 하나당 평가는 하나 (na 도 제출이다)
create unique index if not exists agora_one_review
  on public.agora_posts (user_id, ym, member) where kind = 'review';
create index if not exists agora_posts_ym on public.agora_posts (user_id, ym, submitted_at);
create index if not exists agora_posts_parent on public.agora_posts (parent_id);
-- 🔒 한 달에 방 하나당 rate 는 하나 — 로한이 고치면 덮는다(upsert)
create unique index if not exists agora_one_rate
  on public.agora_posts (user_id, ym, target) where kind = 'rate';

-- ══════════ 4. 🔒 시각 강제 ══════════
create or replace function public.agora_stamp() returns trigger
language plpgsql set search_path = public as $$
declare v_now timestamptz := now();
begin
  if tg_op = 'INSERT' then
    new.submitted_at := v_now; new.created_at := v_now;    -- 들어온 값 무시
  else
    new.submitted_at := old.submitted_at;                  -- 🔒 영원히 안 바뀐다
    new.created_at   := old.created_at;
    new.kind         := old.kind;                          -- 종류를 바꿔치기할 수 없다
    new.member       := old.member;
    new.ym           := old.ym;
  end if;
  return new;
end $$;
drop trigger if exists agora_posts_stamp on public.agora_posts;
create trigger agora_posts_stamp before insert or update on public.agora_posts
  for each row execute function public.agora_stamp();

-- ══════════ 5. 🔒 순서·권한 ══════════
create or replace function public.agora_guard() returns trigger
language plpgsql set search_path = public as $$
declare v_ok boolean;
begin
  -- ⑤ 명단에 없는 이름으로 쓸 수 없다
  if new.member <> 'rohan' then
    select active into v_ok from public.agora_members where slug = new.member;
    if v_ok is null then raise exception 'AGORA: 명단에 없는 방이다 (%)', new.member; end if;
    if not v_ok then raise exception 'AGORA: 활동하지 않는 방이다 (%)', new.member; end if;
  end if;
  if new.kind = 'rate' then
    select active into v_ok from public.agora_members where slug = new.target;
    if v_ok is null then raise exception 'AGORA: 평가 대상이 명단에 없다 (%)', new.target; end if;
  end if;

  -- ② 🔒 자기 평가 없이 남 평가만 할 수 없다.
  --    이걸 안 막으면 아고라는 「자기 평가는 안 내고 남 것만 뜯는 곳」이 된다.
  if new.kind = 'comment' and tg_op = 'INSERT' then
    if not exists (select 1 from public.agora_posts
                    where user_id = new.user_id and ym = new.ym
                      and member = new.member and kind = 'review') then
      raise exception 'AGORA: %(%)는 % 월간 평가를 먼저 제출해야 대댓글을 쓸 수 있다',
        new.member, '자기', new.ym;
    end if;
  end if;

  -- 🔒 다른 달의 글에 댓글을 달 수 없다 — 달이 섞이면 월간 평가가 아니다
  if new.parent_id is not null then
    if not exists (select 1 from public.agora_posts
                    where id = new.parent_id and ym = new.ym and user_id = new.user_id) then
      raise exception 'AGORA: 다른 달(또는 없는) 글에는 댓글을 달 수 없다';
    end if;
  end if;

  -- ⑥ 🔒 제출한 평가의 4칸은 못 고친다. 고치려면 comment 로 덧붙인다
  if tg_op = 'UPDATE' and old.kind = 'review' then
    if new.summary is distinct from old.summary or new.own    is distinct from old.own
    or new.others  is distinct from old.others  or new.ask    is distinct from old.ask
    or new.content is distinct from old.content or new.status is distinct from old.status then
      raise exception 'AGORA: 제출한 평가는 못 고친다 (% · %). 대댓글로 덧붙여라', old.ym, old.member;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists agora_posts_guard on public.agora_posts;
create trigger agora_posts_guard before insert or update on public.agora_posts
  for each row execute function public.agora_guard();

-- ══════════ 6. RLS ══════════
alter table public.agora_members  enable row level security;
alter table public.agora_sessions enable row level security;
alter table public.agora_posts    enable row level security;
drop policy if exists read_agora_members on public.agora_members;
create policy read_agora_members on public.agora_members for select to authenticated using (true);
drop policy if exists own_agora_sessions on public.agora_sessions;
create policy own_agora_sessions on public.agora_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists own_agora_posts on public.agora_posts;
create policy own_agora_posts on public.agora_posts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ══════════ 7. 중계 함수 ══════════
-- 방은 MCP 로 로그인 세션 없이 부르므로 auth.uid() 가 null 이다 — emr_problem_id 와 같은 처리.
create or replace function public.agora_uid() returns uuid
language sql stable set search_path = public as $$
  select coalesce(auth.uid(), (select id from auth.users order by created_at limit 1))
$$;

-- 📊 사실 묶음 — 🔒 **파생이다. 저장하지 않는다.** 방마다 다른 숫자를 들고 오면 토론이 아니다.
create or replace function public.agora_facts(p_ym text) returns jsonb
language sql stable set search_path = public as $$
  with d as (select data from public.app_state where user_id = public.agora_uid() limit 1),
  tx as (select t from d, jsonb_array_elements(d.data->'transactions') t
          where t->>'date' like p_ym || '%'),
  un as (select u from d, jsonb_array_elements(d.data->'study'->'units') u
          where u->>'day' like p_ym || '%' and coalesce((u->>'backlog')::boolean,false) = false),
  we as (select w from d, jsonb_array_elements(d.data->'health'->'weights') w
          where w->>'date' like p_ym || '%' order by w->>'date')
  select jsonb_build_object(
    'ym', p_ym,
    '거래건수', (select count(*) from tx),
    '수입',     (select coalesce(sum((t->>'amt')::numeric),0) from tx where t->>'type'='income'),
    '지출',     (select coalesce(sum((t->>'amt')::numeric),0) from tx where t->>'type'='expense'),
    '예산',     (select d.data->'budgets'->p_ym from d),
    '학습과제', (select count(*) from un),
    '과제완료', (select count(*) from un where u->>'status'='done'),
    '드릴',     (select count(*) from d, jsonb_array_elements(d.data->'study'->'drills') x
                  where x->>'date' like p_ym || '%'),
    '시험',     (select count(*) from d, jsonb_array_elements(d.data->'study'->'tests') x
                  where x->>'date' like p_ym || '%'),
    '체중기록', (select count(*) from we),
    '체중변화', (select case when count(*)>=2
                   then jsonb_build_array((min(w->>'date')), (max(w->>'date'))) else null end from we),
    '체크한날', (select count(*) from d, jsonb_object_keys(d.data->'checks') k where k like p_ym || '%'),
    '일지',     (select count(*) from d, jsonb_array_elements(d.data->'journal') x
                  where x->>'date' like p_ym || '%'),
    '로그',     (select count(*) from d, jsonb_array_elements(d.data->'logs') x
                  where x->>'date' like p_ym || '%'),
    'EMR턴',    (select count(*) from public.health_messages m
                  where to_char(m.created_at,'YYYY-MM') = p_ym and m.role='user'),
    -- 🔒 사주 판정은 **링크만.** 복사하지 않는다(파생은 저장하지 않는다 + 사주는 사주 것이다)
    '사주판정', (select coalesce(jsonb_agg(jsonb_build_object('영역',e.area,'판정',e.verdict,
                    '달력겹침',e.known_overlap)),'[]'::jsonb)
                  from public.saju_evaluations e join public.saju_forecasts f on f.id = e.forecast_id
                  where f.user_id = public.agora_uid() and f.target_start = (p_ym || '-01')::date),
    '주의', '「기록 없음」은 「하지 않음」이 아니다. 기록이 빈 날을 안 했다고 해석하지 않는다.');
$$;

-- ① 방이 할 일 — 미제출 / 내 글에 달린 말 / 나에 대한 rate
create or replace function public.agora_pending(p_member text)
returns jsonb language plpgsql stable set search_path = public as $$
declare u uuid := public.agora_uid(); v_ym text := to_char(current_date - interval '1 day','YYYY-MM');
begin
  if not exists (select 1 from public.agora_members where slug = p_member and active) then
    raise exception 'AGORA: 명단에 없는 방이다 (%)', p_member;
  end if;
  return jsonb_build_object(
    'member', p_member,
    -- 지난 달까지 평가가 없는 달 (최근 3개월)
    '미제출', (select coalesce(jsonb_agg(m order by m),'[]'::jsonb) from (
        select to_char(date_trunc('month',current_date) - (n||' month')::interval,'YYYY-MM') m
          from generate_series(1,3) n) c
        where not exists (select 1 from public.agora_posts p
                where p.user_id=u and p.ym=c.m and p.member=p_member and p.kind='review')),
    '이번차례', v_ym,
    -- 🔒 내 평가에 달린 대댓글·해명 중 내가 아직 답하지 않은 것
    '답할것', (select coalesce(jsonb_agg(jsonb_build_object(
                  'post_id',x.id,'ym',x.ym,'누가',x.member,'무엇',left(x.content,300),
                  '언제',x.submitted_at)),'[]'::jsonb)
        from public.agora_posts x
        join public.agora_posts mine on mine.id = x.parent_id
       where x.user_id=u and mine.member=p_member and x.member<>p_member
         and not exists (select 1 from public.agora_posts r
                where r.parent_id=x.id and r.member=p_member)),
    -- 🙋 로한이 내 조언을 어떻게 봤나 — 다음 평가를 쓰기 전에 읽는다(§5 되먹임)
    '로한의평가', (select coalesce(jsonb_agg(jsonb_build_object('ym',ym,'내용',content)
                     order by ym desc),'[]'::jsonb)
        from public.agora_posts where user_id=u and kind='rate' and target=p_member));
end $$;

-- ② 🔒 읽기 — **제출 전엔 남의 글이 가려진다**(§2). 가린 자리엔 왜 가려졌는지를 돌려준다.
create or replace function public.agora_read(p_ym text, p_member text default null)
returns jsonb language plpgsql stable set search_path = public as $$
declare u uuid := public.agora_uid(); v_mine boolean; v_hidden int;
begin
  if p_member is not null and p_member <> 'rohan'
     and not exists (select 1 from public.agora_members where slug = p_member) then
    raise exception 'AGORA: 명단에 없는 방이다 (%)', p_member;
  end if;
  -- 로한(p_member is null 또는 'rohan')은 전부 본다. 방은 자기 평가를 낸 뒤에 본다
  v_mine := (p_member is null or p_member = 'rohan')
            or exists (select 1 from public.agora_posts
                        where user_id=u and ym=p_ym and member=p_member and kind='review');
  select count(*) into v_hidden from public.agora_posts
   where user_id=u and ym=p_ym and kind='review' and member is distinct from p_member;

  return jsonb_build_object(
    'ym', p_ym, 'me', p_member,
    'facts', public.agora_facts(p_ym),
    'theme', (select theme from public.agora_sessions where user_id=u and ym=p_ym),
    '명단', (select jsonb_agg(jsonb_build_object('slug',m.slug,'name',m.name,'담당',m.domain,
                '상태', coalesce((select case when p.status='na' then '해당없음' else '제출' end
                                from public.agora_posts p
                               where p.user_id=u and p.ym=p_ym and p.member=m.slug and p.kind='review'),
                                '미제출')) order by m.sort, m.slug)
              from public.agora_members m where m.active),
    -- 🔒 내 평가는 언제나 보인다
    '내평가', (select jsonb_agg(jsonb_build_object('status',status,'총평',summary,'내영역',own,
                  '다른영역',others,'로한에게',ask,'사유',content,'제출',submitted_at))
                from public.agora_posts
               where user_id=u and ym=p_ym and member=p_member and kind='review'),
    '잠김', case when v_mine then null else jsonb_build_object(
        '가려진평가', v_hidden,
        '이유', '네 월간 평가를 제출하면 전부 열린다. 남의 글을 먼저 읽고 쓰면 종합사고가 아니라 편승이 된다.',
        '어떻게', 'select agora_review('''||p_ym||''','''||p_member||''', 총평, 내영역, 다른영역, 로한에게)') end,
    '평가', case when not v_mine then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object('방',p.member,'status',p.status,
          '총평',p.summary,'내영역',p.own,'다른영역',p.others,'로한에게',p.ask,'사유',p.content,
          'post_id',p.id,'제출',p.submitted_at) order by p.submitted_at),'[]'::jsonb)
       from public.agora_posts p where p.user_id=u and p.ym=p_ym and p.kind='review') end,
    '토론', case when not v_mine then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object('post_id',p.id,'누가',p.member,'종류',p.kind,
          '누구에게',(select q.member from public.agora_posts q where q.id=p.parent_id),
          'parent_id',p.parent_id,'내용',p.content,'대상',p.target,'언제',p.submitted_at)
          order by p.submitted_at),'[]'::jsonb)
       from public.agora_posts p
      where p.user_id=u and p.ym=p_ym and p.kind in ('comment','clarify','rate')) end);
end $$;

-- ③ 월간 평가 제출 = 잠금. 🔒 시각은 서버가 찍는다
create or replace function public.agora_review(
  p_ym text, p_member text, p_summary text,
  p_own text default null, p_others text default null, p_ask text default null)
returns jsonb language plpgsql set search_path = public as $$
declare u uuid := public.agora_uid(); v_id uuid;
begin
  if p_summary is null or length(trim(p_summary)) = 0 then
    raise exception 'AGORA: 총평 한 줄은 있어야 한다 — 접었을 때 그것만 보인다'; end if;
  insert into public.agora_sessions (user_id, ym) values (u, p_ym)
    on conflict (user_id, ym) do nothing;
  insert into public.agora_posts (user_id, ym, member, kind, status, summary, own, others, ask)
  values (u, p_ym, p_member, 'review', 'ok', p_summary, p_own, p_others, p_ask)
  returning id into v_id;
  return jsonb_build_object('saved',true,'post_id',v_id,'ym',p_ym,'member',p_member,
    '다른영역', case when p_others is null or length(trim(p_others))=0
      then '비어 있다 — 담당 영역만 봤다고 표시된다. 아고라의 값어치는 다른 영역에 하는 말이다.'
      else '기록됐다' end,
    '다음', '이제 남의 평가가 열렸다: select agora_read('''||p_ym||''','''||p_member||''')');
end $$;

-- ④ 🔒 「해당 없음」 — 미제출과 가른다. 빈 칸은 「방이 일을 안 했다」로 읽힌다
create or replace function public.agora_review_na(p_ym text, p_member text, p_reason text)
returns jsonb language plpgsql set search_path = public as $$
declare u uuid := public.agora_uid(); v_id uuid;
begin
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'AGORA: 왜 볼 게 없는지는 적어야 한다 — 그게 미제출과의 차이다'; end if;
  insert into public.agora_sessions (user_id, ym) values (u, p_ym)
    on conflict (user_id, ym) do nothing;
  insert into public.agora_posts (user_id, ym, member, kind, status, content)
  values (u, p_ym, p_member, 'review', 'na', p_reason)
  returning id into v_id;
  return jsonb_build_object('saved',true,'post_id',v_id,'status','na');
end $$;

-- ⑤ 대댓글 — 🔒 자기 평가가 있어야 들어간다(트리거가 막는다)
create or replace function public.agora_comment(
  p_ym text, p_member text, p_content text, p_parent uuid default null)
returns jsonb language plpgsql set search_path = public as $$
declare u uuid := public.agora_uid(); v_id uuid;
begin
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'AGORA: 빈 대댓글은 기록하지 않는다'; end if;
  insert into public.agora_posts (user_id, ym, member, kind, content, parent_id)
  values (u, p_ym, p_member, 'comment', p_content, p_parent)
  returning id into v_id;
  return jsonb_build_object('saved',true,'post_id',v_id);
end $$;

-- 🚫 anon 에게 열지 않는다. Supabase 는 default privileges 로 anon 에게 직접 부여하므로
--    revoke from public 만으로는 안 지워진다(0.1단계 사주에서 확인).
revoke all on function
  public.agora_uid(), public.agora_facts(text), public.agora_pending(text),
  public.agora_read(text,text), public.agora_review(text,text,text,text,text,text),
  public.agora_review_na(text,text,text), public.agora_comment(text,text,text,uuid)
  from public, anon;
grant execute on function
  public.agora_facts(text), public.agora_pending(text),
  public.agora_read(text,text), public.agora_review(text,text,text,text,text,text),
  public.agora_review_na(text,text,text), public.agora_comment(text,text,text,uuid)
  to authenticated, service_role;

-- ══════════ 8. 명단 (§4) ══════════
-- 🚫 심리&정신&점술방은 넣지 않는다 — 2026-09 실측 일지 1건·로그 0건.
--    심리·관계를 월간 평가할 대조 기록이 없다(사주에서 관계·사업을 「관찰」로 돌린 것과 같은 이유).
insert into public.agora_members (slug, name, provider, domain, icon, sort) values
  ('robert-life' ,'로버트(생활)'  ,'claude','재정·예산·생활','🏠',10),
  ('robert-study','로버트(학습)'  ,'claude','JLPT N4'       ,'📖',20),
  ('robert-saju' ,'로버트(사주)'  ,'claude','명리·예측'     ,'🕯️',30),
  ('suyeon'      ,'수연'          ,'openai','검수·종합'     ,'🔎',40),
  ('maker'       ,'제작방'        ,'claude','로한북 자체'   ,'🛠',50),
  ('cardio'      ,'순환기'        ,'claude','심부전 추적'   ,'❤️',60),
  ('rehab'       ,'재활의학과'    ,'claude','오십견'        ,'💪',70)
on conflict (slug) do nothing;
