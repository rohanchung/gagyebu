-- 🏵️ v5.09 — 연대기(life)를 레코드 단위로 쓰게 하고, 기록사에게 쓰기 창구를 연다
-- 로한 11/16: 「새로 생긴 기록사가 기록할 수 있게 해줘」 (notion-import-spec id 52 회신의 서버 변경 두 가지 승인)
-- ① kv_kids('life') = timeline·bucket·creed·seen → app_kv 행이 life/timeline … life/rest 로 나뉜다 → rb_call rec_add/rec_edit/rec_remove 가 된다
--    🔒 앱 KV_KIDS 와 같아야 한다(index.html 에서 같이 바꾼다)
-- ② actor 「기록사」 — scopes life/* · journal · meals
-- ③ kv_validate — 연표 날짜는 아는 만큼만(YYYY | YYYY-MM | YYYY-MM-DD) · 서약·견문록은 제목 필수

create or replace function public.kv_kids(p text)
 returns text[] language sql immutable set search_path to 'public'
as $$
  select case p
    when 'study' then array['words','sents','units','drills','errors','pomos','tests','strategy']
    when 'health' then array['labValues','metrics','weights']
    when 'insurance' then array['covers','policies']
    when 'saju' then array['readings']
    when 'life' then array['timeline','bucket','creed','seen']
    else null end $$;

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
    when k = 'journal' and r ? 'kind' and not (r->>'kind' in ('meet','review')) then 'journal kind 는 meet·review (일기는 칸을 두지 않는다)'
    else null end $$;

-- 지금 있는 life 한 행을 나눈다(11/16 기준 빈 껍데기 88자)
do $$
declare r record;
begin
  perform set_config('app.actor','제작사',true);
  perform set_config('app.why','v5.09 life 를 레코드 행으로 나눔',true);
  for r in select user_id, data, updated_by from app_kv where key = 'life' and jsonb_typeof(data) = 'object' loop
    insert into app_kv(user_id,key,data,rev,updated_at,updated_by)
      select r.user_id, s.key, s.val, 1, now(), '제작사' from kv_split(jsonb_build_object('life', r.data)) s
    on conflict (user_id,key) do update set data = excluded.data, rev = app_kv.rev + 1, updated_at = now(), updated_by = excluded.updated_by;
    delete from app_kv where user_id = r.user_id and key = 'life';
  end loop;
end $$;

insert into actors(name, scopes, active, note)
values ('기록사', array['life/*','journal','meals'], true, '노션 가져오기 · 연대기/일지/식단 체크 — 2026-11-16 로한 승인')
on conflict (name) do update set scopes = excluded.scopes, active = true, note = excluded.note;

revoke execute on function public.kv_kids(text) from public, anon;
revoke execute on function public.kv_validate(text, jsonb) from public, anon;
