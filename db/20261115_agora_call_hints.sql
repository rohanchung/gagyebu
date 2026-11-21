-- 2026-11-15 · 아고라 호출 안내 (적용됨 · migration agora_call_hints)
-- 생활사가 11월 중간평가를 rb_call(key 'posts')로 쓰려다 「권한 없음」, 이어 agora_mid 에 인자 7개를 넣어 「함수 없음」을 받았다.
-- 권한 문제가 아니라 호출 길을 잘못 든 것 — 두 오류가 맞는 호출을 직접 말하게 한다.

-- ① rb_call: 아고라 같은 키(agora·posts·review·notice)면 권한 오류 대신 아고라 함수를 안내한다
do $do$
declare d text; o text; n text;
begin
  select pg_get_functiondef('public.rb_call(text,text,jsonb)'::regprocedure) into d;
  o := $q$  if not kv_scope_ok(a.scopes, k) then$q$;
  n := $q$  if k ~* '^(agora|posts|post|review|notice)' then
    raise exception 'rb_call: 아고라는 rb_call 로 쓰지 않는다 — 아고라 함수를 바로 부른다. 중간평가: select agora_mid(''YYYY-MM'',''네 slug'',''총평'',''다른 영역'',''영주께'',''plain'') (인자 6개 · phase·내영역 없음) · 월말: agora_review(… 8개) · 공지 먼저: select agora_pending(''네 slug'')'; end if;
  if not kv_scope_ok(a.scopes, k) then$q$;
  if strpos(d, o) = 0 then raise exception 'rb_call 본문에서 자리를 못 찾았다'; end if;
  d := replace(d, o, n);
  execute d;
end
$do$;

-- ② agora_mid 인자 7개(phase 나 내영역을 끼운 것) → 「함수 없음」 대신 6개 호출법을 말한다. 아무것도 쓰지 않는다
create or replace function public.agora_mid(p_ym text, p_member text, p_summary text, p_a text, p_b text, p_c text, p_tone text)
returns jsonb language plpgsql as $f$
begin
  raise exception 'AGORA: agora_mid 는 인자 6개다 — (ym, slug, 총평, 다른 영역, 영주께, 어조). 중간평가엔 「내 담당 영역」도 phase 도 넣지 않는다. 예: select agora_mid(''%'',''%'',''총평'',''다른 영역에 하는 말'',''영주께 청하는 것'',''plain'')', p_ym, p_member;
end $f$;
grant execute on function public.agora_mid(text,text,text,text,text,text,text) to authenticated, service_role;
-- 🔒 새 함수는 PUBLIC 실행이 기본이다 — 6인자 agora_mid 와 같은 권한으로 맞춘다(migration agora_mid7_revoke_public)
revoke execute on function public.agora_mid(text,text,text,text,text,text,text) from public, anon;
