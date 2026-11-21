-- 🏛 자료팩 known 칸 이름 계약 (제작방 · 2026-10-27 · 로한북 v4.66) — 적용됨
-- 🔴 결재는 dossier.known 만 읽었는데 사주방은 known_2027 에 넣었다 → 그대로 결재하면 예측표 known 이 「없음」으로 잠겨
--    이미 아는 일정이 적중으로 세어질 뻔했다(실전 2027 대회 R0, 자료팩 7칸 적재 상태에서 발견).
-- 🔒 「잠길 known」은 summit_known 하나가 답한다 — 이름이 known 으로 시작하는 칸 전부(데이터는 안 옮긴다).
--    결재(summit_approve)와 앱 미리보기(summit_read.known_text)가 같은 함수를 쓴다.
create or replace function public.summit_known(d jsonb) returns text
language sql immutable set search_path to 'public' as $$
  select coalesce(nullif(string_agg('['||k||'] '||v, E'\n\n' order by k), ''), '없음')
    from (select key k, case jsonb_typeof(value) when 'string' then value #>> '{}' else value::text end v
            from jsonb_each(coalesce(d,'{}'::jsonb)) where key ~* '^known') x
   where coalesce(trim(v),'') <> ''
$$;
-- 검산: 실전 2027 → 1,693자 · {} → 없음 · {known:' ',note} → 없음 · {known:A,known_2027:B} → [known] A / [known_2027] B

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
    known := summit_known(r.dossier);
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
    'known_text', summit_known(r.dossier),
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

