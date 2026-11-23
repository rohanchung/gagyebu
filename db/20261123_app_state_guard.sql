-- 🔒 2026-11-23 · 핸드오프 id 68 — 담당방이 app_state 에 직접 쓰면 조용히 사라진다(11/21 사고 뒤 blob_to_kv 를 꺼서)
--   11/22 순환기방이 app_state.health.events 를 직접 고쳤는데 앱(app_kv)에 닿지 않았다 → 제작사가 건짐.
--   이제 SQL 로 app_state 를 직접 쓰면 **거절하고 rb_call 을 안내한다.**
--   통과: 앱(authenticator) · kv_to_blob 같은 트리거 안 동기화(pg_trigger_depth() > 1)
create or replace function public.app_state_room_guard() returns trigger
 language plpgsql
 set search_path to 'public'
as $$
begin
  if session_user = 'authenticator' or pg_trigger_depth() > 1 then return new; end if;
  raise exception 'app_state 에 직접 쓰지 않는다 — 앱에 닿지 않고 사라진다(2026-11-21 부터). rb_call 을 쓴다: select rb_call(''네 actor'',''rec_edit'',''{"key":"health/rest","path":["events"],"id":"…","patch":{…},"why":"…"}''::jsonb) · 동사: rec_add · rec_edit · rec_remove(path 로 칸 안쪽 배열) · map_put · map_del · kv_put';
end $$;
revoke execute on function public.app_state_room_guard() from public, anon;
drop trigger if exists app_state_room_guard on public.app_state;
create trigger app_state_room_guard before insert or update on public.app_state
  for each row execute function public.app_state_room_guard();
