-- 🏆 v5.13 — 견문록 「복고티」(chronicle-goty-spec · 핸드오프 id 63)
-- life/seen 에 칸 둘: hours(null|숫자 ≥ 0) · goty(null|{year:4자리, won:bool, board:'game'|'contents'})
-- 🔒 앞의 검사는 그대로 두고 두 칸 범위만 더한다(20261116_life_kids_recorder.sql 과 같은 함수)
-- ⚠ 「한 해 한 판에 won=true 는 하나까지」는 레코드 하나만 보는 이 함수로는 못 잰다 — 앱(lfSave)이 막고,
--    기록사는 넣은 뒤 대조표로 확인한다(핸드오프 회신에 적었다)

create or replace function public.kv_validate(k text, r jsonb)
 returns text language sql immutable set search_path to 'public'
as $$
  select case
    when jsonb_typeof(r) <> 'object' then '레코드는 객체여야 한다'
    when k = 'transactions' and not (r->>'type' in ('expense','income','transfer','settle')) then 'type 은 expense·income·transfer·settle'
    when k = 'transactions' and jsonb_typeof(r->'amt') <> 'number' then 'amt 는 숫자'
    when k = 'transactions' and coalesce(r->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then 'date 는 YYYY-MM-DD'
    when k = 'life/timeline' and coalesce(r->>'date','') !~ '^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$' then '연표 date 는 아는 만큼만 — YYYY · YYYY-MM · YYYY-MM-DD (월·일을 지어내지 않는다)'
    when k in ('life/timeline','life/bucket','life/seen') and coalesce(btrim(r->>'title'),'') = '' then 'title(제목)이 필요하다'
    when k = 'life/bucket' and r ? 'pri' and jsonb_typeof(r->'pri') <> 'null' and not (r->>'pri' in ('S','A','B','C')) then 'pri 는 S·A·B·C·null'
    when k = 'life/seen' and r ? 'grade' and jsonb_typeof(r->'grade') <> 'null' and not (r->>'grade' in ('S','A','B','C','D')) then 'grade 는 S·A·B·C·D·null'
    when k = 'life/seen' and coalesce(r->>'date','') <> '' and r->>'date' !~ '^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$' then '견문록 date 는 YYYY · YYYY-MM · YYYY-MM-DD'
    when k = 'life/seen' and r ? 'hours' and jsonb_typeof(r->'hours') <> 'null'
         and not (jsonb_typeof(r->'hours') = 'number' and (r->>'hours')::numeric >= 0) then 'hours 는 0 이상의 숫자·null (원문에 있을 때만)'
    when k = 'life/seen' and r ? 'goty' and jsonb_typeof(r->'goty') <> 'null'
         and not (jsonb_typeof(r->'goty') = 'object'
                  and jsonb_typeof(r->'goty'->'year') = 'number' and (r->'goty'->>'year') ~ '^\d{4}$'
                  and jsonb_typeof(r->'goty'->'won') = 'boolean'
                  and (r->'goty'->>'board') in ('game','contents')) then 'goty 는 {year:4자리 숫자, won:true|false, board:game|contents} · null'
    when k = 'journal' and r ? 'kind' and not (r->>'kind' in ('meet','review')) then 'journal kind 는 meet·review (일기는 칸을 두지 않는다)'
    else null end $$;

revoke execute on function public.kv_validate(text, jsonb) from public, anon;
