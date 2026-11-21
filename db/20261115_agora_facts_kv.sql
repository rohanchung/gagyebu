-- 2026-11-15 · agora_facts 가 app_kv 를 읽는다 (적용됨 · migration agora_facts_read_kv)
-- 왜: 아고라 재료 숫자가 옛 덩어리(app_state.data)를 읽고 있었다. 이중 쓰기(~11/20)가 끝나면 숫자가 멈추고
--     월말평가가 멈춘 숫자로 쓰인다. 키별 행을 덩어리 모양으로 다시 엮는 kv_join(uid) 를 읽게 한 줄만 바꾼다.
-- 검증: 바꾸기 전후 agora_facts 출력 md5 가 2026-09 full · 10 mid · 10 full · 11 mid 넷 다 같다.
--       (app_state 와 kv_join 의 차이는 기기 상태 `ui` 하나 — facts 는 ui 를 안 본다)
-- 남은 app_state 의존: kv_to_blob · kv_verify(이중 쓰기 장치 — 끝낼 때 같이 걷는다) · rb_call/kv_verify 의 user_id 조회(행만 있으면 된다)
do $do$
declare d text; o text := $q$d as (select data from public.app_state where user_id = public.agora_uid() limit 1)$q$;
begin
  select pg_get_functiondef('public.agora_facts(text,text)'::regprocedure) into d;
  if strpos(d, o) = 0 then raise exception 'agora_facts 본문에서 자리를 못 찾았다'; end if;
  d := replace(d, o, $q$d as (select public.kv_join(public.agora_uid()) as data /* v5 P3 — app_kv(키별 행)를 읽는다. app_state 이중 쓰기(~11/20)가 끝나도 숫자가 멈추지 않게 */)$q$);
  execute d;
end
$do$;
