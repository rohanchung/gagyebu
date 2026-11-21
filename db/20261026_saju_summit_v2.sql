-- 🏛 대토론 v2 — 사주방 v3 점검(§11) · 수연 사전점검(§12) 반영 (제작방 · 2026-10-26)
-- 핸드오프 saju-summit-2027 (id 27). 11/1 본행사 전에 고친다.
--
-- 🔴 필수
--   ① 수연 서명 없이 결재가 됐다 → 서명 필수(수연 R1 결석일 때만 예외). 이의면 결재는 되되 합의안에 이의를 박는다.
--   ② 서명이 특정 최종안에 묶이지 않았다 → 서명에 final_id. 결재는 「최신 최종안에 대한 서명」이 있어야 된다.
--      (서명 뒤 최종안을 다시 내는 건 막지 않는다 — 새 안은 서명이 없으니 결재가 안 되고, 수연이 다시 서명해야 한다.
--       「서명 무효화 → 재서명」과 같은 결과를 따로 무효화 절차 없이 얻는다. 옛 서명은 옛 안에 묶인 채 이력으로 남는다.)
--   ③ 월별 12칸이 양력 1~12월과 어긋났다(n=1 이 寅월, n=12 丑월은 다음 해 1월) → 양력 월(m) 키 + 그 달을 지배하는 월건 + 절입 시각.
-- 🟠 권장
--   ④ 영역 이름 enum 8개 강제 · ⑤ 월별 칸에 watch(지표) 필수 + 판정 규칙 지금 고정 · ⑥ 자료팩 동결은 로한만 · ⑦ 읽기 기록(감사)
-- 📝 수연 §12-4·12-5 — R1 에 연쇄(chains ≥5)와 저확률·고충격(risks ≥1) 필수
--
-- 🔒 더하기·좁히기만 한다. 기존 제출(드라이런 더미 포함)은 건드리지 않는다 — 검사는 새 제출부터다.

-- ── 1. 절입 시각 표 (12 節) ──
-- 계산: Meeus 25장 저정밀 태양 황경 + 장동·광행차, ΔT 다항식. 검산: 2024 입춘 계산 17:20 / 실제 17:27 KST,
--       2025 입춘 계산 23:07 / 실제 23:10 KST → 오차 ±10분 이내(계산이 몇 분 이르다).
-- 🔒 자정 ±30분 안에 걸린 절기는 near_midnight 로 표시한다 — 그날이 어느 월건인지 오차만큼 불확실하다.
--    2026~2030 중 해당: 2026 백로(09-07 23:40), 2030 망종(06-05 23:44). 2027 은 없다.
create table if not exists public.saju_jieqi (
  year   int  not null,
  m      int  not null check (m between 1 and 12),
  name   text not null,
  branch text not null,
  at     timestamptz not null,
  primary key (year, m)
);
alter table public.saju_jieqi enable row level security;
drop policy if exists read_saju_jieqi on public.saju_jieqi;
create policy read_saju_jieqi on public.saju_jieqi for select using (true);
insert into public.saju_jieqi (year, m, name, branch, at) values
(2026,1,'소한','丑','2026-01-05T08:17:46.658Z'),
(2026,2,'입춘','寅','2026-02-03T19:54:40.606Z'),
(2026,3,'경칩','卯','2026-03-05T13:48:50.320Z'),
(2026,4,'청명','辰','2026-04-04T18:27:17.033Z'),
(2026,5,'입하','巳','2026-05-05T11:35:06.752Z'),
(2026,6,'망종','午','2026-06-05T15:36:22.539Z'),
(2026,7,'소서','未','2026-07-07T01:48:38.397Z'),
(2026,8,'입추','申','2026-08-07T11:38:50.876Z'),
(2026,9,'백로','酉','2026-09-07T14:40:37.173Z'),
(2026,10,'한로','戌','2026-10-08T06:28:56.616Z'),
(2026,11,'입동','亥','2026-11-07T09:49:51.364Z'),
(2026,12,'대설','子','2026-12-07T02:48:29.391Z'),
(2027,1,'소한','丑','2027-01-05T14:05:20.408Z'),
(2027,2,'입춘','寅','2027-02-04T01:42:10.489Z'),
(2027,3,'경칩','卯','2027-03-05T19:36:03.816Z'),
(2027,4,'청명','辰','2027-04-05T00:14:06.082Z'),
(2027,5,'입하','巳','2027-05-05T17:21:30.145Z'),
(2027,6,'망종','午','2027-06-05T21:22:26.754Z'),
(2027,7,'소서','未','2027-07-07T07:34:36.145Z'),
(2027,8,'입추','申','2027-08-07T17:24:57.461Z'),
(2027,9,'백로','酉','2027-09-07T20:27:05.879Z'),
(2027,10,'한로','戌','2027-10-08T12:15:54.938Z'),
(2027,11,'입동','亥','2027-11-07T15:37:19.312Z'),
(2027,12,'대설','子','2027-12-07T08:36:20.013Z'),
(2028,1,'소한','丑','2028-01-05T19:53:21.921Z'),
(2028,2,'입춘','寅','2028-02-04T07:30:09.265Z'),
(2028,3,'경칩','卯','2028-03-05T01:23:47.556Z'),
(2028,4,'청명','辰','2028-04-04T06:01:26.879Z'),
(2028,5,'입하','巳','2028-05-04T23:08:26.818Z'),
(2028,6,'망종','午','2028-06-05T03:09:05.643Z'),
(2028,7,'소서','未','2028-07-06T13:21:09.684Z'),
(2028,8,'입추','申','2028-08-06T23:11:40.595Z'),
(2028,9,'백로','酉','2028-09-07T02:14:11.562Z'),
(2028,10,'한로','戌','2028-10-07T18:03:30.454Z'),
(2028,11,'입동','亥','2028-11-06T21:25:24.629Z'),
(2028,12,'대설','子','2028-12-06T14:24:48.307Z'),
(2029,1,'소한','丑','2029-01-05T01:42:01.661Z'),
(2029,2,'입춘','寅','2029-02-03T13:18:47.135Z'),
(2029,3,'경칩','卯','2029-03-05T07:12:11.542Z'),
(2029,4,'청명','辰','2029-04-04T11:49:29.253Z'),
(2029,5,'입하','巳','2029-05-05T04:56:06.400Z'),
(2029,6,'망종','午','2029-06-05T08:56:28.571Z'),
(2029,7,'소서','未','2029-07-06T19:08:28.019Z'),
(2029,8,'입추','申','2029-08-07T04:59:08.838Z'),
(2029,9,'백로','酉','2029-09-07T08:02:02.276Z'),
(2029,10,'한로','戌','2029-10-07T23:51:50.690Z'),
(2029,11,'입동','亥','2029-11-07T03:14:14.331Z'),
(2029,12,'대설','子','2029-12-06T20:14:00.827Z'),
(2030,1,'소한','丑','2030-01-05T07:31:25.777Z'),
(2030,2,'입춘','寅','2030-02-03T19:08:09.887Z'),
(2030,3,'경칩','卯','2030-03-05T13:01:21.235Z'),
(2030,4,'청명','辰','2030-04-04T17:38:18.338Z'),
(2030,5,'입하','巳','2030-05-05T10:44:33.673Z'),
(2030,6,'망종','午','2030-06-05T14:44:39.927Z'),
(2030,7,'소서','未','2030-07-07T00:56:35.097Z'),
(2030,8,'입추','申','2030-08-07T10:47:25.658Z'),
(2030,9,'백로','酉','2030-09-07T13:50:40.989Z'),
(2030,10,'한로','戌','2030-10-08T05:40:58.121Z'),
(2030,11,'입동','亥','2030-11-07T09:03:50.424Z'),
(2030,12,'대설','子','2030-12-07T02:03:59.132Z')
on conflict (year, m) do update set name = excluded.name, branch = excluded.branch, at = excluded.at;

-- 양력 1~12월 각 칸 = 그 달의 절입 이후 월건(한 달의 대부분을 지배한다).
-- 1월 = 前年 丑월(소한~), 2월 = 寅월(입춘~) … 12월 = 子월(대설~). 1월 칸의 천간은 전년 세운에서 나온다(五虎遁).
create or replace function public.saju_months_solar(p_year int)
returns table(m int, ganji text, branch text, jieqi text, jieqi_at timestamptz, jieqi_kst text, near_midnight boolean)
language sql stable set search_path to 'public' as $$
  select mm,
         case when mm = 1 then (select g.ganji from saju_month_ganji(p_year - 1) g where g.n = 12)
              else (select g.ganji from saju_month_ganji(p_year) g where g.n = mm - 1) end,
         case when mm = 1 then '丑' else (select g.branch from saju_month_ganji(p_year) g where g.n = mm - 1) end,
         j.name, j.at,
         to_char(j.at at time zone 'Asia/Seoul', 'MM-DD HH24:MI'),
         case when j.at is null then null else
           extract(hour from j.at at time zone 'Asia/Seoul') * 60 + extract(minute from j.at at time zone 'Asia/Seoul') not between 30 and 1410 end
    from generate_series(1, 12) mm
    left join saju_jieqi j on j.year = p_year and j.m = mm
   order by mm
$$;

-- ── 2. 영역 enum (§11-3 ④) ──
create or replace function public.summit_areas() returns text[]
language sql immutable as $$ select array['총운','재물','건강','시험학업','일사업','관계','가족','이동주거'] $$;
create or replace function public.summit_area_check(p_area text, p_label text) returns void
language plpgsql immutable set search_path to 'public' as $$
begin
  if p_area is null or not (p_area = any(summit_areas())) then
    raise exception 'SUMMIT: % 의 area 「%」 는 정본이 아니다 — 총운·재물·건강·시험학업·일사업·관계·가족·이동주거 중 하나 (매트릭스 행이 갈린다)', p_label, coalesce(p_area,'(없음)');
  end if;
end $$;

-- 월별 칸 지표 (§11-3 ⑤) — 🔒 판정 규칙은 **지금 고정**한다(연말에 만들지 않는다)
create or replace function public.summit_watch() returns text[]
language sql immutable as $$ select array['월수지','학습기록일','타임로그기록일','의료이벤트','체중'] $$;
create or replace function public.summit_month_rule() returns text
language sql immutable as $$
  select '「주의」 달은 watch 지표가 그해 월평균보다 나쁘면 적중, 「기회」 달은 좋으면 적중, 「보통」은 채점 제외. '
      || '나쁨·좋음의 방향: 월수지(클수록 좋다) · 학습기록일(많을수록) · 타임로그기록일(많을수록) · 의료이벤트(적을수록) · 체중(목표 방향으로 움직이면 좋다). '
      || 'watch 를 여럿 적으면 과반이 맞아야 적중. (2026-10-26 고정 · 사주방 v3 §11-3 ⑤)'
$$;

create or replace function public.summit_check_items(p_items jsonb, p_label text)
returns void language plpgsql immutable set search_path to 'public' as $$
declare it jsonb; i int := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'SUMMIT: % 가 비었다', p_label;
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    i := i + 1;
    if coalesce(trim(it->>'area'),'') = '' then raise exception 'SUMMIT: % %번째 항목에 area 가 없다', p_label, i; end if;
    perform summit_area_check(it->>'area', p_label);
    if coalesce(trim(it->>'claim'),'') = '' then raise exception 'SUMMIT: % % 에 claim 이 없다', p_label, it->>'area'; end if;
    if coalesce(trim(it->>'falsify'),'') = '' then
      raise exception 'SUMMIT: % % 에 falsify(반증 조건)가 없다 — 숫자·날짜·기록 존재 여부로 판정할 수 있어야 제출된다', p_label, it->>'area';
    end if;
    if it ? 'confidence' and it->>'confidence' not in ('상','중','하') then
      raise exception 'SUMMIT: % confidence 는 상·중·하다 (받은 값: %)', it->>'area', it->>'confidence';
    end if;
  end loop;
end $$;

-- R1 월별 12칸 · 연쇄 · 저확률고충격 검사
create or replace function public.summit_check_r1(p_s jsonb)
returns void language plpgsql immutable set search_path to 'public' as $$
declare it jsonb; w text; seen int[] := '{}'; mm int; lv text[] := array['낮음','중간','높음']; i int := 0;
begin
  perform summit_check_items(p_s->'areas', 'R1 영역');
  -- ③⑤ 월별: 양력 m 1~12, 중복 없이 12칸 전부, level·watch 필수
  if jsonb_typeof(p_s->'months') is distinct from 'array' or jsonb_array_length(p_s->'months') <> 12 then
    raise exception 'SUMMIT: months 는 양력 1~12월 12칸 전부다 — 칸마다 {m, level, watch[], line}';
  end if;
  for it in select * from jsonb_array_elements(p_s->'months') loop
    if coalesce(it->>'m','') !~ '^\d{1,2}$' then raise exception 'SUMMIT: 월별 칸에 m(양력 월 1~12)이 없다 — n(월건 순번)이 아니다'; end if;
    mm := (it->>'m')::int;
    if mm not between 1 and 12 then raise exception 'SUMMIT: m 은 1~12 다 (받은 값: %)', mm; end if;
    if mm = any(seen) then raise exception 'SUMMIT: % 월 칸이 두 번 나왔다', mm; end if;
    seen := seen || mm;
    if it->>'level' is null or it->>'level' not in ('기회','주의','보통') then
      raise exception 'SUMMIT: % 월 level 은 기회·주의·보통이다 (받은 값: %)', mm, it->>'level';
    end if;
    if jsonb_typeof(it->'watch') is distinct from 'array' or jsonb_array_length(it->'watch') = 0 then
      raise exception 'SUMMIT: % 월 칸에 watch(무엇으로 판정할지)가 없다 — 월수지·학습기록일·타임로그기록일·의료이벤트·체중 중 하나 이상', mm;
    end if;
    for w in select * from jsonb_array_elements_text(it->'watch') loop
      if not (w = any(summit_watch())) then
        raise exception 'SUMMIT: % 월 watch 「%」 는 정본이 아니다 — 월수지·학습기록일·타임로그기록일·의료이벤트·체중', mm, w;
      end if;
    end loop;
  end loop;
  -- 📝 수연 §12-4 — 변수 간 2·3차 효과 최소 5개
  if jsonb_typeof(p_s->'chains') is distinct from 'array' or jsonb_array_length(p_s->'chains') < 5 then
    raise exception 'SUMMIT: chains(변수 연쇄)는 5개 이상이다 — 예: 「이사 → 통근시간 감소 → 공부시간 증가」 (§12-4)';
  end if;
  for it in select * from jsonb_array_elements(p_s->'chains') loop
    i := i + 1;
    if coalesce(trim(case jsonb_typeof(it) when 'string' then it #>> '{}' else it->>'path' end),'') = '' then
      raise exception 'SUMMIT: chains %번째가 비었다 — 문자열이거나 {path}', i;
    end if;
  end loop;
  -- 📝 수연 §12-5 — 저확률·고충격
  if jsonb_typeof(p_s->'risks') is distinct from 'array' or jsonb_array_length(p_s->'risks') = 0 then
    raise exception 'SUMMIT: risks(저확률·고충격)가 없다 — {event, prob, impact, path} (§12-5)';
  end if;
  for it in select * from jsonb_array_elements(p_s->'risks') loop
    if coalesce(trim(it->>'event'),'') = '' or coalesce(trim(it->>'path'),'') = '' then
      raise exception 'SUMMIT: risks 항목은 event(무슨 일)와 path(발생 시 어느 경로가 깨지나)를 적는다';
    end if;
    if not (coalesce(it->>'prob','') = any(lv)) or not (coalesce(it->>'impact','') = any(lv)) then
      raise exception 'SUMMIT: risks 「%」 의 prob·impact 는 낮음·중간·높음이다', it->>'event';
    end if;
  end loop;
end $$;

-- ── 3. 제출 — R1 은 summit_check_r1, R2·R3 도 area 정본 ──
create or replace function public.summit_submit(p_year int, p_member text, p_round int, p_content text,
                                                p_structured jsonb, p_dry boolean default false)
returns jsonb language plpgsql set search_path to 'public' as $$
declare r saju_summits := summit_row(p_year, p_dry); k text := summit_kind(p_round); it jsonb; other text; n int;
begin
  if p_member not in ('claude','suyeon') then raise exception 'SUMMIT: 참가자는 claude 또는 suyeon 이다 (받은 값: %)', p_member; end if;
  if p_round not between 1 and 3 then raise exception 'SUMMIT: summit_submit 은 R1~R3 이다. 최종안은 summit_finalize, 서명은 summit_sign'; end if;
  if summit_phase_no(r.phase) <> p_round then
    raise exception 'SUMMIT: 지금은 % 다 — R% 제출을 받지 않는다', r.phase, p_round;
  end if;
  if coalesce(trim(p_content),'') = '' then raise exception 'SUMMIT: 빈 제출은 받지 않는다'; end if;
  if p_round = 1 then
    perform summit_check_r1(p_structured);
  elsif p_round = 2 then
    if jsonb_typeof(p_structured->'responses') is distinct from 'array' or jsonb_array_length(p_structured->'responses') = 0 then
      raise exception 'SUMMIT: R2 는 responses 배열이다(영역마다 동의·반대·수정 + 근거)';
    end if;
    for it in select * from jsonb_array_elements(p_structured->'responses') loop
      perform summit_area_check(it->>'area', 'R2');
      if it->>'stance' is null or it->>'stance' not in ('동의','반대','수정') then raise exception 'SUMMIT: R2 stance 는 동의·반대·수정이다 (받은 값: %)', it->>'stance'; end if;
      if coalesce(trim(it->>'reason'),'') = '' then raise exception 'SUMMIT: R2 % 에 근거(reason)가 없다', it->>'area'; end if;
    end loop;
  else
    if jsonb_typeof(p_structured->'revisions') is distinct from 'array' then
      raise exception 'SUMMIT: R3 는 revisions 배열이다(반론 받은 항목만 유지·철회·수정)';
    end if;
    for it in select * from jsonb_array_elements(p_structured->'revisions') loop
      perform summit_area_check(it->>'area', 'R3');
      if it->>'action' is null or it->>'action' not in ('유지','철회','수정') then raise exception 'SUMMIT: R3 action 은 유지·철회·수정이다 (받은 값: %)', it->>'action'; end if;
      if it->>'action' = '수정' and (coalesce(trim(it->>'claim'),'') = '' or coalesce(trim(it->>'falsify'),'') = '') then
        raise exception 'SUMMIT: R3 % 를 수정하면 claim 과 falsify 를 다시 적는다', it->>'area';
      end if;
    end loop;
  end if;
  begin
    insert into saju_summit_entries (summit_id, round, author, kind, content, structured)
    values (r.id, p_round, p_member, k, p_content, p_structured);
  exception when unique_violation then
    raise exception 'SUMMIT: % 는 R% 를 이미 냈다 — 제출은 잠금이다', p_member, p_round;
  end;
  other := case p_member when 'claude' then 'suyeon' else 'claude' end;
  select count(*) into n from saju_summit_entries where summit_id = r.id and round = p_round and kind = k;
  if n >= 2 then
    update saju_summits set phase = case p_round when 1 then 'r2' when 2 then 'r3' else 'r4' end where id = r.id;
  end if;
  r := summit_row(p_year, p_dry);
  return jsonb_build_object('round', p_round, 'locked', true, 'phase', r.phase,
                            'other_submitted', exists (select 1 from saju_summit_entries
                               where summit_id = r.id and round = p_round and author = other and kind = k));
end $$;

-- ── 4. 자료팩 — 🔒 동결은 로한만(§11-3 ⑥). 동결 = R1 시작 신호다 ──
create or replace function public.summit_dossier(p_year int, p_dossier jsonb, p_freeze boolean default false, p_dry boolean default false)
returns jsonb language plpgsql set search_path to 'public' as $$
declare r saju_summits := summit_row(p_year, p_dry);
begin
  if p_freeze then perform summit_require_rohan(); end if;
  if r.dossier_frozen_at is not null then raise exception 'SUMMIT: 자료팩은 이미 동결됐다 (%)', r.dossier_frozen_at; end if;
  update saju_summits set dossier = coalesce(p_dossier, dossier),
         dossier_frozen_at = case when p_freeze then now() else null end,
         phase = case when p_freeze then 'r1' else phase end
   where id = r.id;
  r := summit_row(p_year, p_dry);
  return jsonb_build_object('phase', r.phase, 'frozen_at', r.dossier_frozen_at);
end $$;

-- ── 5. 최종안·서명 — 서명은 최종안 하나에 묶인다 ──
drop index if exists public.saju_summit_entries_once;
create unique index if not exists saju_summit_entries_once
  on public.saju_summit_entries (summit_id, round, author)
  where kind in ('analysis','rebuttal','revision');
create unique index if not exists saju_summit_sign_once
  on public.saju_summit_entries (summit_id, (structured->>'final_id'))
  where kind = 'sign';

create or replace function public.summit_finalize(p_year int, p_content text, p_structured jsonb, p_dry boolean default false)
returns jsonb language plpgsql set search_path to 'public' as $$
declare r saju_summits := summit_row(p_year, p_dry); d jsonb; v_id uuid;
begin
  if r.phase <> 'r4' then raise exception 'SUMMIT: 최종안은 R4 에서만 낸다 (지금 %)', r.phase; end if;
  if coalesce(trim(p_content),'') = '' then raise exception 'SUMMIT: 빈 최종안은 받지 않는다'; end if;
  if coalesce(jsonb_array_length(p_structured->'agreed'),0) > 0 then
    perform summit_check_items(p_structured->'agreed', 'R4 합의');
  end if;
  for d in select * from jsonb_array_elements(coalesce(p_structured->'disputes','[]'::jsonb)) loop
    if coalesce(trim(d->>'area'),'') = '' then raise exception 'SUMMIT: 쟁점에 area 가 없다'; end if;
    perform summit_area_check(d->>'area', 'R4 쟁점');
    if jsonb_typeof(d->'claude') is distinct from 'object' or jsonb_typeof(d->'suyeon') is distinct from 'object' then
      raise exception 'SUMMIT: 쟁점 「%」 은 로버트안·수연안을 둘 다 적는다 — 한쪽만 있으면 쟁점이 아니다', d->>'area';
    end if;
    perform summit_check_items(jsonb_build_array((d->'claude') || jsonb_build_object('area', d->>'area')), '쟁점 로버트안');
    perform summit_check_items(jsonb_build_array((d->'suyeon') || jsonb_build_object('area', d->>'area')), '쟁점 수연안');
  end loop;
  insert into saju_summit_entries (summit_id, round, author, kind, content, structured)
  values (r.id, 4, 'claude', 'final', p_content, p_structured) returning id into v_id;
  return jsonb_build_object('phase', r.phase, 'final_id', v_id,
                            'disputes', jsonb_array_length(coalesce(p_structured->'disputes','[]'::jsonb)),
                            'needs_sign', true);
end $$;

-- 🔒 서명은 **지금 최신 최종안**에 묶인다(final_id). 같은 안에 두 번 서명할 수 없다.
--    로버트가 그 뒤 새 안을 내면 그 안은 서명이 없다 → 수연이 다시 서명해야 결재된다.
create or replace function public.summit_sign(p_year int, p_decision text, p_reason text default null, p_dry boolean default false)
returns jsonb language plpgsql set search_path to 'public' as $$
declare r saju_summits := summit_row(p_year, p_dry); fin saju_summit_entries;
begin
  if r.phase <> 'r4' then raise exception 'SUMMIT: 서명은 R4 에서만 한다 (지금 %)', r.phase; end if;
  if p_decision is null or p_decision not in ('동의','이의') then raise exception 'SUMMIT: 서명은 동의 또는 이의다 (받은 값: %)', p_decision; end if;
  if p_decision = '이의' and coalesce(trim(p_reason),'') = '' then raise exception 'SUMMIT: 이의에는 사유를 적는다'; end if;
  select * into fin from saju_summit_entries where summit_id = r.id and kind = 'final' order by submitted_at desc, id desc limit 1;
  if fin.id is null then raise exception 'SUMMIT: 서명할 최종안이 없다'; end if;
  begin
    insert into saju_summit_entries (summit_id, round, author, kind, content, structured)
    values (r.id, 4, 'suyeon', 'sign', coalesce(p_reason, p_decision),
            jsonb_build_object('decision', p_decision, 'final_id', fin.id));
  exception when unique_violation then
    raise exception 'SUMMIT: 수연은 이 최종안(%)에 이미 서명했다 — 서명은 잠금이다', fin.id;
  end;
  return jsonb_build_object('signed', p_decision, 'final_id', fin.id);
end $$;

-- ── 6. 결재 — 🔒 최신 최종안에 대한 수연 서명이 있어야 된다(수연 R1 결석일 때만 예외) ──
create or replace function public.summit_approve(p_year int, p_choices jsonb, p_dry boolean default false)
returns jsonb language plpgsql set search_path to 'public' as $$
declare r saju_summits := summit_row(p_year, p_dry); fin saju_summit_entries; sg saju_summit_entries; d jsonb; pick text;
        known text; items jsonb := '[]'::jsonb; e saju_summit_entries; pub jsonb := '[]'::jsonb; res jsonb;
        absent boolean; signj jsonb;
begin
  perform summit_require_rohan();
  if r.phase <> 'r4' then raise exception 'SUMMIT: 결재는 R4 에서만 한다 (지금 %)', r.phase; end if;
  select * into fin from saju_summit_entries where summit_id = r.id and kind = 'final' order by submitted_at desc, id desc limit 1;
  if fin.id is null then raise exception 'SUMMIT: 결재할 최종안이 없다'; end if;
  select * into sg from saju_summit_entries where summit_id = r.id and kind = 'sign' and structured->>'final_id' = fin.id::text;
  absent := exists (select 1 from jsonb_array_elements(r.skipped) s where s->>'author' = 'suyeon' and (s->>'round')::int = 1);
  if sg.id is null and not absent then
    raise exception 'SUMMIT: 수연이 최신 최종안에 서명하지 않았다 — 서명(동의·이의)이 있어야 결재된다. 옛 안에 한 서명은 새 안에 이어지지 않는다';
  end if;
  signj := case when sg.id is not null then jsonb_build_object('decision', sg.structured->>'decision', 'reason', sg.content,
                                                              'final_id', fin.id, 'at', sg.submitted_at)
                else jsonb_build_object('decision', '결석', 'reason', '수연 R1 결석 — 로버트 단독안(§7)', 'final_id', fin.id) end;
  for d in select * from jsonb_array_elements(coalesce(fin.structured->'disputes','[]'::jsonb)) loop
    pick := p_choices->>(d->>'area');
    if pick is null or pick not in ('claude','suyeon') then
      raise exception 'SUMMIT: 쟁점 「%」 을 고르지 않았다 — 모든 쟁점을 골라야 결재된다', d->>'area';
    end if;
    items := items || ((d->pick) || jsonb_build_object('area', d->>'area', 'from', pick, 'disputed', true));
  end loop;
  items := coalesce(fin.structured->'agreed','[]'::jsonb) || items;
  update saju_summits set approved_at = now(), choices = coalesce(p_choices,'{}'::jsonb), phase = 'done' where id = r.id;
  if not r.dry then
    known := coalesce(nullif(trim(r.dossier->>'known'),''), '없음');
    for e in select * from saju_summit_entries where summit_id = r.id and round = 1 and kind = 'analysis' order by author loop
      res := saju_summit_publish(r.year, e.author, '[R1 원본 · '||e.author||'] '||e.content, known,
               jsonb_build_object('summit', jsonb_build_object('year', r.year, 'round', 1, 'entry', e.id)) || coalesce(e.structured,'{}'::jsonb));
      pub := pub || res;
    end loop;
    -- 🔒 이의든 결석이든 합의안에 서명 상태를 같이 박는다 — 연말에 「수연이 반대한 안」인지 보인다
    res := saju_summit_publish(r.year, 'consensus', fin.content, known,
             jsonb_build_object('summit', jsonb_build_object('year', r.year, 'round', 4, 'entry', fin.id, 'choices', p_choices),
                                'sign', signj, 'areas', items, 'month_rule', summit_month_rule()));
    pub := pub || res;
  end if;
  return jsonb_build_object('approved', true, 'dry', r.dry, 'sign', signj, 'published', pub);
end $$;

-- ── 7. 읽기 기록 (§11-3 ⑦) — 블라인드는 신사협정이다. 그래서 기록이라도 남긴다 ──
-- 🔒 p_member 는 자기신고라 「누가」 읽었는지는 모른다. 남길 수 있는 건 「어떤 이름으로, 언제, 그때 상태가 어땠나」다.
--    새는 경우는 하나뿐이다: 한쪽(X)만 냈을 때 **X 의 이름으로** 읽으면 X 의 본문이 보인다.
--    그 상태의 읽기를 leak_risk 로 표시한다. X 본인이 자기 것을 확인한 것일 수도 있다 — 판정은 사람이 한다.
create table if not exists public.saju_summit_reads (
  id        bigserial primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  summit_id uuid not null references public.saju_summits(id) on delete cascade,
  member    text not null,
  via       text not null,             -- app(로그인 계정) | server(AI 방)
  phase     text not null,
  leak_risk boolean not null default false,
  at        timestamptz not null default now()
);
alter table public.saju_summit_reads enable row level security;
drop policy if exists own_saju_summit_reads on public.saju_summit_reads;
create policy own_saju_summit_reads on public.saju_summit_reads for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.summit_read(p_year int, p_member text, p_dry boolean default false)
returns jsonb language plpgsql volatile set search_path to 'public' as $$
declare r saju_summits := summit_row(p_year, p_dry); ph int := summit_phase_no(r.phase);
        rounds jsonb := '[]'::jsonb; rd int; k text; a text; e saju_summit_entries; isopen boolean; cell jsonb; rw jsonb;
        fin_id uuid; leak boolean := false;
begin
  if p_member not in ('claude','suyeon','rohan') then raise exception 'SUMMIT: member 는 claude·suyeon·rohan 이다'; end if;
  -- 지금 라운드에서 p_member 만 냈고 상대는 안 냈나(= 이 이름으로 읽으면 그 본문이 보인다)
  if ph between 1 and 3 and p_member in ('claude','suyeon') then
    leak := exists (select 1 from saju_summit_entries where summit_id = r.id and round = ph and kind = summit_kind(ph) and author = p_member)
        and not exists (select 1 from saju_summit_entries where summit_id = r.id and round = ph and kind = summit_kind(ph) and author <> p_member);
  end if;
  insert into saju_summit_reads (user_id, summit_id, member, via, phase, leak_risk)
  values (r.user_id, r.id, p_member, case when auth.uid() is null then 'server' else 'app' end, r.phase, leak);
  for rd in 1..3 loop
    k := summit_kind(rd);
    isopen := (select count(*) from saju_summit_entries where summit_id = r.id and round = rd and kind = k) >= 2
            or ph > rd;
    rw := jsonb_build_object('round', rd, 'open', isopen);
    foreach a in array array['claude','suyeon'] loop
      select * into e from saju_summit_entries where summit_id = r.id and round = rd and author = a and kind = k;
      if e.id is null then
        cell := jsonb_build_object('submitted', false,
                  'absent', exists (select 1 from jsonb_array_elements(r.skipped) s where (s->>'round')::int = rd and s->>'author' = a));
      elsif isopen or p_member = a then
        cell := jsonb_build_object('submitted', true, 'submitted_at', e.submitted_at, 'id', e.id,
                                   'content', e.content, 'structured', e.structured);
      else
        cell := jsonb_build_object('submitted', true, 'sealed', true);
      end if;
      rw := rw || jsonb_build_object(a, cell);
    end loop;
    rounds := rounds || rw;
  end loop;
  select id into fin_id from saju_summit_entries where summit_id = r.id and kind = 'final' order by submitted_at desc, id desc limit 1;
  return jsonb_build_object(
    'summit', jsonb_build_object('year', r.year, 'dry', r.dry, 'phase', r.phase, 'frozen_at', r.dossier_frozen_at,
                                 'approved_at', r.approved_at, 'choices', r.choices, 'skipped', r.skipped),
    'dossier', r.dossier,
    'areas', to_jsonb(summit_areas()),
    'watch', to_jsonb(summit_watch()),
    'month_rule', summit_month_rule(),
    'ganji', jsonb_build_object('year', saju_year_ganji(r.year),
                                'months', (select jsonb_agg(jsonb_build_object('m', m, 'ganji', ganji, 'branch', branch, 'jieqi', jieqi,
                                                                               'jieqi_at', jieqi_at, 'jieqi_kst', jieqi_kst, 'near_midnight', near_midnight) order by m)
                                             from saju_months_solar(r.year))),
    'rounds', rounds,
    'finals', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'submitted_at', submitted_at, 'content', content,
                                                            'structured', structured) order by submitted_at, id)
                          from saju_summit_entries where summit_id = r.id and kind = 'final'), '[]'::jsonb),
    -- 🔒 sign = **최신 최종안**에 대한 서명만. 옛 안 서명은 signs 이력으로만
    'sign', (select jsonb_build_object('decision', structured->>'decision', 'reason', content, 'submitted_at', submitted_at, 'final_id', structured->>'final_id')
               from saju_summit_entries where summit_id = r.id and kind = 'sign' and structured->>'final_id' = fin_id::text),
    'signs', coalesce((select jsonb_agg(jsonb_build_object('decision', structured->>'decision', 'reason', content,
                                                           'submitted_at', submitted_at, 'final_id', structured->>'final_id') order by submitted_at)
                         from saju_summit_entries where summit_id = r.id and kind = 'sign'), '[]'::jsonb),
    'suyeon_absent', exists (select 1 from jsonb_array_elements(r.skipped) s where s->>'author' = 'suyeon' and (s->>'round')::int = 1),
    'reads', jsonb_build_object(
       'total', (select count(*) from saju_summit_reads where summit_id = r.id),
       'leak_risk', coalesce((select jsonb_agg(jsonb_build_object('member', member, 'via', via, 'phase', phase, 'at', at) order by at)
                                from saju_summit_reads where summit_id = r.id and leak_risk), '[]'::jsonb)));
end $$;

-- 내 차례 — 수연 R4 는 「최신 최종안에 서명했나」
create or replace function public.summit_pending(p_member text)
returns table(year int, dry boolean, phase text, todo text, done boolean)
language plpgsql stable set search_path to 'public' as $$
#variable_conflict use_column
begin
  if p_member not in ('claude','suyeon') then raise exception 'SUMMIT: member 는 claude 또는 suyeon 이다'; end if;
  return query
  select s.year, s.dry, s.phase,
    case
      when s.phase = 'r0' then '자료팩 동결 대기'
      when s.phase in ('r1','r2','r3') then 'R'||summit_phase_no(s.phase)||' 제출'
      when s.phase = 'r4' and p_member = 'claude' then 'R4 최종안(summit_finalize)'
      when s.phase = 'r4' and p_member = 'suyeon' then 'R4 서명(summit_sign) — 최신 최종안에'
      else '끝' end,
    case
      when s.phase in ('r1','r2','r3') then exists (select 1 from saju_summit_entries x where x.summit_id = s.id
             and x.round = summit_phase_no(s.phase) and x.author = p_member and x.kind = summit_kind(summit_phase_no(s.phase)))
      when s.phase = 'r4' and p_member = 'claude' then exists (select 1 from saju_summit_entries x where x.summit_id = s.id and x.kind = 'final')
      when s.phase = 'r4' and p_member = 'suyeon' then exists (select 1 from saju_summit_entries x where x.summit_id = s.id and x.kind = 'sign'
             and x.structured->>'final_id' = (select f.id::text from saju_summit_entries f where f.summit_id = s.id and f.kind = 'final'
                                               order by f.submitted_at desc, f.id desc limit 1))
      else true end
  from saju_summits s where s.user_id = saju_uid() and s.phase <> 'done'
  order by s.dry, s.year;
end $$;

-- ── 8. 잠금 시각 = 실제 시계 (v2 검산에서 잡음) ──
-- now() 는 트랜잭션 시작 시각이라 한 트랜잭션의 두 제출이 같은 시각이 됐다 → 「최신 최종안」이 무작위.
create or replace function public.summit_entry_guard() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'SUMMIT: 제출은 잠금이다 — 고칠 수 없다 (round %, %)', old.round, old.author;
  end if;
  new.submitted_at := clock_timestamp();
  select user_id into new.user_id from saju_summits where id = new.summit_id;
  return new;
end $$;
-- 검산(롤백 블록, 2026-10-26): T1 영역 정본 · T2a~e 월별(m·12칸·watch·정본·중복) · T3a~c 연쇄·리스크 ·
-- T4 동결은 로한만 · T5 R2 영역 · T6a 서명 없이 결재 거부 · T6b 옛 안 서명으로 새 안 결재 거부 · T6c 이의 서명 결재 ·
-- T7 같은 안 재서명 거부 · T8 읽기 기록 leak_risk 1/2 · T9 수연 R1 결석이면 서명 없이 결재 — 전부 통과, 흔적 0건.
