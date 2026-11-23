-- 🩺 2026-11-23 · 핸드오프 id 68 (순환기방) — 칸 안쪽 배열도 레코드 한 건씩 고친다
--   순환기방: 「health.events 에 추가는 되는데 수정이 막힌다」 — app_state 를 jsonb_agg+CASE 로 통째 재구성하던 탓.
--   rec_add · rec_edit · rec_remove 에 args.path(문자열 배열)를 받는다.
--     예) {"key":"health/rest","path":["events"],"id":"xchk1114","patch":{"status":"완료"}}
--         {"key":"healthPeople","path":["mom","events"],"rec":{...}}
--   path 가 없으면 예전과 똑같다. 권한은 key 로만 본다(path 는 그 칸 안).
create or replace function public.rb_call(p_actor text, p_verb text, p_args jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare a record; k text := p_args->>'key'; uid uuid; d jsonb; r int; rec jsonb; rid text; idx int; cnt int;
  ids jsonb := '[]'::jsonb; err text; why text := p_args->>'why'; pt jsonb; sub text;
  pth text[]; root jsonb;
begin
  select * into a from actors where name = p_actor and active;
  if not found then raise exception 'rb_call: 모르는 actor «%»', p_actor; end if;
  if session_user in ('authenticator','anon') and p_actor <> 'rohan' then
    raise exception 'rb_call: 앱에서는 rohan 으로만 부를 수 있다'; end if;
  if k is null then raise exception 'rb_call: args.key 가 필요하다'; end if;
  if k ~* '^(agora|posts|post|review|notice)' then
    raise exception 'rb_call: 아고라는 rb_call 로 쓰지 않는다 — 아고라 함수를 바로 부른다. 중간평가: select agora_mid(''YYYY-MM'',''네 slug'',''총평'',''다른 영역'',''영주께'',''plain'') (인자 6개 · phase·내영역 없음) · 월말: agora_review(… 8개) · 공지 먼저: select agora_pending(''네 slug'')'; end if;
  if not kv_scope_ok(a.scopes, k) then raise exception 'rb_call: «%» 는 «%» 에 쓸 권한이 없다 (scopes %)', p_actor, k, a.scopes; end if;
  if p_args ? 'path' then
    if p_verb not in ('rec_add','rec_edit','rec_remove') then raise exception 'rb_call: path 는 rec_add · rec_edit · rec_remove 에만 쓴다'; end if;
    if jsonb_typeof(p_args->'path') <> 'array' or jsonb_array_length(p_args->'path') not between 1 and 4
       or exists (select 1 from jsonb_array_elements(p_args->'path') x where jsonb_typeof(x) <> 'string' or x#>>'{}' = '') then
      raise exception 'rb_call: path 는 1~4개짜리 문자열 배열 (예: ["events"] · ["mom","events"])'; end if;
    select array_agg(x order by o) into pth from jsonb_array_elements_text(p_args->'path') with ordinality t(x,o);
  end if;
  uid := coalesce(auth.uid(), (select user_id from app_state limit 1));
  perform set_config('app.actor', p_actor, true);
  perform set_config('app.verb', p_verb, true);
  perform set_config('app.why', coalesce(why,'') || case when pth is not null then ' [' || array_to_string(pth,'.') || ']' else '' end, true);

  select data, rev into d, r from app_kv where user_id = uid and key = k for update;
  if not found then
    if pth is not null then raise exception 'rb_call: 키 «%» 가 없다(path 를 쓰려면 칸이 먼저 있어야 한다)', k; end if;
    if p_verb in ('rec_add') then d := '[]'::jsonb; r := 0;
    elsif p_verb in ('map_put','kv_put') then d := case when p_verb='kv_put' then null else '{}'::jsonb end; r := 0;
    else raise exception 'rb_call: 키 «%» 가 없다', k; end if;
  end if;

  /* 칸 안쪽 배열로 내려간다 — 끝에서 제자리에 돌려 넣는다 */
  if pth is not null then
    if jsonb_typeof(d) <> 'object' then raise exception 'rb_call: path 는 객체 칸 안에서만 — «%» 는 객체가 아니다', k; end if;
    root := d; d := root #> pth;
    if d is null and p_verb = 'rec_add' then d := '[]'::jsonb; end if;
    if d is null then raise exception 'rb_call: «%» 에 «%» 가 없다', k, array_to_string(pth,'.'); end if;
  end if;

  if p_verb = 'rec_add' then
    if jsonb_typeof(d) <> 'array' then raise exception 'rb_call: «%» 는 레코드 배열이 아니다', k || coalesce(' ' || array_to_string(pth,'.'), ''); end if;
    for rec in select * from jsonb_array_elements(case when p_args ? 'recs' then p_args->'recs' else jsonb_build_array(p_args->'rec') end) loop
      if rec is null or jsonb_typeof(rec) = 'null' then raise exception 'rb_call: rec 가 비었다'; end if;
      if not rec ? 'id' then rec := rec || jsonb_build_object('id', 'x'||substr(md5(random()::text||clock_timestamp()::text),1,8)); end if;
      if pth is null then err := kv_validate(k, rec); if err is not null then raise exception 'rb_call: %', err; end if; end if;
      if exists (select 1 from jsonb_array_elements(d) x where x->>'id' = rec->>'id') then
        raise exception 'rb_call: id «%» 가 이미 있다', rec->>'id'; end if;
      d := d || jsonb_build_array(rec); ids := ids || to_jsonb(rec->>'id');
    end loop;

  elsif p_verb in ('rec_edit','rec_remove') then
    rid := p_args->>'id';
    if jsonb_typeof(d) <> 'array' then raise exception 'rb_call: «%» 는 레코드 배열이 아니다', k || coalesce(' ' || array_to_string(pth,'.'), ''); end if;
    select count(*), min(o)::int - 1 into cnt, idx from jsonb_array_elements(d) with ordinality e(x,o) where x->>'id' = rid;
    if cnt = 0 then raise exception 'rb_call: id «%» 가 없다', rid; end if;
    if cnt > 1 then raise exception 'rb_call: id «%» 가 %건 — 중복부터 정리하라', rid, cnt; end if;
    if p_verb = 'rec_remove' then
      if coalesce(why,'') = '' then raise exception 'rb_call: rec_remove 는 why(이유)가 필요하다'; end if;
      d := d - idx;
    else
      pt := p_args->'patch';
      if jsonb_typeof(pt) <> 'object' then raise exception 'rb_call: patch 는 객체'; end if;
      if pt ? 'id' and pt->>'id' <> rid then raise exception 'rb_call: id 는 바꿀 수 없다'; end if;
      rec := (d->idx) || pt;
      rec := rec - coalesce((select array_agg(x.key) from jsonb_each(pt) x where jsonb_typeof(x.value)='null'), '{}'::text[]);
      if pth is null then err := kv_validate(k, rec); if err is not null then raise exception 'rb_call: %', err; end if; end if;
      d := jsonb_set(d, array[idx::text], rec);
    end if;
    ids := jsonb_build_array(rid);

  elsif p_verb in ('map_put','map_del') then
    sub := p_args->>'sub';
    if sub is null then raise exception 'rb_call: args.sub 가 필요하다'; end if;
    if jsonb_typeof(d) <> 'object' then raise exception 'rb_call: «%» 는 객체가 아니다', k; end if;
    if p_verb = 'map_del' then
      if coalesce(why,'') = '' then raise exception 'rb_call: map_del 은 why 가 필요하다'; end if;
      d := d - sub;
    else d := d || jsonb_build_object(sub, p_args->'value'); end if;
    ids := jsonb_build_array(sub);

  elsif p_verb = 'kv_put' then
    if coalesce(why,'') = '' then raise exception 'rb_call: kv_put(통째 교체)은 why 가 필요하다'; end if;
    if d is not null and jsonb_typeof(d) = 'array' and kv_idarr(d) then
      raise exception 'rb_call: 레코드 배열 «%» 은 통째로 바꾸지 않는다 — rec_add/rec_edit/rec_remove 를 써라', k; end if;
    d := p_args->'data';

  else
    raise exception 'rb_call: 모르는 동사 «%» (rec_add · rec_edit · rec_remove · map_put · map_del · kv_put)', p_verb;
  end if;

  if pth is not null then d := jsonb_set(root, pth, d, true); end if;

  insert into app_kv(user_id, key, data, rev, updated_at, updated_by) values (uid, k, d, 1, now(), p_actor)
  on conflict (user_id, key) do update set data = excluded.data, rev = app_kv.rev + 1, updated_at = now(), updated_by = excluded.updated_by
  returning rev into r;
  return jsonb_build_object('ok', true, 'key', k, 'rev', r, 'ids', ids);
end $function$;

revoke execute on function public.rb_call(text, text, jsonb) from public, anon;
