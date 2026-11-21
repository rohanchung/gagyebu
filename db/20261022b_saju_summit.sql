-- 🏛 2027 대사주토론분석회 — 사주방 핸드오프 saju-summit-2027 v2 (§1·§5·§7·§8·§9)
-- 하루(11/1)에 로버트(claude)·수연(suyeon)이 같은 자료로 각자 2027을 예측 → 블라인드 제출 →
-- 반론 1회 → 수정 1회 → 최종안 → 로한 결재·잠금. 라운드는 R3에서 끝난다(무한 토론 금지).
--
-- 🔒 기존 사주 패턴 그대로: RPC(invoker) + RLS(user_id = auth.uid()) + 트리거 가드.
--    AI 방은 서버 권한(auth.uid() null)으로 RPC 를 부르고, 앱(로한)은 로그인 계정으로 부른다.
-- 🔒 제출 = 잠금. 행은 **insert 만** 된다(UPDATE 는 트리거가 거부). 대회 통째로 지우는 것만 cascade.
-- 🔒 블라인드는 summit_read 가 지킨다. 테이블 자체는 금고가 아니다 — 서버 권한이면 직접 읽을 수 있다.
--    그래서 「읽기는 summit_read 로만」이 규칙이다(아고라와 같은 신뢰 모델).

-- ── 0. 예측표에 수연 원본·합의본이 들어갈 자리 (§5-3)
alter table public.saju_forecasts drop constraint if exists saju_forecasts_author_check;
alter table public.saju_forecasts add constraint saju_forecasts_author_check
  check (author = any (array['claude','suyeon','consensus']));

-- ── 1. 테이블
create table if not exists public.saju_summits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  year              int  not null,
  dry               boolean not null default false,          -- 드라이런(10/29~30)은 예측표에 안 넣는다
  phase             text not null default 'r0' check (phase in ('r0','r1','r2','r3','r4','done')),
  dossier           jsonb,
  dossier_frozen_at timestamptz,
  approved_at       timestamptz,
  choices           jsonb,
  skipped           jsonb not null default '[]'::jsonb,       -- 결석·미응답으로 넘긴 기록 [{round,author,at}]
  created_at        timestamptz not null default now(),
  unique (user_id, year, dry)
);

create table if not exists public.saju_summit_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  summit_id    uuid not null references public.saju_summits(id) on delete cascade,
  round        int  not null check (round between 1 and 4),
  author       text not null check (author in ('claude','suyeon','rohan')),
  kind         text not null check (kind in ('analysis','rebuttal','revision','final','sign')),
  content      text not null,
  structured   jsonb,
  submitted_at timestamptz not null default now()
);
create unique index if not exists saju_summit_entries_once
  on public.saju_summit_entries (summit_id, round, author)
  where kind in ('analysis','rebuttal','revision','sign');

alter table public.saju_summits enable row level security;
alter table public.saju_summit_entries enable row level security;
drop policy if exists own_saju_summits on public.saju_summits;
create policy own_saju_summits on public.saju_summits for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists own_saju_summit_entries on public.saju_summit_entries;
create policy own_saju_summit_entries on public.saju_summit_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 2. 가드
create or replace function public.summit_entry_guard() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'SUMMIT: 제출은 잠금이다 — 고칠 수 없다 (round %, %)', old.round, old.author;
  end if;
  new.submitted_at := now();                                        -- 🔒 잠금 시각은 서버가 찍는다
  select user_id into new.user_id from saju_summits where id = new.summit_id;
  return new;
end $$;
drop trigger if exists summit_entry_guard on public.saju_summit_entries;
create trigger summit_entry_guard before insert or update on public.saju_summit_entries
  for each row execute function public.summit_entry_guard();

create or replace function public.summit_guard() returns trigger
language plpgsql set search_path to 'public' as $$
declare ord text[] := array['r0','r1','r2','r3','r4','done'];
begin
  if old.dossier_frozen_at is not null and new.dossier is distinct from old.dossier then
    raise exception 'SUMMIT: 자료팩은 동결됐다 (%) — 한쪽만 새 자료를 보는 일을 막는다', old.dossier_frozen_at;
  end if;
  if array_position(ord, new.phase) < array_position(ord, old.phase) then
    raise exception 'SUMMIT: 라운드는 되돌릴 수 없다 (% → %)', old.phase, new.phase;
  end if;
  if old.approved_at is not null and (new.choices is distinct from old.choices or new.approved_at is distinct from old.approved_at) then
    raise exception 'SUMMIT: 결재는 되돌릴 수 없다';
  end if;
  new.created_at := old.created_at; new.user_id := old.user_id; new.year := old.year; new.dry := old.dry;
  return new;
end $$;
drop trigger if exists summit_guard on public.saju_summits;
create trigger summit_guard before update on public.saju_summits
  for each row execute function public.summit_guard();

-- ── 3. 내부 도우미
create or replace function public.summit_row(p_year int, p_dry boolean)
returns public.saju_summits language plpgsql stable set search_path to 'public' as $$
declare r saju_summits;
begin
  select * into r from saju_summits where user_id = saju_uid() and year = p_year and dry = p_dry;
  if r.id is null then raise exception 'SUMMIT: %년 대회가 없다 — summit_open 으로 연다', p_year; end if;
  return r;
end $$;

create or replace function public.summit_kind(p_round int) returns text
language sql immutable as $$
  select case p_round when 1 then 'analysis' when 2 then 'rebuttal' when 3 then 'revision' end
$$;

create or replace function public.summit_phase_no(p_phase text) returns int
language sql immutable as $$
  select array_position(array['r0','r1','r2','r3','r4','done'], p_phase) - 1
$$;

-- 항목 검사 — 🔒 falsify(반증 조건) 없는 항목은 거부한다(§2-3)
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
    if coalesce(trim(it->>'claim'),'') = '' then raise exception 'SUMMIT: % % 에 claim 이 없다', p_label, it->>'area'; end if;
    if coalesce(trim(it->>'falsify'),'') = '' then
      raise exception 'SUMMIT: % % 에 falsify(반증 조건)가 없다 — 숫자·날짜·기록 존재 여부로 판정할 수 있어야 제출된다', p_label, it->>'area';
    end if;
    if it ? 'confidence' and it->>'confidence' not in ('상','중','하') then
      raise exception 'SUMMIT: % confidence 는 상·중·하다 (받은 값: %)', it->>'area', it->>'confidence';
    end if;
  end loop;
end $$;

-- ── 4. 여는 쪽 (제작방·로한)
create or replace function public.summit_open(p_year int, p_dry boolean default false)
returns jsonb language plpgsql set search_path to 'public' as $$
declare r saju_summits;
begin
  insert into saju_summits (user_id, year, dry) values (saju_uid(), p_year, p_dry)
  on conflict (user_id, year, dry) do nothing;
  r := summit_row(p_year, p_dry);
  return jsonb_build_object('id', r.id, 'year', r.year, 'dry', r.dry, 'phase', r.phase);
end $$;

-- 자료팩 — 동결 전까지 덮어쓴다. 🔒 동결하면 R1 이 열린다(§3 「10/31 동결」)
create or replace function public.summit_dossier(p_year int, p_dossier jsonb, p_freeze boolean default false, p_dry boolean default false)
returns jsonb language plpgsql set search_path to 'public' as $$
declare r saju_summits := summit_row(p_year, p_dry);
begin
  if r.dossier_frozen_at is not null then raise exception 'SUMMIT: 자료팩은 이미 동결됐다 (%)', r.dossier_frozen_at; end if;
  update saju_summits set dossier = coalesce(p_dossier, dossier),
         dossier_frozen_at = case when p_freeze then now() else null end,
         phase = case when p_freeze then 'r1' else phase end
   where id = r.id;
  r := summit_row(p_year, p_dry);
  return jsonb_build_object('phase', r.phase, 'frozen_at', r.dossier_frozen_at);
end $$;

-- ── 5. 참가자 (로버트 = claude · 수연 = suyeon)
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
    perform summit_check_items(p_structured->'areas', 'R1 영역');
    if p_structured ? 'months' then
      if jsonb_typeof(p_structured->'months') <> 'array' or jsonb_array_length(p_structured->'months') > 12 then
        raise exception 'SUMMIT: months 는 12칸 이하의 배열이다';
      end if;
      for it in select * from jsonb_array_elements(p_structured->'months') loop
        if it->>'level' not in ('기회','주의','보통') then
          raise exception 'SUMMIT: 월별 칸 level 은 기회·주의·보통이다 (받은 값: %)', it->>'level';
        end if;
      end loop;
    end if;
  elsif p_round = 2 then
    if jsonb_typeof(p_structured->'responses') <> 'array' or jsonb_array_length(p_structured->'responses') = 0 then
      raise exception 'SUMMIT: R2 는 responses 배열이다(영역마다 동의·반대·수정 + 근거)';
    end if;
    for it in select * from jsonb_array_elements(p_structured->'responses') loop
      if it->>'stance' not in ('동의','반대','수정') then raise exception 'SUMMIT: R2 stance 는 동의·반대·수정이다 (받은 값: %)', it->>'stance'; end if;
      if coalesce(trim(it->>'reason'),'') = '' then raise exception 'SUMMIT: R2 % 에 근거(reason)가 없다', it->>'area'; end if;
    end loop;
  else
    if jsonb_typeof(p_structured->'revisions') <> 'array' then
      raise exception 'SUMMIT: R3 는 revisions 배열이다(반론 받은 항목만 유지·철회·수정)';
    end if;
    for it in select * from jsonb_array_elements(p_structured->'revisions') loop
      if it->>'action' not in ('유지','철회','수정') then raise exception 'SUMMIT: R3 action 은 유지·철회·수정이다 (받은 값: %)', it->>'action'; end if;
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

-- R4 — 로버트 초안. 🔒 쟁점은 양안 병기 — 억지로 합치지 않는다(§1)
create or replace function public.summit_finalize(p_year int, p_content text, p_structured jsonb, p_dry boolean default false)
returns jsonb language plpgsql set search_path to 'public' as $$
declare r saju_summits := summit_row(p_year, p_dry); d jsonb;
begin
  if r.phase <> 'r4' then raise exception 'SUMMIT: 최종안은 R4 에서만 낸다 (지금 %)', r.phase; end if;
  if coalesce(trim(p_content),'') = '' then raise exception 'SUMMIT: 빈 최종안은 받지 않는다'; end if;
  if coalesce(jsonb_array_length(p_structured->'agreed'),0) > 0 then
    perform summit_check_items(p_structured->'agreed', 'R4 합의');
  end if;
  for d in select * from jsonb_array_elements(coalesce(p_structured->'disputes','[]'::jsonb)) loop
    if coalesce(trim(d->>'area'),'') = '' then raise exception 'SUMMIT: 쟁점에 area 가 없다'; end if;
    if jsonb_typeof(d->'claude') <> 'object' or jsonb_typeof(d->'suyeon') <> 'object' then
      raise exception 'SUMMIT: 쟁점 「%」 은 로버트안·수연안을 둘 다 적는다 — 한쪽만 있으면 쟁점이 아니다', d->>'area';
    end if;
    perform summit_check_items(jsonb_build_array((d->'claude') || jsonb_build_object('area', d->>'area')), '쟁점 로버트안');
    perform summit_check_items(jsonb_build_array((d->'suyeon') || jsonb_build_object('area', d->>'area')), '쟁점 수연안');
  end loop;
  insert into saju_summit_entries (summit_id, round, author, kind, content, structured)
  values (r.id, 4, 'claude', 'final', p_content, p_structured);
  return jsonb_build_object('phase', r.phase, 'disputes', jsonb_array_length(coalesce(p_structured->'disputes','[]'::jsonb)));
end $$;

-- R4 — 수연 서명. 🔒 가장 최근 최종안에 대해서만 1회
create or replace function public.summit_sign(p_year int, p_decision text, p_reason text default null, p_dry boolean default false)
returns jsonb language plpgsql set search_path to 'public' as $$
declare r saju_summits := summit_row(p_year, p_dry);
begin
  if p_decision not in ('동의','이의') then raise exception 'SUMMIT: 서명은 동의 또는 이의다 (받은 값: %)', p_decision; end if;
  if p_decision = '이의' and coalesce(trim(p_reason),'') = '' then raise exception 'SUMMIT: 이의에는 사유를 적는다'; end if;
  if not exists (select 1 from saju_summit_entries where summit_id = r.id and kind = 'final') then
    raise exception 'SUMMIT: 서명할 최종안이 없다';
  end if;
  begin
    insert into saju_summit_entries (summit_id, round, author, kind, content, structured)
    values (r.id, 4, 'suyeon', 'sign', coalesce(p_reason, p_decision), jsonb_build_object('decision', p_decision));
  exception when unique_violation then
    raise exception 'SUMMIT: 수연은 이미 서명했다 — 서명은 잠금이다';
  end;
  return jsonb_build_object('signed', p_decision);
end $$;

-- ── 6. 로한만 (앱에서 로그인한 계정 = auth.uid() 가 있을 때)
create or replace function public.summit_require_rohan() returns void
language plpgsql stable set search_path to 'public' as $$
begin
  if auth.uid() is null then
    raise exception 'SUMMIT: 이 일은 로한만 한다 — 앱에서 로그인한 계정으로만 된다';
  end if;
end $$;

-- 결석·미응답으로 다음 라운드로 넘긴다(§7). 🔒 「반론 없음 = 동의」로 치지 않는다 — 미응답으로 남는다
create or replace function public.summit_advance(p_year int, p_dry boolean default false)
returns jsonb language plpgsql set search_path to 'public' as $$
declare r saju_summits := summit_row(p_year, p_dry); n int; k text; miss jsonb := '[]'::jsonb; a text;
begin
  perform summit_require_rohan();
  n := summit_phase_no(r.phase);
  if n not between 1 and 3 then raise exception 'SUMMIT: 지금(%)은 넘길 라운드가 아니다', r.phase; end if;
  k := summit_kind(n);
  foreach a in array array['claude','suyeon'] loop
    if not exists (select 1 from saju_summit_entries where summit_id = r.id and round = n and author = a and kind = k) then
      miss := miss || jsonb_build_object('round', n, 'author', a, 'at', now());
    end if;
  end loop;
  update saju_summits set phase = case n when 1 then 'r2' when 2 then 'r3' else 'r4' end,
         skipped = skipped || miss where id = r.id;
  r := summit_row(p_year, p_dry);
  return jsonb_build_object('phase', r.phase, 'skipped', miss);
end $$;

-- 결재 — 🔒 쟁점을 전부 골라야 된다(§8 ② 「둘 다 유지」 기본값은 없다)
create or replace function public.summit_approve(p_year int, p_choices jsonb, p_dry boolean default false)
returns jsonb language plpgsql set search_path to 'public' as $$
declare r saju_summits := summit_row(p_year, p_dry); fin saju_summit_entries; d jsonb; pick text;
        known text; items jsonb := '[]'::jsonb; e saju_summit_entries; pub jsonb := '[]'::jsonb; res jsonb;
begin
  perform summit_require_rohan();
  if r.phase <> 'r4' then raise exception 'SUMMIT: 결재는 R4 에서만 한다 (지금 %)', r.phase; end if;
  select * into fin from saju_summit_entries where summit_id = r.id and kind = 'final' order by submitted_at desc limit 1;
  if fin.id is null then raise exception 'SUMMIT: 결재할 최종안이 없다'; end if;
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
    -- 🔒 R1 원본 둘 + 최종안 하나, 셋 다 잠근다(§1) — 연말에 「토론이 정확도를 올렸나」를 잰다
    for e in select * from saju_summit_entries where summit_id = r.id and round = 1 and kind = 'analysis' order by author loop
      res := saju_summit_publish(r.year, e.author, '[R1 원본 · '||e.author||'] '||e.content, known,
               jsonb_build_object('summit', jsonb_build_object('year', r.year, 'round', 1, 'entry', e.id)) || coalesce(e.structured,'{}'::jsonb));
      pub := pub || res;
    end loop;
    res := saju_summit_publish(r.year, 'consensus', fin.content, known,
             jsonb_build_object('summit', jsonb_build_object('year', r.year, 'round', 4, 'entry', fin.id, 'choices', p_choices),
                                'areas', items));
    pub := pub || res;
  end if;
  return jsonb_build_object('approved', true, 'dry', r.dry, 'published', pub);
end $$;

create or replace function public.saju_summit_publish(p_year int, p_author text, p_content text, p_known text, p_structured jsonb)
returns jsonb language plpgsql set search_path to 'public' as $$
declare v_uid uuid := saju_uid(); v_start date := make_date(p_year,1,1); v_ver int; v_id uuid;
begin
  select coalesce(max(version),0)+1 into v_ver from saju_forecasts
   where user_id = v_uid and period_type = 'year' and target_start = v_start;
  insert into saju_forecasts (user_id, period_type, target_start, target_end, author, version, content, known, structured, status, model)
  values (v_uid, 'year', v_start, make_date(p_year,12,31), p_author, v_ver, p_content, p_known, p_structured, 'locked', 'summit')
  returning id into v_id;
  return (select jsonb_build_object('id', id, 'author', author, 'version', version, 'timing', timing,
                                    'timing_trust', timing_trust, 'locked_at', locked_at)
            from saju_forecasts where id = v_id);
end $$;

-- ── 7. 읽기 — 🔒 블라인드는 여기서 지킨다(§4-2)
--    한 라운드는 **둘 다 냈거나** 그 라운드가 지나갔을 때(결석 처리) 열린다.
--    그 전엔 자기 것만 보이고, 상대 것은 「제출됨 · 비공개」 한 줄 — 글자 수·영역 수도 안 준다.
--    로한(rohan)도 열리기 전엔 둘 다 못 본다 — 한쪽에 힌트를 주는 일을 막는다.
create or replace function public.summit_read(p_year int, p_member text, p_dry boolean default false)
returns jsonb language plpgsql stable set search_path to 'public' as $$
declare r saju_summits := summit_row(p_year, p_dry); ph int := summit_phase_no(r.phase);
        rounds jsonb := '[]'::jsonb; rd int; k text; a text; e saju_summit_entries; isopen boolean; cell jsonb; rw jsonb;
begin
  if p_member not in ('claude','suyeon','rohan') then raise exception 'SUMMIT: member 는 claude·suyeon·rohan 이다'; end if;
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
        cell := jsonb_build_object('submitted', true, 'sealed', true);         -- 🔒 시각조차 안 준다
      end if;
      rw := rw || jsonb_build_object(a, cell);
    end loop;
    rounds := rounds || rw;
  end loop;
  return jsonb_build_object(
    'summit', jsonb_build_object('year', r.year, 'dry', r.dry, 'phase', r.phase, 'frozen_at', r.dossier_frozen_at,
                                 'approved_at', r.approved_at, 'choices', r.choices, 'skipped', r.skipped),
    'dossier', r.dossier,
    'ganji', jsonb_build_object('year', saju_year_ganji(r.year),
                                'months', (select jsonb_agg(jsonb_build_object('n', n, 'branch', branch, 'ganji', ganji) order by n)
                                             from saju_month_ganji(r.year))),
    'rounds', rounds,
    'finals', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'submitted_at', submitted_at, 'content', content,
                                                            'structured', structured) order by submitted_at)
                          from saju_summit_entries where summit_id = r.id and kind = 'final'), '[]'::jsonb),
    'sign', (select jsonb_build_object('decision', structured->>'decision', 'reason', content, 'submitted_at', submitted_at)
               from saju_summit_entries where summit_id = r.id and kind = 'sign'));
end $$;

-- 내 차례 (§5-2)
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
      when s.phase = 'r4' and p_member = 'suyeon' then 'R4 서명(summit_sign)'
      else '끝' end,
    case
      when s.phase in ('r1','r2','r3') then exists (select 1 from saju_summit_entries x where x.summit_id = s.id
             and x.round = summit_phase_no(s.phase) and x.author = p_member and x.kind = summit_kind(summit_phase_no(s.phase)))
      when s.phase = 'r4' and p_member = 'claude' then exists (select 1 from saju_summit_entries x where x.summit_id = s.id and x.kind = 'final')
      when s.phase = 'r4' and p_member = 'suyeon' then exists (select 1 from saju_summit_entries x where x.summit_id = s.id and x.kind = 'sign')
      else true end
  from saju_summits s where s.user_id = saju_uid() and s.phase <> 'done'
  order by s.dry, s.year;
end $$;
