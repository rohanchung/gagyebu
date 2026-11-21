-- 2026-09-26 · 아버지 당구 연습장(billiards) 계정을 같은 프로젝트에 들이기 전에 문을 잠근다.
--
-- 🔎 발견 ①: v_snapshot · v_now 뷰가 anon(로그인 안 한 사람)에게 SELECT 를 포함한 전권으로 열려 있었다.
--    뷰는 기본이 security definer(소유자=postgres) 라 app_state 의 RLS 를 건너뛴다.
--    공개키는 GitHub Pages 의 index.html 에 있으므로 → 누구나 가계부 스냅샷(거래 제외)을 읽을 수 있었다.
--    앱은 이 뷰를 안 쓴다. 스킬(load-my-finance-health 등)은 MCP=postgres 로 읽으니 영향 없다.
-- 🔎 발견 ②: handoffs · health_settings 의 읽기 정책이 `true`(authenticated) — 계정이 로한 1명일 땐
--    무해했지만, 아버지 계정이 생기는 순간 아버지도 핸드오프(재정·건강 메모)를 읽는다.
--
-- 🔒 로한 uid 로 좁힌다. 새 계정이 생겨도 기본은 "못 본다" 가 되게(허용 목록 방식).

-- ① 뷰: anon · authenticated 권한 회수 + 혹시 다시 열려도 RLS 를 타도록 security_invoker
revoke all on public.v_snapshot from anon, authenticated;
revoke all on public.v_now      from anon, authenticated;
alter view public.v_snapshot set (security_invoker = true);
alter view public.v_now      set (security_invoker = true);

-- ② handoffs · health_settings: 로한만 읽는다
drop policy if exists read_handoffs on public.handoffs;
create policy read_handoffs on public.handoffs
  for select to authenticated
  using (auth.uid() = '1f3a300f-9189-47c0-b750-cca6efc9dd1f'::uuid);

drop policy if exists read_settings on public.health_settings;
create policy read_settings on public.health_settings
  for select to authenticated
  using (auth.uid() = '1f3a300f-9189-47c0-b750-cca6efc9dd1f'::uuid);
