-- 🔮 사주 v2 — 예측과 검증 (0단계: DB + 잠금)
-- 설계 정본: saju-design.md
--
-- 🔒 이 시스템의 전부는 **"그 예측이 사건 전에 쓰였는가"** 하나다. 그게 뚫리면 나머지는 장식이다.
--    그래서 앱이나 방의 선의에 기대지 않고 **테이블이 막는다.**
--    전례: v4.11 에서 재활의학과 방이 emr_reply 를 안 쓰고 테이블에 직접 insert 했다.
--
-- 이 파일이 강제하는 것 5가지
--   ① created_at / locked_at / evaluated_at 은 **서버 시각만** — 방이 넣은 값은 무시하고 덮는다
--   ② timing(prior/mid/post) 은 DB 가 자동으로 찍는다 — 사람도 AI 도 판단하지 않는다
--   ③ LOCKED 된 예측의 본문은 못 고친다. 고치려면 새 version 행
--   ④ author 분리 — claude 는 forecasts 만, openai 는 evaluations 만
--   ⑤ 순서 강제 — 수연은 pre_summary(기록만 보고 쓴 요약) 없이는 판정할 수 없다
--
-- 🚫 saju_events 는 만들지 않는다. 거래·학습·건강은 이미 app_state 에 있다(파생은 저장하지 않는다).

-- ══════════ 1. 테이블 ══════════

create table if not exists public.saju_forecasts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  period_type   text not null check (period_type in ('daeun','year','month','day')),
  target_start  date not null,
  target_end    date not null,
  author        text not null default 'claude' check (author = 'claude'),
  model         text,
  version       int  not null default 1 check (version >= 1),
  content       text not null,
  structured    jsonb,          -- 영역별 예측 {"재물":"…","공부":"…"}
  basis         text,           -- 🆕 어떤 로한북 기록을 근거로 삼았나(종합 검토의 흔적)
  conflict      text,           -- 🆕 담당 방(생활·학습) 판단과 어긋나는 지점
  status        text not null default 'draft' check (status in ('draft','published','locked')),
  timing        text            check (timing in ('prior','mid','post')),   -- 🔒 DB 가 찍는다
  created_at    timestamptz not null default now(),
  published_at  timestamptz,
  locked_at     timestamptz,
  constraint saju_forecasts_period check (target_end >= target_start)
);

-- 🔒 같은 기간의 같은 버전은 하나뿐. 수정은 UPDATE 가 아니라 새 version 행이다.
create unique index if not exists saju_forecasts_ver
  on public.saju_forecasts (user_id, period_type, target_start, version);
create index if not exists saju_forecasts_period_idx
  on public.saju_forecasts (user_id, period_type, target_start desc);

create table if not exists public.saju_evaluations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  forecast_id   uuid not null references public.saju_forecasts(id) on delete cascade,
  author        text not null default 'openai' check (author = 'openai'),
  model         text,
  -- 🔒 §2 순서 강제 — 예측을 **열기 전에** 기록만 보고 쓴 요약. 이게 없으면 판정을 못 넣는다.
  --    둘 다 같은 데이터를 보니, 순서를 안 지키면 검수자가 동조자가 된다.
  pre_summary   text,
  area          text not null,
  verdict       text not null check (verdict in ('hit','partial','miss','indeterminate')),
  evidence      text,
  reasoning     text,
  hindsight_risk text check (hindsight_risk in ('low','mid','high')),
  evaluated_at  timestamptz not null default now()
);
create unique index if not exists saju_eval_one
  on public.saju_evaluations (forecast_id, area);
create index if not exists saju_eval_fc on public.saju_evaluations (forecast_id);

-- 로한 전용 — 로한북 어디에도 없는 사건 + 「개입」 기록(§4)
create table if not exists public.saju_notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  note_date     date not null,
  kind          text not null default 'event' check (kind in ('event','intervention')),
  -- 🔒 개입은 **로한만** 기록한다. 무엇을 보고 움직였는지는 본인만 안다.
  intervention  text check (intervention in ('none','acted','unaware')),
  forecast_id   uuid references public.saju_forecasts(id) on delete set null,
  body          text not null,
  created_at    timestamptz not null default now()
);
create index if not exists saju_notes_date on public.saju_notes (user_id, note_date desc);

-- ══════════ 2. 🔒 시각·timing 강제 ══════════
-- ⚠️ 이게 근간이다. 방이 created_at='2026-09-28' 을 넣을 수 있으면
--    로버트가 10월 10일에 쓰고 9월 28일에 썼다고 할 수 있다. 그 순간 검증은 자기확인이 된다.

create or replace function public.saju_stamp() returns trigger
language plpgsql set search_path = public as $$
declare v_now timestamptz := now();
begin
  if tg_op = 'INSERT' then
    new.created_at := v_now;                      -- 들어온 값 무시
    if new.status = 'locked' then new.locked_at := v_now; else new.locked_at := null; end if;
    if new.status in ('published','locked') then new.published_at := coalesce(new.published_at, v_now); end if;
  else
    new.created_at := old.created_at;             -- 🔒 작성시각은 영원히 안 바뀐다
    if old.status = 'locked' then
      new.locked_at := old.locked_at;             -- 🔒 되감기 금지
    elsif new.status = 'locked' then
      new.locked_at := v_now;                     -- 지금 잠근다
    else
      new.locked_at := null;
    end if;
    if new.status in ('published','locked') then new.published_at := coalesce(old.published_at, v_now); end if;
  end if;

  -- 🔒 timing 은 DB 가 찍는다. 잠그기 전엔 비워 둔다(아직 확정이 아니다).
  if new.locked_at is null then
    new.timing := null;
  elsif new.locked_at::date < new.target_start then
    new.timing := 'prior';                        -- 온전한 사전예측
  elsif new.locked_at::date <= new.target_end then
    new.timing := 'mid';                          -- 기간 중. 부분 사후
  else
    new.timing := 'post';                         -- 기간 후. 예측이 아니다
  end if;
  return new;
end $$;

drop trigger if exists saju_forecasts_stamp on public.saju_forecasts;
create trigger saju_forecasts_stamp before insert or update on public.saju_forecasts
  for each row execute function public.saju_stamp();

create or replace function public.saju_eval_stamp() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then new.evaluated_at := now();
  else new.evaluated_at := old.evaluated_at; end if;
  return new;
end $$;
drop trigger if exists saju_eval_stamp_t on public.saju_evaluations;
create trigger saju_eval_stamp_t before insert or update on public.saju_evaluations
  for each row execute function public.saju_eval_stamp();

-- ══════════ 3. 🔒 LOCK · 순서 ══════════

create or replace function public.saju_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  -- ③ 잠긴 예측의 본문은 못 고친다. 고치려면 새 version 행이다.
  if old.status = 'locked' then
    if new.content is distinct from old.content
       or new.structured is distinct from old.structured
       or new.target_start is distinct from old.target_start
       or new.target_end is distinct from old.target_end
       or new.period_type is distinct from old.period_type then
      raise exception 'SAJU: 잠긴 예측은 못 고친다 (%, v%). 새 version 행을 만들어라',
        old.target_start, old.version;
    end if;
    if new.status <> 'locked' then
      raise exception 'SAJU: 잠금은 풀 수 없다 (%, v%)', old.target_start, old.version;
    end if;
  end if;
  -- 되돌아가는 상태 전이 금지
  if old.status = 'published' and new.status = 'draft' then
    raise exception 'SAJU: published → draft 로 되돌릴 수 없다';
  end if;
  return new;
end $$;
drop trigger if exists saju_forecasts_guard on public.saju_forecasts;
create trigger saju_forecasts_guard before update on public.saju_forecasts
  for each row execute function public.saju_guard();

-- ⑤ 순서 강제 — pre_summary 없이는 판정을 못 넣는다.
--    그리고 잠기지 않았거나 기간이 안 끝난 예측은 평가 대상이 아니다.
create or replace function public.saju_eval_guard() returns trigger
language plpgsql set search_path = public as $$
declare f record;
begin
  select * into f from public.saju_forecasts where id = new.forecast_id;
  if f.id is null then raise exception 'SAJU: 없는 예측이다'; end if;
  if f.status <> 'locked' then
    raise exception 'SAJU: 잠기지 않은 예측은 평가할 수 없다 (%, v%)', f.target_start, f.version;
  end if;
  if f.target_end >= current_date then
    raise exception 'SAJU: 기간(~%)이 아직 안 끝났다. 끝난 뒤에 평가한다', f.target_end;
  end if;
  if f.timing = 'post' then
    raise exception 'SAJU: timing=post 는 예측이 아니다. 평가 대상이 아니다';
  end if;
  if new.pre_summary is null or length(trim(new.pre_summary)) = 0 then
    raise exception 'SAJU: 먼저 기록만 보고 쓴 요약(pre_summary)이 있어야 한다 — 순서를 지켜라';
  end if;
  if new.user_id is distinct from f.user_id then
    raise exception 'SAJU: 예측과 평가의 주인이 다르다';
  end if;
  return new;
end $$;
drop trigger if exists saju_eval_guard_t on public.saju_evaluations;
create trigger saju_eval_guard_t before insert or update on public.saju_evaluations
  for each row execute function public.saju_eval_guard();

-- ══════════ 4. RLS ══════════
alter table public.saju_forecasts  enable row level security;
alter table public.saju_evaluations enable row level security;
alter table public.saju_notes      enable row level security;
drop policy if exists own_saju_forecasts on public.saju_forecasts;
create policy own_saju_forecasts on public.saju_forecasts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists own_saju_evaluations on public.saju_evaluations;
create policy own_saju_evaluations on public.saju_evaluations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists own_saju_notes on public.saju_notes;
create policy own_saju_notes on public.saju_notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ══════════ 5. 중계 함수 ══════════
-- 🔒 편의가 아니라 **권한·순서 강제**가 목적이다. 방은 테이블을 직접 만지지 않는다.

-- 🔴 [결함·중대 · 2026-10-01 수정] 처음엔 auth.users 를 그냥 읽었다.
--    authenticated 롤에는 그 권한이 없어 **브라우저에서 부르면 늘 실패**한다(42501).
--    방(MCP)은 수퍼유저라 돌아갔고 드라이런도 수퍼유저로 돌려 못 봤다 — 같은 결함이 아고라에서도 터졌다.
create or replace function public.saju_uid() returns uuid
language plpgsql stable set search_path = public as $$
declare u uuid := auth.uid();
begin
  if u is not null then return u; end if;   -- 앱(로그인 세션)
  select id into u from auth.users order by created_at limit 1;  -- 방(MCP, 세션 없음)
  return u;
end $$;

-- 로버트: 아직 예측을 안 쓴 기간
create or replace function public.saju_pending(p_period text default 'month', p_ahead int default 3)
returns table(period_type text, target_start date, target_end date)
language sql stable set search_path = public as $$
  with cal as (
    select (date_trunc('month', current_date) + (n || ' month')::interval)::date as s
    from generate_series(0, greatest(p_ahead,1)-1) n
    where p_period = 'month'
    union all
    select make_date(extract(year from current_date)::int + n, 1, 1)
    from generate_series(0, greatest(p_ahead,1)-1) n
    where p_period = 'year'
  )
  select p_period,
         cal.s,
         case when p_period = 'month'
              then (date_trunc('month', cal.s) + interval '1 month - 1 day')::date
              else make_date(extract(year from cal.s)::int, 12, 31) end
  from cal
  where not exists (
    select 1 from public.saju_forecasts f
    where f.user_id = public.saju_uid() and f.period_type = p_period
      and f.target_start = cal.s and f.status = 'locked')
  order by 2;
$$;

-- 🔄 로버트: 예측을 쓰기 **전에** 과거 평가·되먹임을 읽는다(§5)
create or replace function public.saju_context(p_limit int default 12)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'target_start' desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'target_start', f.target_start, 'period_type', f.period_type,
      'version', f.version, 'timing', f.timing,
      'content', left(f.content, 400),
      'verdicts', (select jsonb_agg(jsonb_build_object(
                     'area', e.area, 'verdict', e.verdict,
                     'reasoning', left(e.reasoning,300), 'hindsight_risk', e.hindsight_risk))
                   from public.saju_evaluations e where e.forecast_id = f.id),
      'intervention', (select jsonb_agg(jsonb_build_object('when', n.note_date, 'what', n.body, 'kind', n.intervention))
                       from public.saju_notes n where n.forecast_id = f.id and n.kind = 'intervention')
    ) as x
    from public.saju_forecasts f
    where f.user_id = public.saju_uid() and f.status = 'locked'
    order by f.target_start desc limit greatest(p_limit,1)
  ) t;
$$;

-- 로버트: 예측 작성 + 잠금. 🔒 시각은 서버가 찍는다.
create or replace function public.saju_publish(
  p_period text, p_start date, p_end date, p_content text,
  p_structured jsonb default null, p_basis text default null,
  p_conflict text default null, p_model text default null, p_lock boolean default true)
returns jsonb language plpgsql set search_path = public as $$
declare v_uid uuid := public.saju_uid(); v_ver int; v_id uuid;
begin
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'SAJU: 빈 예측은 기록하지 않는다'; end if;
  select coalesce(max(version),0)+1 into v_ver from public.saju_forecasts
    where user_id = v_uid and period_type = p_period and target_start = p_start;
  insert into public.saju_forecasts
    (user_id, period_type, target_start, target_end, model, version,
     content, structured, basis, conflict, status)
  values (v_uid, p_period, p_start, p_end, p_model, v_ver,
     p_content, p_structured, p_basis, p_conflict,
     case when p_lock then 'locked' else 'published' end)
  returning id into v_id;
  return (select jsonb_build_object('id',id,'version',version,'timing',timing,
            'locked_at',locked_at,'status',status)
          from public.saju_forecasts where id = v_id);
end $$;

-- 수연: 기간이 끝났는데 평가가 없는 예측
create or replace function public.saju_due()
returns table(id uuid, period_type text, target_start date, target_end date, version int, timing text)
language sql stable set search_path = public as $$
  select f.id, f.period_type, f.target_start, f.target_end, f.version, f.timing
  from public.saju_forecasts f
  where f.user_id = public.saju_uid() and f.status = 'locked'
    and f.target_end < current_date and f.timing <> 'post'
    and not exists (select 1 from public.saju_evaluations e where e.forecast_id = f.id)
  order by f.target_start;
$$;

-- 🔒 수연 1단계: 예측을 **열기 전에** 기록만 보고 쓴 요약을 저장한다(§2 순서 강제)
create or replace function public.saju_presummary(p_forecast uuid, p_summary text)
returns jsonb language plpgsql set search_path = public as $$
declare v_uid uuid := public.saju_uid();
begin
  if p_summary is null or length(trim(p_summary)) < 20 then
    raise exception 'SAJU: 기간 요약이 너무 짧다 — 기록을 먼저 읽어라'; end if;
  if exists (select 1 from public.saju_evaluations where forecast_id = p_forecast) then
    raise exception 'SAJU: 이미 평가가 있다. 요약은 판정 전에만 쓴다'; end if;
  insert into public.saju_notes (user_id, note_date, kind, forecast_id, body)
  values (v_uid, current_date, 'event', p_forecast, '[수연 사전요약] ' || p_summary);
  return jsonb_build_object('ok', true, 'forecast_id', p_forecast);
end $$;

-- 수연 3단계: 판정. pre_summary 는 트리거가 검사한다.
create or replace function public.saju_evaluate(
  p_forecast uuid, p_area text, p_verdict text, p_pre_summary text,
  p_evidence text default null, p_reasoning text default null,
  p_hindsight text default null, p_model text default null)
returns jsonb language plpgsql set search_path = public as $$
declare v_uid uuid := public.saju_uid(); v_id uuid;
begin
  insert into public.saju_evaluations
    (user_id, forecast_id, model, pre_summary, area, verdict, evidence, reasoning, hindsight_risk)
  values (v_uid, p_forecast, p_model, p_pre_summary, p_area, p_verdict,
          p_evidence, p_reasoning, p_hindsight)
  on conflict (forecast_id, area) do update
    set verdict = excluded.verdict, evidence = excluded.evidence,
        reasoning = excluded.reasoning, hindsight_risk = excluded.hindsight_risk
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

revoke all on function
  public.saju_uid(), public.saju_pending(text,int), public.saju_context(int),
  public.saju_publish(text,date,date,text,jsonb,text,text,text,boolean),
  public.saju_due(), public.saju_presummary(uuid,text),
  public.saju_evaluate(uuid,text,text,text,text,text,text,text) from public;
grant execute on function
  public.saju_pending(text,int), public.saju_context(int),
  public.saju_publish(text,date,date,text,jsonb,text,text,text,boolean),
  public.saju_due(), public.saju_presummary(uuid,text),
  public.saju_evaluate(uuid,text,text,text,text,text,text,text) to authenticated;
