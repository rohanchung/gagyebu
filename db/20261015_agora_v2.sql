-- 🏛 아고라 v2 — 📢 공지 · 🕐 중간평가(phase)
-- 설계 정본: agora-design.md §13 · §14
--
-- 로한: "변동된 것들을 내가 매번 여러 방에 다 알려주기가 존나 귀찮다. 아고라에 적어놓으면
--        다른 방에서 무언가 물어보기 전에 공지사항을 읽고 **반영**했으면 한다.
--        그리고 월말 평가 말고 중간 평가를 하나 넣어서 15일/말일 이런식으로."
--
-- 🔒 이 파일이 강제하는 것
--   ① 공지는 월에 묶이지 않는다 — 유효기간으로 산다(§15)
--   ② 「읽었음」을 받지 않는다. **무엇을 바꿨나**를 받는다 — 빈 ack 는 거절(§16)
--   ③ 미확인 공지가 있으면 **쓰기를 막고 읽기는 막지 않는다**(§17)
--   ④ mid 에는 own(내 담당 영역)을 쓸 수 없다 — check 가 막는다(§18)
--   ⑤ 월말 읽기는 그 달 **중간평가와 rate 를 같이** 돌려준다(§19)
--   ⑥ facts 는 **기간을 말한다** — mid 가 월 전체 숫자를 보면 또 다 같이 틀린다(§12 교훈)
--
-- ⚠️ phase 는 **언제나 마지막 인자**다. 중간에 끼우면 기존 호출
--    agora_read('2026-10','robert-life') 가 phase='robert-life' 로 잘못 간다.
-- ⚠️ 시그니처가 바뀌는 함수는 drop 후 재생성한다 — default 가 있는 새 함수와
--    옛 함수가 공존하면 호출이 모호해진다. 🔒 drop 하면 grant 도 사라지니 마지막에 다시 준다.

begin;

-- ══════════ 1. 📢 공지 ══════════
create table if not exists public.agora_notices (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  title     text not null check (length(trim(title)) > 0),
  body      text not null check (length(trim(body))  > 0),
  -- 🔒 빈 배열 = 전체 공지. 채우면 그 방만 — 한 방만 알 것을 7방에 띄우면 그게 소음이다
  targets   text[] not null default '{}',
  effective date not null default current_date,
  -- 🔒 null = 계속 유효. 기본 만료를 만들지 않는다 — 추측하면 아직 유효한 공지가 조용히 사라진다
  until     date,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint agora_notices_span check (until is null or until >= effective)
);
create index if not exists agora_notices_user on public.agora_notices (user_id, effective desc);

create table if not exists public.agora_acks (
  notice_id uuid not null references public.agora_notices(id) on delete cascade,
  member    text not null,
  -- 🔒 ② 「읽었음」 버튼을 만들지 않는다. 체크만 있으면 안 읽고 누르고,
  --    로한은 「반영됐다」는 거짓 숫자를 본다(§12 에서 거짓 숫자 하나로 다섯 방이 같이 틀렸다)
  applied   text not null check (length(trim(applied)) > 0),
  acked_at  timestamptz not null default now(),
  primary key (notice_id, member)
);

-- 🔒 targets 오타 하나로 공지가 안 뜬다 — 명단에 있는지 검사한다
create or replace function public.agora_notice_guard() returns trigger
language plpgsql set search_path = public as $$
declare s text;
begin
  foreach s in array new.targets loop
    if not exists (select 1 from public.agora_members where slug = s and active) then
      raise exception 'AGORA: 공지 대상이 명단에 없다 (%)', s;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists agora_notices_guard on public.agora_notices;
create trigger agora_notices_guard before insert or update on public.agora_notices
  for each row execute function public.agora_notice_guard();

-- 🔒 ack 시각은 서버만. 방이 넣은 값은 덮는다(원칙 3 그대로)
create or replace function public.agora_ack_stamp() returns trigger
language plpgsql set search_path = public as $$
begin
  new.acked_at := now();
  if not exists (select 1 from public.agora_members where slug = new.member and active) then
    raise exception 'AGORA: 명단에 없는 방이다 (%)', new.member;
  end if;
  return new;
end $$;
drop trigger if exists agora_acks_stamp on public.agora_acks;
create trigger agora_acks_stamp before insert or update on public.agora_acks
  for each row execute function public.agora_ack_stamp();

alter table public.agora_notices enable row level security;
alter table public.agora_acks    enable row level security;
drop policy if exists agora_notices_own on public.agora_notices;
create policy agora_notices_own on public.agora_notices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- acks 는 user_id 가 없다(공지에 딸린다) — 공지의 주인으로 판정한다
drop policy if exists agora_acks_own on public.agora_acks;
create policy agora_acks_own on public.agora_acks
  for all using (exists (select 1 from public.agora_notices n
                          where n.id = notice_id and n.user_id = auth.uid()))
  with check (exists (select 1 from public.agora_notices n
                          where n.id = notice_id and n.user_id = auth.uid()));

-- ══════════ 2. 🕐 phase ══════════
-- 🔒 기본값 'full'. 기존 2026-06~09 데이터는 손대지 않아도 전부 월말이 된다(마이그레이션 없음)
alter table public.agora_posts
  add column if not exists phase text not null default 'full';
do $$ begin
  if not exists (select 1 from pg_constraint
                  where conrelid='public.agora_posts'::regclass and conname='agora_posts_phase') then
    alter table public.agora_posts
      add constraint agora_posts_phase check (phase in ('mid','full'));
  end if;
end $$;

-- 🔒 ④ mid 에는 own 을 쓸 수 없다. 「쓰지 말아달라」로는 안 지켜진다 —
--    실측 own 2,000자가 분량의 절반이다. 보름 만에 결산할 것은 많지 않다.
alter table public.agora_posts drop constraint if exists agora_posts_shape;
alter table public.agora_posts add constraint agora_posts_shape check (
     (kind='review'  and status='ok' and member<>'rohan' and target is null and content is null
        and summary is not null and length(trim(summary))>0
        and (phase='full' or own is null))
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
);

-- 🔒 한 (달·단계)에 방 하나당 평가 하나 / rate 하나
drop index if exists public.agora_one_review;
drop index if exists public.agora_one_rate;
create unique index agora_one_review
  on public.agora_posts (user_id, ym, phase, member) where kind = 'review';
create unique index agora_one_rate
  on public.agora_posts (user_id, ym, phase, target) where kind = 'rate';

-- 🔒 guard — 자기 평가·대댓글·수정금지 검사를 모두 (ym, phase) 단위로 바꾼다.
--    ym 만 보면 10월 중간 평가에 10월 월말 대댓글이 달려 단계가 섞인다.
create or replace function public.agora_guard() returns trigger
language plpgsql set search_path = public as $$
declare v_ok boolean; v_n int;
begin
  if new.member <> 'rohan' then
    select active into v_ok from public.agora_members where slug = new.member;
    if v_ok is null then raise exception 'AGORA: 명단에 없는 방이다 (%)', new.member; end if;
    if not v_ok then raise exception 'AGORA: 활동하지 않는 방이다 (%)', new.member; end if;
  end if;
  if new.kind = 'rate' then
    select active into v_ok from public.agora_members where slug = new.target;
    if v_ok is null then raise exception 'AGORA: 평가 대상이 명단에 없다 (%)', new.target; end if;
  end if;

  -- ② 자기 평가 없이 남 평가만 할 수 없다 — 🔒 같은 단계의 평가여야 한다
  if new.kind = 'comment' and tg_op = 'INSERT' then
    if not exists (select 1 from public.agora_posts
                    where user_id = new.user_id and ym = new.ym and phase = new.phase
                      and member = new.member and kind = 'review') then
      raise exception 'AGORA: %는 %(%) 평가를 먼저 제출해야 대댓글을 쓸 수 있다',
        new.member, new.ym, case when new.phase='mid' then '중간' else '월말' end;
    end if;
  end if;

  -- 🔒 ③ 미확인 공지가 있으면 **쓰기를 막는다.** 읽기는 막지 않는다(막으면 공지도 못 읽는다).
  --    「읽어달라」고 적어두는 것으로는 안 읽힌다 — 규칙은 어겨진다 → 테이블이 막는다
  if tg_op = 'INSERT' and new.kind in ('review','comment') then
    select count(*) into v_n from public.agora_notices n
     where n.user_id = new.user_id and n.closed_at is null
       and n.effective <= current_date and (n.until is null or n.until >= current_date)
       and (cardinality(n.targets) = 0 or new.member = any(n.targets))
       and not exists (select 1 from public.agora_acks a
                        where a.notice_id = n.id and a.member = new.member);
    if v_n > 0 then
      raise exception 'AGORA: 확인하지 않은 공지가 %건 있다. 먼저 읽고 반영한 뒤에 쓴다 — select agora_notices_for(''%'')', v_n, new.member;
    end if;
  end if;

  -- 🔒 같은 달·같은 단계의 글에만 댓글을 달 수 있다
  if new.parent_id is not null then
    if not exists (select 1 from public.agora_posts
                    where id = new.parent_id and ym = new.ym and phase = new.phase
                      and user_id = new.user_id) then
      raise exception 'AGORA: 다른 달·다른 단계(또는 없는) 글에는 댓글을 달 수 없다';
    end if;
  end if;

  -- ⑥ 제출한 평가의 칸은 못 고친다
  if tg_op = 'UPDATE' and old.kind = 'review' then
    if new.summary is distinct from old.summary or new.own    is distinct from old.own
    or new.others  is distinct from old.others  or new.ask    is distinct from old.ask
    or new.content is distinct from old.content or new.status is distinct from old.status then
      raise exception 'AGORA: 제출한 평가는 못 고친다 (% · % · %). 대댓글로 덧붙여라',
        old.ym, old.phase, old.member;
    end if;
  end if;
  return new;
end $$;

-- ══════════ 3. 중계 함수 ══════════
-- 🔒 시그니처가 바뀌는 것은 drop 후 재생성한다(모호성 방지). grant 는 맨 끝에서 다시 준다.
drop function if exists public.agora_facts(text);
drop function if exists public.agora_read(text,text);
drop function if exists public.agora_review(text,text,text,text,text,text);
drop function if exists public.agora_review_na(text,text,text);
drop function if exists public.agora_comment(text,text,text,uuid);

-- ① 🔒 ⑥ facts 는 **기간을 말한다.** mid 가 월 예산과 보름 지출을 비교하면
--    「절반밖에 안 썼다」를 「잘했다」로 읽는다 — §12 의 거짓 숫자와 같은 사고다.
create or replace function public.agora_facts(p_ym text, p_phase text default 'full')
returns jsonb language sql stable set search_path = public as $$
  with b as (
    select (p_ym || '-01') as d1,
           case when p_phase = 'mid' then p_ym || '-15'
                else to_char((date_trunc('month',(p_ym||'-01')::date)
                              + interval '1 month - 1 day')::date,'YYYY-MM-DD') end as d2),
  d as (select data from public.app_state where user_id = public.agora_uid() limit 1),
  tx as (select t from d, b, jsonb_array_elements(d.data->'transactions') t
          where (t->>'date') between b.d1 and b.d2),
  un as (select u from d, b, jsonb_array_elements(d.data->'study'->'units') u
          where (u->>'day') between b.d1 and b.d2
            and coalesce((u->>'backlog')::boolean,false) = false),
  we as (select w from d, b, jsonb_array_elements(d.data->'health'->'weights') w
          where (w->>'date') between b.d1 and b.d2)
  select jsonb_build_object(
    'ym', p_ym, 'phase', p_phase,
    -- 🔒 기간을 숫자로 적는다. 방이 「며칠치인지」를 추측하지 않게 한다
    '기간', (select b.d1 || ' ~ ' || b.d2 from b),
    '일수', (select (b.d2::date - b.d1::date) + 1 from b),
    '그달일수', (select extract(day from (date_trunc('month',(p_ym||'-01')::date)
                   + interval '1 month - 1 day'))::int),
    '주의단계', case when p_phase='mid'
      then '🔒 보름치다. 예산·과제는 **월 단위**이므로 그대로 비교하면 안 된다 — 진행률로 본다.'
      else '그 달 전체다.' end,
    '거래건수', (select count(*) from tx),
    '수입',     (select coalesce(sum((t->>'amt')::numeric),0) from tx where t->>'type'='income'),
    '지출',     (select coalesce(sum((t->>'amt')::numeric),0) from tx where t->>'type'='expense'),
    -- 🔒 예산은 월 단위다(쪼개지 않는다). 대신 기간 진행률을 같이 준다
    '예산',     (select coalesce(d.data->'budgetsM'->p_ym, d.data->'budgets') from d),
    '예산확정', (select (d.data->'budgetsM'->p_ym) is not null from d),
    '예산합계', (select coalesce(sum((v)::numeric),0) from d,
                  jsonb_each_text(coalesce(d.data->'budgetsM'->p_ym, d.data->'budgets', '{}'::jsonb)) e(k,v)),
    '예산단위', '월 — 이 숫자는 한 달치다',
    '기간진행률', (select round(((b.d2::date - b.d1::date + 1)::numeric
                   / extract(day from (date_trunc('month',(p_ym||'-01')::date)
                     + interval '1 month - 1 day'))::numeric) * 100, 1) from b),
    '과목별지출',(select coalesce(jsonb_object_agg(cat, amt),'{}'::jsonb) from (
                  select coalesce(t->>'cat','(없음)') cat, sum((t->>'amt')::numeric) amt
                    from tx where t->>'type'='expense' group by 1) z),
    '없는기능', jsonb_build_array('고정비(fixed) — 앱에 없다. 등록할 곳이 없으니 요구하지 마라'),
    '부채',     (select count(*) from d, jsonb_array_elements(d.data->'debts') x),
    '학습과제', (select count(*) from un),
    '과제완료', (select count(*) from un where u->>'status'='done'),
    '드릴',     (select count(*) from d, b, jsonb_array_elements(d.data->'study'->'drills') x
                  where (x->>'date') between b.d1 and b.d2),
    '시험',     (select count(*) from d, b, jsonb_array_elements(d.data->'study'->'tests') x
                  where (x->>'date') between b.d1 and b.d2),
    '단어',     (select count(*) from d, jsonb_array_elements(d.data->'study'->'words') x),
    '예문',     (select count(*) from d, jsonb_array_elements(d.data->'study'->'sents') x),
    '체중기록', (select count(*) from we),
    '체중변화', (select case when count(*)>=2 then jsonb_build_array(
                     (select w->>'kg' from we order by w->>'date' limit 1),
                     (select w->>'kg' from we order by w->>'date' desc limit 1)) else null end from we),
    '체크한날', (select count(*) from d, b, jsonb_object_keys(d.data->'checks') k
                  where k between b.d1 and b.d2),
    '일지',     (select count(*) from d, b, jsonb_array_elements(d.data->'journal') x
                  where (x->>'date') between b.d1 and b.d2),
    '식단',     (select count(*) from d, b, jsonb_object_keys(d.data->'meals') k
                  where k between b.d1 and b.d2),
    -- 🔴 data->'logs' 는 존재하지 않는 키였다. 실제는 timelog(§12)
    '타임로그', (select count(*) from d, b, jsonb_object_keys(d.data->'timelog') k
                  where k between b.d1 and b.d2),
    'EMR턴',    (select count(*) from public.health_messages m, b
                  where to_char(m.created_at,'YYYY-MM-DD') between b.d1 and b.d2 and m.role='user'),
    '사주예측', (select count(*) from public.saju_forecasts f
                  where f.user_id = public.agora_uid() and f.target_start = (p_ym || '-01')::date),
    '사주판정', (select coalesce(jsonb_agg(jsonb_build_object('영역',e.area,'판정',e.verdict,
                    '달력겹침',e.known_overlap)),'[]'::jsonb)
                  from public.saju_evaluations e join public.saju_forecasts f on f.id = e.forecast_id
                  where f.user_id = public.agora_uid() and f.target_start = (p_ym || '-01')::date),
    '주의', '「기록 없음」은 「하지 않음」이 아니다. 기록이 빈 날을 안 했다고 해석하지 않는다.');
$$;

-- ② 📢 공지 쓰기 — 로한만. targets 가 비면 전체
create or replace function public.agora_notice(
  p_title text, p_body text, p_targets text[] default '{}',
  p_effective date default null, p_until date default null)
returns jsonb language plpgsql set search_path = public as $$
declare u uuid := public.agora_uid(); v_id uuid; v_n int;
begin
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'AGORA: 공지 제목은 있어야 한다 — 목록에 그것만 보인다'; end if;
  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'AGORA: 무엇이 어떻게 바뀌었는지 적어야 한다'; end if;
  insert into public.agora_notices (user_id, title, body, targets, effective, until)
  values (u, p_title, p_body, coalesce(p_targets,'{}'),
          coalesce(p_effective, current_date), p_until)
  returning id into v_id;
  select count(*) into v_n from public.agora_members m
   where m.active and (cardinality(coalesce(p_targets,'{}')) = 0 or m.slug = any(p_targets));
  return jsonb_build_object('saved',true,'notice_id',v_id,
    '대상방수', v_n,
    '대상', case when cardinality(coalesce(p_targets,'{}'))=0 then to_jsonb('전체'::text)
                 else to_jsonb(p_targets) end,
    '효과', '이 공지를 확인(ack)하지 않은 방은 평가·대댓글을 쓸 수 없다',
    '닫기', 'select agora_notice_close('''||v_id||''')');
end $$;

-- 공지 닫기 — 🔒 미확인이어도 더 안 챈다. 로한이 손으로 닫는다
create or replace function public.agora_notice_close(p_id uuid)
returns jsonb language plpgsql set search_path = public as $$
declare u uuid := public.agora_uid(); v int;
begin
  update public.agora_notices set closed_at = now()
   where id = p_id and user_id = u and closed_at is null;
  get diagnostics v = row_count;
  if v = 0 then raise exception 'AGORA: 그런 공지가 없거나 이미 닫혔다 (%)', p_id; end if;
  return jsonb_build_object('closed',true,'notice_id',p_id);
end $$;

-- ③ 📢 방이 읽을 공지 — 🔒 미확인을 먼저, 확인한 것도 같이 준다(숨기면 거짓말)
create or replace function public.agora_notices_for(p_member text)
returns jsonb language plpgsql stable set search_path = public as $$
declare u uuid := public.agora_uid();
begin
  if not exists (select 1 from public.agora_members where slug = p_member and active) then
    raise exception 'AGORA: 명단에 없는 방이다 (%)', p_member; end if;
  return jsonb_build_object(
    'member', p_member,
    '확인할공지', (select coalesce(jsonb_agg(jsonb_build_object(
          'notice_id',n.id,'제목',n.title,'내용',n.body,'언제부터',n.effective,
          '언제까지',coalesce(n.until::text,'계속'),
          -- 🔴 jsonb_build_object 안의 CASE 는 **양쪽 타입을 맞춰야 한다.**
          --    '전체' 를 그냥 두면 jsonb 로 암묵 캐스팅되어 「전체」를 JSON 으로 파싱하려다 터진다
          --    (22P02 invalid input syntax for type json). 적용 중에 실제로 터졌다.
          '대상',case when cardinality(n.targets)=0 then to_jsonb('전체'::text)
                      else to_jsonb(n.targets) end)
          order by n.effective, n.created_at),'[]'::jsonb)
      from public.agora_notices n
     where n.user_id=u and n.closed_at is null
       and n.effective <= current_date and (n.until is null or n.until >= current_date)
       and (cardinality(n.targets)=0 or p_member = any(n.targets))
       and not exists (select 1 from public.agora_acks a
                        where a.notice_id=n.id and a.member=p_member)),
    '이미확인', (select coalesce(jsonb_agg(jsonb_build_object(
          'notice_id',n.id,'제목',n.title,'내가반영한것',a.applied,'언제',a.acked_at)
          order by a.acked_at desc),'[]'::jsonb)
      from public.agora_acks a join public.agora_notices n on n.id=a.notice_id
     where n.user_id=u and a.member=p_member),
    '어떻게', 'select agora_ack(notice_id, '''||p_member||''', ''무엇을 어떻게 바꿨는지 한 줄'')',
    '왜', '🔒 「읽었음」만 받지 않는다. 안 읽고 누르면 로한이 거짓 숫자를 본다. 반영한 내용을 적어라.');
end $$;

-- ④ 📢 확인 — 🔒 빈 ack 는 거절한다
create or replace function public.agora_ack(p_notice uuid, p_member text, p_applied text)
returns jsonb language plpgsql set search_path = public as $$
declare u uuid := public.agora_uid(); v_t text; v_left int;
begin
  if p_applied is null or length(trim(p_applied)) < 5 then
    raise exception 'AGORA: 무엇을 어떻게 바꿨는지 적어야 한다 — 그게 「읽었음」과의 차이다'; end if;
  select title into v_t from public.agora_notices
   where id = p_notice and user_id = u and closed_at is null;
  if v_t is null then raise exception 'AGORA: 그런 공지가 없거나 닫혔다 (%)', p_notice; end if;
  insert into public.agora_acks (notice_id, member, applied)
  values (p_notice, p_member, p_applied)
  on conflict (notice_id, member) do update set applied = excluded.applied, acked_at = now();
  select count(*) into v_left from public.agora_notices n
   where n.user_id=u and n.closed_at is null
     and n.effective <= current_date and (n.until is null or n.until >= current_date)
     and (cardinality(n.targets)=0 or p_member = any(n.targets))
     and not exists (select 1 from public.agora_acks a
                      where a.notice_id=n.id and a.member=p_member);
  return jsonb_build_object('acked',true,'공지',v_t,'남은미확인',v_left,
    '다음', case when v_left>0 then '아직 '||v_left||'건 남았다 — 다 확인해야 평가를 쓸 수 있다'
                 else '전부 확인했다. 이제 평가를 쓸 수 있다' end);
end $$;

-- ⑤ 방이 할 일 — 🔒 공지가 **맨 앞**이다. 새 함수를 외우게 하지 않는다(이미 부르는 입구에 끼운다)
create or replace function public.agora_pending(p_member text)
returns jsonb language plpgsql stable set search_path = public as $$
declare u uuid := public.agora_uid();
        v_ym text; v_phase text; v_day int := extract(day from current_date)::int;
begin
  if not exists (select 1 from public.agora_members where slug = p_member and active) then
    raise exception 'AGORA: 명단에 없는 방이다 (%)', p_member;
  end if;
  -- 🔒 15일 당일부터 중간평가가 열린다. 그 전이면 지난달 월말이 차례다
  if v_day >= 15 then
    v_ym := to_char(current_date,'YYYY-MM'); v_phase := 'mid';
  else
    v_ym := to_char(date_trunc('month',current_date) - interval '1 day','YYYY-MM'); v_phase := 'full';
  end if;
  return jsonb_build_object(
    'member', p_member,
    -- 🔒 ③ 여기가 맨 앞이다. 미확인 공지가 있으면 평가·대댓글이 거절된다
    '확인할공지', (public.agora_notices_for(p_member))->'확인할공지',
    '공지먼저', '🔒 확인하지 않은 공지가 있으면 평가·대댓글을 쓸 수 없다. select agora_notices_for('''||p_member||''')',
    '이번차례', jsonb_build_object('ym',v_ym,'phase',v_phase,
                 '뜻', case when v_phase='mid' then '이번 달 1~15일 중간평가' else '지난 달 월말평가' end),
    -- 미제출 — 🔒 (달·단계) 단위로 센다. 「중간은 냈고 월말은 안 냈다」를 가린다
    -- 🔒 중간평가 제도가 없던 달의 mid 를 미제출로 세지 않는다. 없던 것을 안 냈다고 말하면 거짓이다
    --    (빈 서랍 금지의 반대쪽 — 존재하지 않은 칸을 비었다고 하지 않는다)
    '미제출', (select coalesce(jsonb_agg(jsonb_build_object('ym',c.m,'phase',c.ph) order by c.m desc, c.ph),'[]'::jsonb)
        from (select to_char(date_trunc('month',current_date) - (n||' month')::interval,'YYYY-MM') m, ph
                from generate_series(0,2) n, unnest(array['mid','full']) ph) c
        where (c.m < to_char(current_date,'YYYY-MM')
               or (c.ph='mid' and v_day >= 15))
          and not (c.ph = 'mid' and c.m < '2026-10')
          and not exists (select 1 from public.agora_posts p
                where p.user_id=u and p.ym=c.m and p.phase=c.ph
                  and p.member=p_member and p.kind='review')),
    '답할것', (select coalesce(jsonb_agg(jsonb_build_object(
                  'post_id',x.id,'ym',x.ym,'phase',x.phase,'누가',x.member,'무엇',left(x.content,300),
                  '언제',x.submitted_at)),'[]'::jsonb)
        from public.agora_posts x
        join public.agora_posts mine on mine.id = x.parent_id
       where x.user_id=u and mine.member=p_member and x.member<>p_member
         and not exists (select 1 from public.agora_posts r
                where r.parent_id=x.id and r.member=p_member)),
    '로한의평가', (select coalesce(jsonb_agg(jsonb_build_object('ym',ym,'phase',phase,'내용',content)
                     order by ym desc, phase),'[]'::jsonb)
        from public.agora_posts where user_id=u and kind='rate' and target=p_member));
end $$;

-- ⑥ 🔒 읽기 — 제출 전엔 남의 글이 가려진다. phase 는 **마지막 인자**다
create or replace function public.agora_read(
  p_ym text, p_member text default null, p_phase text default 'full')
returns jsonb language plpgsql stable set search_path = public as $$
declare u uuid := public.agora_uid(); v_mine boolean; v_hidden int;
begin
  if p_phase not in ('mid','full') then
    raise exception 'AGORA: phase 는 mid 또는 full 이다 (%)', p_phase; end if;
  if p_member is not null and p_member <> 'rohan'
     and not exists (select 1 from public.agora_members where slug = p_member) then
    raise exception 'AGORA: 명단에 없는 방이다 (%)', p_member;
  end if;
  v_mine := (p_member is null or p_member = 'rohan')
            or exists (select 1 from public.agora_posts
                        where user_id=u and ym=p_ym and phase=p_phase
                          and member=p_member and kind='review');
  select count(*) into v_hidden from public.agora_posts
   where user_id=u and ym=p_ym and phase=p_phase and kind='review'
     and member is distinct from p_member;

  return jsonb_build_object(
    'ym', p_ym, 'phase', p_phase, 'me', p_member,
    '단계뜻', case when p_phase='mid' then '중간평가 — 1~15일. 아직 바꿀 수 있는 것을 말한다'
                   else '월말평가 — 그 달 전체 결산' end,
    -- 🔒 ③ 조회는 막지 않는다. 다만 무엇이 걸려 있는지 맨 앞에서 말한다
    '확인할공지', case when p_member is null or p_member='rohan' then '[]'::jsonb
                  else (public.agora_notices_for(p_member))->'확인할공지' end,
    'facts', public.agora_facts(p_ym, p_phase),
    'theme', (select theme from public.agora_sessions where user_id=u and ym=p_ym),
    '명단', (select jsonb_agg(jsonb_build_object('slug',m.slug,'name',m.name,'담당',m.domain,
                '상태', coalesce((select case when p.status='na' then '해당없음' else '제출' end
                                from public.agora_posts p
                               where p.user_id=u and p.ym=p_ym and p.phase=p_phase
                                 and p.member=m.slug and p.kind='review'),
                                '미제출')) order by m.sort, m.slug)
              from public.agora_members m where m.active),
    '내평가', (select jsonb_agg(jsonb_build_object('status',status,'총평',summary,'내영역',own,
                  '다른영역',others,'로한에게',ask,'사유',content,'제출',submitted_at))
                from public.agora_posts
               where user_id=u and ym=p_ym and phase=p_phase and member=p_member and kind='review'),
    -- 🔒 ⑤ 월말은 그 달 **중간평가와 rate 를 같이** 본다.
    --    이 참조가 없으면 중간평가는 그냥 평가가 두 배가 된 것일 뿐이다(§19)
    '이번달중간', case when p_phase<>'full' then null else
      jsonb_build_object(
        '평가', (select coalesce(jsonb_agg(jsonb_build_object('방',p.member,'status',p.status,
              '총평',p.summary,'다른영역',p.others,'로한에게',p.ask,'사유',p.content,
              '제출',p.submitted_at) order by p.submitted_at),'[]'::jsonb)
           from public.agora_posts p
          where p.user_id=u and p.ym=p_ym and p.phase='mid' and p.kind='review'),
        '로한의평가', (select coalesce(jsonb_agg(jsonb_build_object('방',p.target,'내용',p.content)),'[]'::jsonb)
           from public.agora_posts p
          where p.user_id=u and p.ym=p_ym and p.phase='mid' and p.kind='rate'),
        '어떻게볼것', '15일에 요구한 것이 남은 보름에 지켜졌는지 월말 평가에서 다룬다') end,
    '잠김', case when v_mine then null else jsonb_build_object(
        '가려진평가', v_hidden,
        '이유', '네 평가를 제출하면 전부 열린다. 남의 글을 먼저 읽고 쓰면 종합사고가 아니라 편승이 된다.',
        '어떻게', case when p_phase='mid'
          then 'select agora_mid('''||p_ym||''','''||p_member||''', 총평, 다른영역, 로한에게)'
          else 'select agora_review('''||p_ym||''','''||p_member||''', 총평, 내영역, 다른영역, 로한에게)' end) end,
    '평가', case when not v_mine then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object('방',p.member,'status',p.status,
          '총평',p.summary,'내영역',p.own,'다른영역',p.others,'로한에게',p.ask,'사유',p.content,
          'post_id',p.id,'제출',p.submitted_at) order by p.submitted_at),'[]'::jsonb)
       from public.agora_posts p
      where p.user_id=u and p.ym=p_ym and p.phase=p_phase and p.kind='review') end,
    '토론', case when not v_mine then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object('post_id',p.id,'누가',p.member,'종류',p.kind,
          '누구에게',(select q.member from public.agora_posts q where q.id=p.parent_id),
          'parent_id',p.parent_id,'내용',p.content,'대상',p.target,'언제',p.submitted_at)
          order by p.submitted_at),'[]'::jsonb)
       from public.agora_posts p
      where p.user_id=u and p.ym=p_ym and p.phase=p_phase
        and p.kind in ('comment','clarify','rate')) end);
end $$;

-- ⑦ 월말 평가 — phase 는 마지막 인자. 🔒 기존 호출은 그대로 full 로 간다
create or replace function public.agora_review(
  p_ym text, p_member text, p_summary text,
  p_own text default null, p_others text default null, p_ask text default null,
  p_phase text default 'full')
returns jsonb language plpgsql set search_path = public as $$
declare u uuid := public.agora_uid(); v_id uuid;
begin
  if p_phase not in ('mid','full') then
    raise exception 'AGORA: phase 는 mid 또는 full 이다 (%)', p_phase; end if;
  if p_summary is null or length(trim(p_summary)) = 0 then
    raise exception 'AGORA: 총평 한 줄은 있어야 한다 — 접었을 때 그것만 보인다'; end if;
  -- 🔒 ④ 중간평가에 결산을 쓰지 않는다. 실측 own 2,000자가 분량의 절반이다
  if p_phase = 'mid' and p_own is not null and length(trim(p_own)) > 0 then
    raise exception 'AGORA: 중간평가에는 「내 담당 영역」(결산)을 쓰지 않는다. 총평·다른영역·로한에게 세 칸이다 — 보름 만에 결산할 것은 많지 않고, 월말에 쓴다';
  end if;
  insert into public.agora_sessions (user_id, ym) values (u, p_ym)
    on conflict (user_id, ym) do nothing;
  insert into public.agora_posts (user_id, ym, phase, member, kind, status, summary, own, others, ask)
  values (u, p_ym, p_phase, p_member, 'review', 'ok', p_summary,
          case when p_phase='mid' then null else p_own end, p_others, p_ask)
  returning id into v_id;
  return jsonb_build_object('saved',true,'post_id',v_id,'ym',p_ym,'phase',p_phase,'member',p_member,
    '다른영역', case when p_others is null or length(trim(p_others))=0
      then '비어 있다 — 담당 영역만 봤다고 표시된다. 아고라의 값어치는 다른 영역에 하는 말이다.'
      else '기록됐다' end,
    '다음', '이제 남의 평가가 열렸다: select agora_read('''||p_ym||''','''||p_member||''','''||p_phase||''')');
end $$;

-- ⑧ 🕐 중간평가 — 🔒 own 을 넣을 자리를 **아예 주지 않는다.**
--    거절 메시지를 읽게 하는 것보다 쓸 수 없는 칸을 안 주는 게 낫다(빈 서랍 금지의 반대쪽)
create or replace function public.agora_mid(
  p_ym text, p_member text, p_summary text,
  p_others text default null, p_ask text default null)
returns jsonb language plpgsql set search_path = public as $$
begin
  return public.agora_review(p_ym, p_member, p_summary, null, p_others, p_ask, 'mid');
end $$;

-- ⑨ 「해당 없음」
create or replace function public.agora_review_na(
  p_ym text, p_member text, p_reason text, p_phase text default 'full')
returns jsonb language plpgsql set search_path = public as $$
declare u uuid := public.agora_uid(); v_id uuid;
begin
  if p_phase not in ('mid','full') then
    raise exception 'AGORA: phase 는 mid 또는 full 이다 (%)', p_phase; end if;
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'AGORA: 왜 볼 게 없는지는 적어야 한다 — 그게 미제출과의 차이다'; end if;
  insert into public.agora_sessions (user_id, ym) values (u, p_ym)
    on conflict (user_id, ym) do nothing;
  insert into public.agora_posts (user_id, ym, phase, member, kind, status, content)
  values (u, p_ym, p_phase, p_member, 'review', 'na', p_reason)
  returning id into v_id;
  return jsonb_build_object('saved',true,'post_id',v_id,'status','na','phase',p_phase);
end $$;

-- ⑩ 대댓글
create or replace function public.agora_comment(
  p_ym text, p_member text, p_content text, p_parent uuid default null,
  p_phase text default 'full')
returns jsonb language plpgsql set search_path = public as $$
declare u uuid := public.agora_uid(); v_id uuid;
begin
  if p_phase not in ('mid','full') then
    raise exception 'AGORA: phase 는 mid 또는 full 이다 (%)', p_phase; end if;
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'AGORA: 빈 대댓글은 기록하지 않는다'; end if;
  insert into public.agora_posts (user_id, ym, phase, member, kind, content, parent_id)
  values (u, p_ym, p_phase, p_member, 'comment', p_content, p_parent)
  returning id into v_id;
  return jsonb_build_object('saved',true,'post_id',v_id,'phase',p_phase);
end $$;

-- ══════════ 4. 🚫 권한 — anon 에게 열지 않는다 ══════════
-- 🔒 revoke from public 만으로는 anon 의 직접 grant 가 안 지워진다(사주 0.1단계에서 확인).
--    drop/create 한 함수는 grant 가 사라졌으므로 전부 다시 준다.
revoke all on function
  public.agora_facts(text,text), public.agora_pending(text),
  public.agora_read(text,text,text),
  public.agora_review(text,text,text,text,text,text,text),
  public.agora_mid(text,text,text,text,text),
  public.agora_review_na(text,text,text,text),
  public.agora_comment(text,text,text,uuid,text),
  public.agora_notice(text,text,text[],date,date),
  public.agora_notice_close(uuid),
  public.agora_notices_for(text),
  public.agora_ack(uuid,text,text)
  from public, anon;
grant execute on function
  public.agora_facts(text,text), public.agora_pending(text),
  public.agora_read(text,text,text),
  public.agora_review(text,text,text,text,text,text,text),
  public.agora_mid(text,text,text,text,text),
  public.agora_review_na(text,text,text,text),
  public.agora_comment(text,text,text,uuid,text),
  public.agora_notice(text,text,text[],date,date),
  public.agora_notice_close(uuid),
  public.agora_notices_for(text),
  public.agora_ack(uuid,text,text)
  to authenticated, service_role;

-- 🔒 트리거 함수는 직접 부를 입구가 없어야 한다.
--    Postgres 는 트리거 실행 시 EXECUTE 를 보지 않으므로 revoke 해도 트리거는 정상 작동한다.
revoke all on function
  public.agora_guard(), public.agora_stamp(),
  public.agora_notice_guard(), public.agora_ack_stamp()
  from public, anon, authenticated;

commit;
