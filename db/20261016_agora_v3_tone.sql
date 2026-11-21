-- 🏛 아고라 v3 ① — 🛡 관직명(title) · 😠 어조(tone)
-- 설계 정본: agora-design.md §15.1 · §15.9 · §15.11
--
-- 로한: "캐릭터가 감정 표현하는거야. 나한테 화날 땐 화도 내고 칭찬할 땐 칭찬하고 엄중할 땐 엄중하고"
--       "말투도 주군에게 보고하는 형태로 공손하게. 나는 왕은 아니고 영주 정도인거야"
--
-- 🔒 이 파일이 강제하는 것
--   ① 어조는 **방이 선언한다.** 글에서 추론하지 않는다 — 틀린 표정은 틀린 숫자와 같다(원칙 25)
--   ② 기본은 'plain'(담담히) — 선언 안 하면 꾸미지 않는다(빈 서랍 금지)
--   ③ 'angry'(분노)를 두지 않는다. 가신은 성내지 않고 **엄중할** 뿐이다(원칙 26)
--   ④ 관직명은 **명단 테이블**에 둔다 — 화면에 박으면 명단과 어긋난다(§4)
--
-- ⚠️ tone 은 **언제나 마지막 인자**다(phase 와 같은 이유). 중간에 끼우면 기존 호출이 깨진다.
-- ⚠️ 시그니처가 바뀌는 함수는 drop 후 재생성한다 — grant 가 사라지므로 끝에서 다시 준다.

begin;

-- ══════════ 1. 🛡 관직명 ══════════
alter table public.agora_members
  add column if not exists title text not null default '';

update public.agora_members set title = v.t from (values
  ('robert-life' ,'생활사'),
  ('robert-study','학습사'),
  ('robert-saju' ,'사주사'),
  ('suyeon'      ,'수연'),
  ('maker'       ,'제작사'),
  ('cardio'      ,'의사(순환기)'),
  ('rehab'       ,'의사(그외)')
) as v(s,t) where public.agora_members.slug = v.s;

-- 🔒 빈 관직명은 화면에서 이름 없는 자리가 된다 — 채우지 않은 방이 있으면 막는다
do $blk$ declare n int;
begin
  select count(*) into n from public.agora_members where active and length(trim(title))=0;
  if n > 0 then raise exception '관직명이 빈 방이 %건 있다', n; end if;
end $blk$;

-- ══════════ 2. 😠 어조 ══════════
alter table public.agora_posts
  add column if not exists tone text not null default 'plain';
do $blk$ begin
  if not exists (select 1 from pg_constraint
                  where conrelid='public.agora_posts'::regclass and conname='agora_posts_tone') then
    -- 🔒 ③ angry 는 없다. 가신이 성내면 간언이 아니라 항의가 된다
    alter table public.agora_posts
      add constraint agora_posts_tone check (tone in ('plain','praise','worry','grave','plead'));
  end if;
end $blk$;

-- ══════════ 3. 중계 함수 ══════════
drop function if exists public.agora_review(text,text,text,text,text,text,text);
drop function if exists public.agora_mid(text,text,text,text,text);
drop function if exists public.agora_review_na(text,text,text,text);
drop function if exists public.agora_comment(text,text,text,uuid,text);

create or replace function public.agora_review(
  p_ym text, p_member text, p_summary text,
  p_own text default null, p_others text default null, p_ask text default null,
  p_phase text default 'full', p_tone text default 'plain')
returns jsonb language plpgsql set search_path = public as $fn$
declare u uuid := public.agora_uid(); v_id uuid;
begin
  if p_phase not in ('mid','full') then
    raise exception 'AGORA: phase 는 mid 또는 full 이다 (%)', p_phase; end if;
  if p_tone not in ('plain','praise','worry','grave','plead') then
    raise exception 'AGORA: 어조는 plain(담담히)·praise(기껍게)·worry(염려하여)·grave(엄중히)·plead(간곡히) 다. angry 는 없다 — 가신은 성내지 않고 엄중할 뿐이다 (%)', p_tone; end if;
  if p_summary is null or length(trim(p_summary)) = 0 then
    raise exception 'AGORA: 총평 한 줄은 있어야 한다 — 접었을 때 그것만 보인다'; end if;
  if p_phase = 'mid' and p_own is not null and length(trim(p_own)) > 0 then
    raise exception 'AGORA: 중간평가에는 「내 담당 영역」(결산)을 쓰지 않는다. 총평·다른영역·로한에게 세 칸이다 — 보름 만에 결산할 것은 많지 않고, 월말에 쓴다';
  end if;
  insert into public.agora_sessions (user_id, ym) values (u, p_ym)
    on conflict (user_id, ym) do nothing;
  insert into public.agora_posts (user_id, ym, phase, member, kind, status, summary, own, others, ask, tone)
  values (u, p_ym, p_phase, p_member, 'review', 'ok', p_summary,
          case when p_phase='mid' then null else p_own end, p_others, p_ask, p_tone)
  returning id into v_id;
  return jsonb_build_object('saved',true,'post_id',v_id,'ym',p_ym,'phase',p_phase,
    'member',p_member,'tone',p_tone,
    '다른영역', case when p_others is null or length(trim(p_others))=0
      then '비어 있다 — 담당 영역만 봤다고 표시된다. 아고라의 값어치는 다른 영역에 하는 말이다.'
      else '기록됐다' end,
    '다음', '이제 남의 평가가 열렸다: select agora_read('''||p_ym||''','''||p_member||''','''||p_phase||''')');
end $fn$;

create or replace function public.agora_mid(
  p_ym text, p_member text, p_summary text,
  p_others text default null, p_ask text default null, p_tone text default 'plain')
returns jsonb language plpgsql set search_path = public as $fn$
begin
  return public.agora_review(p_ym, p_member, p_summary, null, p_others, p_ask, 'mid', p_tone);
end $fn$;

create or replace function public.agora_review_na(
  p_ym text, p_member text, p_reason text,
  p_phase text default 'full', p_tone text default 'plain')
returns jsonb language plpgsql set search_path = public as $fn$
declare u uuid := public.agora_uid(); v_id uuid;
begin
  if p_phase not in ('mid','full') then
    raise exception 'AGORA: phase 는 mid 또는 full 이다 (%)', p_phase; end if;
  if p_tone not in ('plain','praise','worry','grave','plead') then
    raise exception 'AGORA: 어조가 목록에 없다 (%)', p_tone; end if;
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'AGORA: 왜 볼 게 없는지는 적어야 한다 — 그게 미제출과의 차이다'; end if;
  insert into public.agora_sessions (user_id, ym) values (u, p_ym)
    on conflict (user_id, ym) do nothing;
  insert into public.agora_posts (user_id, ym, phase, member, kind, status, content, tone)
  values (u, p_ym, p_phase, p_member, 'review', 'na', p_reason, p_tone)
  returning id into v_id;
  return jsonb_build_object('saved',true,'post_id',v_id,'status','na','phase',p_phase,'tone',p_tone);
end $fn$;

create or replace function public.agora_comment(
  p_ym text, p_member text, p_content text, p_parent uuid default null,
  p_phase text default 'full', p_tone text default 'plain')
returns jsonb language plpgsql set search_path = public as $fn$
declare u uuid := public.agora_uid(); v_id uuid;
begin
  if p_phase not in ('mid','full') then
    raise exception 'AGORA: phase 는 mid 또는 full 이다 (%)', p_phase; end if;
  if p_tone not in ('plain','praise','worry','grave','plead') then
    raise exception 'AGORA: 어조가 목록에 없다 (%)', p_tone; end if;
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'AGORA: 빈 대댓글은 기록하지 않는다'; end if;
  insert into public.agora_posts (user_id, ym, phase, member, kind, content, parent_id, tone)
  values (u, p_ym, p_phase, p_member, 'comment', p_content, p_parent, p_tone)
  returning id into v_id;
  return jsonb_build_object('saved',true,'post_id',v_id,'phase',p_phase,'tone',p_tone);
end $fn$;

commit;

-- ══════════ 4. 읽는 쪽 ══════════
-- 🔒 새 칸을 만들면 **읽는 쪽까지가 한 작업**이다(반복결함 #8).
--    돌려주지 않으면 화면이 관직도 어조도 못 그린다.
--
-- agora_read()   — '평가'·'토론'·'내평가'·'이번달중간' 에 `어조`, '평가'·'명단' 에 `관직`
--                  그리고 머리에 `말투`·`어조` 규약을 실어 보낸다
--                  (핸드오프를 안 읽은 방도 읽을 때마다 규약을 본다)
-- agora_pending()— `관직`·`말투`·`어조`, '답할것' 에 상대의 `어조`
--
-- 두 함수는 시그니처가 그대로라 create or replace 로 갈아끼웠다(이 파일 §3 과 달리 drop 불필요).
-- 전문은 20261015_agora_v2.sql 의 것을 기준으로 위 칸만 더한 것이다.

-- ══════════ 5. 권한 ══════════
-- 🔒 drop 한 함수는 grant 가 사라진다. revoke ... from public 만으로는
--    anon 의 직접 grant 가 안 지워지므로 anon 을 따로 적는다(사주 0.1단계에서 확인).
revoke all on function
  public.agora_review(text,text,text,text,text,text,text,text),
  public.agora_mid(text,text,text,text,text,text),
  public.agora_review_na(text,text,text,text,text),
  public.agora_comment(text,text,text,uuid,text,text)
  from public, anon;
grant execute on function
  public.agora_review(text,text,text,text,text,text,text,text),
  public.agora_mid(text,text,text,text,text,text),
  public.agora_review_na(text,text,text,text,text),
  public.agora_comment(text,text,text,uuid,text,text)
  to authenticated, service_role;

-- ══════════ 6. 핸드오프 ══════════
-- 🚫 이 파일에 넣지 않는다 — 본문을 **앞에 덧붙이는** 작업이라 재실행하면 두 번 붙는다.
--    7방 + 공통(agora-charter) 을 v3 로 올렸다: 말투·어조·호출법·공지 절차.
--    🔒 새 칸을 만들면 7방 핸드오프에 등록하는 것까지가 한 작업이다.
--       지침을 모르면 방은 tone 을 안 달고, 어전은 무표정한 인형 일곱이 앉은 그림이 된다.

-- ══════════ 검증 (authenticated 롤 · 롤백 드라이런 10/10) ══════════
--  관직 7방 · 기존 40글 전부 plain · 🔒 미확인 공지가 쓰기를 막는다 ·
--  받들면 어조를 달고 들어간다 · 🔒 angry 거절 · 대댓글도 어조 ·
--  읽기가 관직/어조를 돌려준다 · 말투 규약을 알린다 · 옛 6인자 호출이 그대로 돈다
