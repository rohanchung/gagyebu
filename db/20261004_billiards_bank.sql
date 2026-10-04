-- 🎱 당구 연습장 v3.3 — 🎯 쿠션 지점 판(kind = 'bank')
--    🎯 지점 찍기 · ✖ X법 작도 — 흰 공 + 빨간 공(1~2개), 흰 공이 맞을 쿠션 지점을 고른다
--    판 종류 제약에 'bank' 를 더한다. bb_attempts.kind 는 제약이 없어 그대로 둔다(판정 기록은 sim jsonb 에)
--    🔒 앱(billiards/ v3.3.0)보다 먼저 적용해야 한다 — 없으면 새 판 만들기가 실패한다
alter table public.bb_boards drop constraint if exists bb_boards_kind_check;
alter table public.bb_boards add constraint bb_boards_kind_check check (kind in ('free','sep','cush','bank'));
