-- 🎱 당구 연습장 v3.4 — 🧑‍🏫 당구 칠판(kind = 'chalk')
--    공 4개(놓기/빼기) · 선 · 점 · 펜(S펜) · 글씨 · 지우개 — 판정 없는 기록용 칠판
--    📸 보관하기는 bb_attempts(kind = 'chalk', sim 에 그림)에 한 줄 — bb_attempts.kind 는 제약이 없어 그대로
--    🔒 앱(billiards/ v3.4.0)보다 먼저 적용해야 한다 — 없으면 칠판 판 만들기가 실패한다
alter table public.bb_boards drop constraint if exists bb_boards_kind_check;
alter table public.bb_boards add constraint bb_boards_kind_check check (kind in ('free','sep','cush','bank','chalk'));
