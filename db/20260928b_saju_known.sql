-- 🔮 사주 v2 — 0.1단계: 「이미 알고 있던 것」 분리 + legacy 경로
-- 설계 정본: saju-design.md §15
-- 선행: db/20260928_saju_v2.sql (적용 완료)
--
-- 수연(검수자)의 지적 2건을 반영한다. 둘 다 실제 데이터에서 확인했다.
--
-- ① 로버트의 예측문에 **이미 확정된 일정**이 섞여 있다.
--    확인: app_state.data.saju.readings['jw-plan:2026-09'] 안에
--          「9월 중요일정: 9/3 진료, 9/6 결혼, 9/19·9/30 설명회」 가 그대로 있다.
--          그리고 9/30 일진 예측문에 ★풍무점 2차 설명회 가 들어가 있다.
--    ⚠️ 이걸 안 가르면 「설명회가 실제로 열렸다」가 적중으로 세어진다.
--       그건 예측이 아니라 **달력을 읽은 것**이다. 검증 시스템 전체를 무의미하게 만든다.
--    → 세 가지를 분리한다: 이미 알던 것(known) / 명리로 예측한 것(content·structured) / 실제 일어난 것(파생)
--
-- ② 기존 readings 49건을 새 경로로 옮기면 전부 timing=post 가 되어 평가가 거부된다.
--    그렇다고 「사실은 8월에 썼다」를 그냥 믿고 prior 로 찍으면 **서버 보증이 무의미해진다**.
--    → 섞지 않고 **가른다**: legacy 는 declared_at(자기신고) 기준으로 timing 을 찍고
--       timing_trust='self' 로 낙인한다. 서버가 본 것은 'server'.
--       통계는 trust 별로 따로 센다(§10).
--
-- 🔒 원칙 그대로 — 방의 선의에 기대지 않고 테이블이 막는다.

-- ══════════ 1. 컬럼 ══════════

alter table public.saju_forecasts
  -- 🆕 예측 시점에 **이미 확정되어 있던** 미래 일정. 「없었다」도 명시해야 한다(빈 서랍 금지).
  add column if not exists known        text,
  -- 🆕 로한북 readings 에서 옮겨온 것 — 서버가 작성시각을 보지 못했다
  add column if not exists legacy       boolean not null default false,
  -- 🆕 legacy 가 스스로 신고한 작성일. 🔒 legacy 가 아니면 쓰지 않는다
  add column if not exists declared_at  date,
  -- 🆕 timing 을 누가 보증하나. 🔒 DB 가 찍는다
  add column if not exists timing_trust text;

alter table public.saju_forecasts drop constraint if exists saju_fc_trust;
alter table public.saju_forecasts add constraint saju_fc_trust
  check (timing_trust is null or timing_trust in ('server','self'));

-- 🔒 legacy 와 declared_at 은 한 몸이다. 하나만 있으면 거짓말이 된다.
alter table public.saju_forecasts drop constraint if exists saju_fc_legacy;
alter table public.saju_forecasts add constraint saju_fc_legacy
  check ((legacy and declared_at is not null) or (not legacy and declared_at is null));

alter table public.saju_evaluations
  -- 🆕 이 판정이 **이미 알려져 있던 일정**과 겹치는가.
  --    🔒 full = 적중으로 세지 않는다. 달력을 읽은 것이다.
  add column if not exists known_overlap text;
alter table public.saju_evaluations drop constraint if exists saju_ev_known;
alter table public.saju_evaluations add constraint saju_ev_known
  check (known_overlap is null or known_overlap in ('none','partial','full'));

comment on column public.saju_forecasts.known is
  '예측 시점에 이미 확정돼 있던 미래 일정. 명리 예측이 아니다 — 적중으로 세지 않는다';
comment on column public.saju_forecasts.timing_trust is
  'server=DB 가 작성시각을 봤다 / self=legacy 자기신고. 통계에서 섞지 않는다';
comment on column public.saju_evaluations.known_overlap is
  'full=이미 알려진 일정과 완전히 겹친다 → 적중 아님';

-- ══════════ 2. 🔒 timing — legacy 는 declared_at 기준, 낙인을 남긴다 ══════════

create or replace function public.saju_stamp() returns trigger
language plpgsql set search_path = public as $$
declare v_now timestamptz := now(); v_base date;
begin
  if tg_op = 'INSERT' then
    new.created_at := v_now;                      -- 들어온 값 무시
    if new.status = 'locked' then new.locked_at := v_now; else new.locked_at := null; end if;
    if new.status in ('published','locked') then new.published_at := coalesce(new.published_at, v_now); end if;
  else
    new.created_at := old.created_at;             -- 🔒 작성시각은 영원히 안 바뀐다
    new.legacy := old.legacy;                     -- 🔒 legacy 낙인은 못 지운다
    new.declared_at := old.declared_at;
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
  --    ⚠️ legacy 는 서버가 작성시각을 못 봤다 → 자기신고 declared_at 으로 재되, self 로 낙인한다.
  --       이걸 안 가르면 「8월에 썼다」는 주장이 서버 보증과 같은 무게를 갖는다.
  if new.locked_at is null then
    new.timing := null; new.timing_trust := null;
  else
    if new.legacy then v_base := new.declared_at; new.timing_trust := 'self';
    else                v_base := new.locked_at::date; new.timing_trust := 'server'; end if;
    if    v_base <  new.target_start then new.timing := 'prior';   -- 온전한 사전예측
    elsif v_base <= new.target_end   then new.timing := 'mid';     -- 기간 중. 부분 사후
    else                                  new.timing := 'post';    -- 기간 후. 예측이 아니다
    end if;
  end if;
  return new;
end $$;

-- ══════════ 3. 🔒 known 강제 — 잠글 때 「무엇을 이미 알고 있었나」를 밝혀야 한다 ══════════
-- ⚠️ 전에는 guard 가 UPDATE 에만 걸려 있었다. saju_publish 는 INSERT 로 바로 locked 를 넣으니
--    INSERT 경로가 뚫려 있었다 → insert or update 로 바꾼다.

create or replace function public.saju_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  -- 🔒 잠그는 순간 known 이 있어야 한다. 「없었다」면 그렇게 쓴다(빈 서랍 금지).
  --    이게 비어 있으면 수연은 적중과 달력 읽기를 가를 수 없다.
  if new.status = 'locked' and (new.known is null or length(trim(new.known)) = 0) then
    raise exception 'SAJU: 잠그려면 known(예측 시점에 이미 확정돼 있던 일정)을 밝혀야 한다. 없으면 "없음" 이라고 써라';
  end if;
  if new.legacy and new.declared_at > current_date then
    raise exception 'SAJU: legacy 의 declared_at 이 미래다 (%)', new.declared_at;
  end if;

  if tg_op = 'UPDATE' then
    -- ③ 잠긴 예측의 본문은 못 고친다. 고치려면 새 version 행이다.
    if old.status = 'locked' then
      if new.content is distinct from old.content
         or new.structured is distinct from old.structured
         or new.known is distinct from old.known
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
    if old.status = 'published' and new.status = 'draft' then
      raise exception 'SAJU: published → draft 로 되돌릴 수 없다';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists saju_forecasts_guard on public.saju_forecasts;
create trigger saju_forecasts_guard before insert or update on public.saju_forecasts
  for each row execute function public.saju_guard();

-- ══════════ 4. 🔒 판정 — 적중이라면 「달력을 읽은 것」이 아님을 밝혀야 한다 ══════════

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
  -- 🆕 🔒 적중·부분적중이면 known 과 겹치는지 밝혀야 한다.
  --    이걸 안 물으면 「9/30 설명회가 열렸다」가 적중이 된다. 그건 달력이다.
  if new.verdict in ('hit','partial') and new.known_overlap is null then
    raise exception 'SAJU: 적중으로 판정하려면 known_overlap(이미 알던 일정과 겹치는가)을 밝혀야 한다';
  end if;
  if new.user_id is distinct from f.user_id then
    raise exception 'SAJU: 예측과 평가의 주인이 다르다';
  end if;
  return new;
end $$;

-- ══════════ 5. 중계 함수 갱신 ══════════
-- ⚠️ 인자가 바뀌면 create or replace 가 아니라 **새 함수**가 된다 → 옛 시그니처를 지운다.
--    남겨 두면 방이 known 없는 옛 함수를 계속 호출한다(전례: emr_reply 우회).

drop function if exists public.saju_publish(text,date,date,text,jsonb,text,text,text,boolean);
drop function if exists public.saju_evaluate(uuid,text,text,text,text,text,text,text);

-- 로버트: 예측 작성 + 잠금. 🔒 시각은 서버가 찍는다. 🆕 known 필수.
create or replace function public.saju_publish(
  p_period text, p_start date, p_end date, p_content text, p_known text,
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
     content, known, structured, basis, conflict, status)
  values (v_uid, p_period, p_start, p_end, p_model, v_ver,
     p_content, p_known, p_structured, p_basis, p_conflict,
     case when p_lock then 'locked' else 'published' end)
  returning id into v_id;
  return (select jsonb_build_object('id',id,'version',version,'timing',timing,
            'timing_trust',timing_trust,'locked_at',locked_at,'status',status)
          from public.saju_forecasts where id = v_id);
end $$;

-- 🆕 1단계: 기존 readings 를 옮긴다. 🔒 자기신고라고 낙인이 찍힌다.
create or replace function public.saju_legacy(
  p_period text, p_start date, p_end date, p_content text,
  p_declared date, p_known text default '없음(legacy — 당시 기록이 남아 있지 않다)',
  p_structured jsonb default null, p_model text default null)
returns jsonb language plpgsql set search_path = public as $$
declare v_uid uuid := public.saju_uid(); v_ver int; v_id uuid;
begin
  if p_declared is null then raise exception 'SAJU: legacy 는 declared_at 이 있어야 한다'; end if;
  select coalesce(max(version),0)+1 into v_ver from public.saju_forecasts
    where user_id = v_uid and period_type = p_period and target_start = p_start;
  insert into public.saju_forecasts
    (user_id, period_type, target_start, target_end, model, version,
     content, known, structured, status, legacy, declared_at)
  values (v_uid, p_period, p_start, p_end, p_model, v_ver,
     p_content, p_known, p_structured, 'locked', true, p_declared)
  returning id into v_id;
  return (select jsonb_build_object('id',id,'version',version,'timing',timing,
            'timing_trust',timing_trust,'legacy',legacy) from public.saju_forecasts where id = v_id);
end $$;

-- 수연: 판정. 🆕 known_overlap. pre_summary·known_overlap 은 트리거가 검사한다.
create or replace function public.saju_evaluate(
  p_forecast uuid, p_area text, p_verdict text, p_pre_summary text,
  p_known_overlap text default null,
  p_evidence text default null, p_reasoning text default null,
  p_hindsight text default null, p_model text default null)
returns jsonb language plpgsql set search_path = public as $$
declare v_uid uuid := public.saju_uid(); v_id uuid;
begin
  insert into public.saju_evaluations
    (user_id, forecast_id, model, pre_summary, area, verdict,
     known_overlap, evidence, reasoning, hindsight_risk)
  values (v_uid, p_forecast, p_model, p_pre_summary, p_area, p_verdict,
          p_known_overlap, p_evidence, p_reasoning, p_hindsight)
  on conflict (forecast_id, area) do update
    set verdict = excluded.verdict, known_overlap = excluded.known_overlap,
        evidence = excluded.evidence,
        reasoning = excluded.reasoning, hindsight_risk = excluded.hindsight_risk
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- 🔄 로버트가 예측을 쓰기 전에 읽는 되먹임 — 🆕 known 과 trust 도 보여준다
create or replace function public.saju_context(p_limit int default 12)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'target_start' desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'target_start', f.target_start, 'period_type', f.period_type,
      'version', f.version, 'timing', f.timing, 'timing_trust', f.timing_trust,
      'legacy', f.legacy,
      'content', left(f.content, 400),
      'known', left(coalesce(f.known,''), 300),
      'verdicts', (select jsonb_agg(jsonb_build_object(
                     'area', e.area, 'verdict', e.verdict,
                     'known_overlap', e.known_overlap,
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

-- 수연: 평가 대기. 🆕 known 과 trust 를 같이 넘긴다 — 판정 전에 알아야 한다
create or replace function public.saju_due()
returns table(id uuid, period_type text, target_start date, target_end date,
              version int, timing text, timing_trust text, legacy boolean, known text)
language sql stable set search_path = public as $$
  select f.id, f.period_type, f.target_start, f.target_end, f.version,
         f.timing, f.timing_trust, f.legacy, f.known
  from public.saju_forecasts f
  where f.user_id = public.saju_uid() and f.status = 'locked'
    and f.target_end < current_date and f.timing <> 'post'
    and not exists (select 1 from public.saju_evaluations e where e.forecast_id = f.id)
  order by f.target_start;
$$;

revoke all on function
  public.saju_publish(text,date,date,text,text,jsonb,text,text,text,boolean),
  public.saju_legacy(text,date,date,text,date,text,jsonb,text),
  public.saju_evaluate(uuid,text,text,text,text,text,text,text,text),
  public.saju_context(int), public.saju_due() from public;
grant execute on function
  public.saju_publish(text,date,date,text,text,jsonb,text,text,text,boolean),
  public.saju_legacy(text,date,date,text,date,text,jsonb,text),
  public.saju_evaluate(uuid,text,text,text,text,text,text,text,text),
  public.saju_context(int), public.saju_due() to authenticated;

-- ══════════ 6. ⚠️ anon 을 따로 지운다 ══════════
-- revoke ... from public 은 PUBLIC 만 지운다. Supabase 는 default privileges 로
-- anon 에게도 EXECUTE 를 **직접** 부여하므로 위 revoke 로는 안 지워진다.
-- 확인: 0단계 적용 후 pg_proc.proacl 에 anon=X/postgres 가 그대로 남아 있었다.
-- RLS(to authenticated)가 이미 막고 있어 실害는 없었지만, 열린 문을 두지 않는다.
-- 🔒 트리거 함수(saju_stamp·saju_guard·saju_eval_*)는 남겨도 무해하다 —
--    트리거 밖에서 호출하면 Postgres 가 거부하고, 트리거 실행은 EXECUTE 권한을 보지 않는다.
revoke execute on function
  public.saju_uid(),
  public.saju_pending(text,int),
  public.saju_context(int),
  public.saju_publish(text,date,date,text,text,jsonb,text,text,text,boolean),
  public.saju_legacy(text,date,date,text,date,text,jsonb,text),
  public.saju_due(),
  public.saju_presummary(uuid,text),
  public.saju_evaluate(uuid,text,text,text,text,text,text,text,text)
from anon;
