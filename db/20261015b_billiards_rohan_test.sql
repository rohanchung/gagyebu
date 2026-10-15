-- 🎱 당구 연습장 v3.7.1 — 로한 계정도 당구 연습장에 들어간다(시험용)
--    로한: "아버지 계정은 로한북에 못 들어가는 게 맞는데, 내 계정은 당구장에 들어갈 수 있어야 테스트한다"
--    · 당구 표식(app_metadata.app='billiards') 계정 **또는** 로한 uid 면 자기 행(user_id = 본인)에 접근
--    · 여전히 '본인 행만' — 로한은 로한이 만든 판·기록만 보고, 아버지 판·기록은 보이지 않는다(서로 안 섞임)
--    · 로한북 테이블 쪽 잠금(아버지 계정 차단)은 그대로
create or replace function public.bb_is_me(uid uuid) returns boolean
  language sql stable set search_path = '' as $$
  select uid = auth.uid() and (
    coalesce(auth.jwt()->'app_metadata'->>'app','') = 'billiards'
    or auth.uid() = '1f3a300f-9189-47c0-b750-cca6efc9dd1f'::uuid)
$$;
