-- 🔒 v4.13 — app_state 가 바뀌면 updated_at 을 DB 가 올린다 (2026-09-19 적용 · 로버트)
-- 🔴 사고 4회(9/15·9/16 words 96건씩, 9/16 sents 19건, 9/18 sents 10건). 실측 원인(pg_stat_statements):
--    학습방·생활방이 MCP 로 `update app_state set data = jsonb_set(…)` 를 쓰면서 updated_at 을 안 바꿨다(39회+3회+1회).
--    앱의 낙관적 잠금(update … where updated_at = 마지막으로 본 값)은 통과했고, 열려 있던 앱이 옛 데이터로 통째로 덮었다.
--    앱의 흡수 장치는 '충돌이 감지돼야' 돌았는데 감지 자체가 안 됐다.
-- 🔒 쓰는 쪽이 기억해야 하는 규칙을 없앤다 — 누가 어떤 SQL 로 쓰든 data 가 바뀌면 updated_at 이 오른다.
--    앱 자신의 저장은 항상 새 updated_at 을 같이 주므로 영향이 없다. 롤백 검증 3건.
-- 짝: index.html v4.13 3자 병합(mrg3) — 감지된 충돌을 '덮어쓰기'가 아니라 병합으로 처리한다.
create or replace function public.app_state_bump() returns trigger language plpgsql set search_path = public as $$
begin
  if new.data is distinct from old.data and new.updated_at is not distinct from old.updated_at then
    new.updated_at := clock_timestamp();
  end if;
  return new;
end $$;
drop trigger if exists app_state_bump on public.app_state;
create trigger app_state_bump before update on public.app_state for each row execute function public.app_state_bump();
