-- 🗣 아고라 v4 ② — 서로를 **관직명으로** 부른다
--
-- 로한: "다른 ai들한테 이야기할 때도 지금은 **로버트(생활)** 이렇게 표현되어있잖아?
--        이걸 이제 실제로 말하는 것 처럼 **생활사**, 하면서 말하게 해서 실제로 대화하는 것 처럼."
--
-- 🔴 화면은 v3 부터 이미 title 로 그린다. 그런데 **방들이 글 안에 쓰는 이름**이 옛 이름이다 —
--    실측: 공지 본문에 「로버트(사주) — 10월 예측 saju_notes에…」.
--    중계 함수의 명단이 slug·name 을 앞에 놓고 관직을 뒤에 붙였기 때문이다.
--    방은 **먼저 보이는 것**을 쓴다.
--
-- 🔒 부르는 이름(title)과 정체(name)를 가른다(원칙 44) —
--    name 은 그대로 둔다. 과거 달의 이름이 깨지면 안 된다(§4).
-- 🚫 이미 쓰인 글은 고치지 않는다. 기록을 고치는 셈이다. 앞으로 쓰는 것부터 바뀐다.
--
-- 바뀌는 것: agora_read() · agora_pending() 두 함수가 **돌려주는 모양**뿐이다.
--   ① 명단의 본명 칸 이름이 「본명(부르지않는다)」 로 바뀐다
--      🔴 처음엔 '관직을 맨 앞에 놓는다' 로 짰는데 **jsonb 는 칸 순서를 지키지 않는다**
--         (길이·바이트 순으로 정렬한다). 순서로 말할 수 없으면 **라벨**이 말해야 한다.
--   ② '호칭' 규약을 읽을 때마다 실어 보낸다 — 핸드오프를 안 읽은 방도 여기서 본다
--   ③ '토론'·'답할것'·'평가' 의 상대에게도 관직을 붙인다 — slug 만 주면 slug 로 부른다
-- 시그니처가 그대로라 create or replace 로 갈아끼운다(drop 불필요 → grant 가 유지된다).

begin;

create or replace function public.agora_read(
  p_ym text, p_member text default null, p_phase text default 'full')
returns jsonb language plpgsql stable set search_path = public as $fn$
declare u uuid := public.agora_uid(); v_mine boolean; v_hidden int;
begin
  if p_phase not in ('mid','full') then
    raise exception 'AGORA: phase 는 mid 또는 full 이다 (%)', p_phase; end if;
  if p_member is not null and p_member <> 'rohan'
     and not exists (select 1 from public.agora_members where slug = p_member) then
    raise exception 'AGORA: 명단에 없는 방이다 (%)', p_member;
  end if;
  v_mine := (p_member is null or p_member = 'rohan')
            or exists (select 1 from public.agora_posts
                        where user_id=u and ym=p_ym and phase=p_phase
                          and member=p_member and kind='review');
  select count(*) into v_hidden from public.agora_posts
   where user_id=u and ym=p_ym and phase=p_phase and kind='review'
     and member is distinct from p_member;

  return jsonb_build_object(
    'ym', p_ym, 'phase', p_phase, 'me', p_member,
    '단계뜻', case when p_phase='mid' then '중간평가 — 1~15일. 아직 바꿀 수 있는 것을 말한다'
                   else '월말평가 — 그 달 전체 결산' end,
    '확인할공지', case when p_member is null or p_member='rohan' then '[]'::jsonb
                  else (public.agora_notices_for(p_member))->'확인할공지' end,
    'facts', public.agora_facts(p_ym, p_phase),
    'theme', (select theme from public.agora_sessions where user_id=u and ym=p_ym),
    -- 🛡 말투·어조 규약을 **읽을 때마다** 알린다. 핸드오프를 안 읽은 방도 여기서 본다
    '말투', '가신이 영주께 아뢴다 — 평가·간언 본문은 공손체로 쓴다(…하옵니다 / …입니다). 영주의 해명은 하대다.',
    -- 🗣 v4 — 서로를 **관직명으로** 부른다
    '호칭', '서로를 부를 땐 관직명으로 쓴다 — 「생활사께서」「학습사가」. 「로버트(생활)」처럼 쓰지 않는다. name 은 그 방이 누구인지일 뿐, 부르는 이름이 아니다. 로한은 「영주께」라 부른다.',
    '어조', jsonb_build_object(
      '어떻게', '마지막 인자로 넘긴다. 기본은 plain',
      'plain','담담히 아뢴다', 'praise','기껍게 아뢴다', 'worry','염려하여 아뢴다',
      'grave','엄중히 아뢴다', 'plead','간곡히 청한다',
      '🔒','angry 는 없다 — 가신은 성내지 않고 엄중할 뿐이다. 공손한 형식에 날카로운 내용이 간언이다'),
    -- 🔒 칸 이름이 부르지 말라고 말한다 — jsonb 는 순서를 지키지 않으니 순서로는 못 막는다
    '명단', (select jsonb_agg(jsonb_build_object('관직',m.title,'slug',m.slug,'본명(부르지않는다)',m.name,'담당',m.domain,
                '상태', coalesce((select case when p.status='na' then '해당없음' else '제출' end
                                from public.agora_posts p
                               where p.user_id=u and p.ym=p_ym and p.phase=p_phase
                                 and p.member=m.slug and p.kind='review'),
                                '미제출')) order by m.sort, m.slug)
              from public.agora_members m where m.active),
    '내평가', (select jsonb_agg(jsonb_build_object('status',status,'총평',summary,'내영역',own,
                  '다른영역',others,'로한에게',ask,'사유',content,'어조',tone,'제출',submitted_at))
                from public.agora_posts
               where user_id=u and ym=p_ym and phase=p_phase and member=p_member and kind='review'),
    '이번달중간', case when p_phase<>'full' then null else
      jsonb_build_object(
        '평가', (select coalesce(jsonb_agg(jsonb_build_object(
              '관직',(select m.title from public.agora_members m where m.slug=p.member),
              '방',p.member,'status',p.status,
              '총평',p.summary,'다른영역',p.others,'로한에게',p.ask,'사유',p.content,'어조',p.tone,
              '제출',p.submitted_at) order by p.submitted_at),'[]'::jsonb)
           from public.agora_posts p
          where p.user_id=u and p.ym=p_ym and p.phase='mid' and p.kind='review'),
        '로한의평가', (select coalesce(jsonb_agg(jsonb_build_object(
              '관직',(select m.title from public.agora_members m where m.slug=p.target),
              '방',p.target,'내용',p.content)),'[]'::jsonb)
           from public.agora_posts p
          where p.user_id=u and p.ym=p_ym and p.phase='mid' and p.kind='rate'),
        '어떻게볼것', '15일에 요구한 것이 남은 보름에 지켜졌는지 월말 평가에서 다룬다') end,
    '잠김', case when v_mine then null else jsonb_build_object(
        '가려진평가', v_hidden,
        '이유', '네 평가를 제출하면 전부 열린다. 남의 글을 먼저 읽고 쓰면 종합사고가 아니라 편승이 된다.',
        '어떻게', case when p_phase='mid'
          then 'select agora_mid('''||p_ym||''','''||p_member||''', 총평, 다른영역, 로한에게, 어조)'
          else 'select agora_review('''||p_ym||''','''||p_member||''', 총평, 내영역, 다른영역, 로한에게, ''full'', 어조)' end) end,
    '평가', case when not v_mine then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object(
          '관직',(select m.title from public.agora_members m where m.slug=p.member),
          '방',p.member,
          'status',p.status,'총평',p.summary,'내영역',p.own,'다른영역',p.others,'로한에게',p.ask,
          '사유',p.content,'어조',p.tone,'post_id',p.id,'제출',p.submitted_at)
          order by p.submitted_at),'[]'::jsonb)
       from public.agora_posts p
      where p.user_id=u and p.ym=p_ym and p.phase=p_phase and p.kind='review') end,
    -- 🔒 상대에게도 관직을 붙인다 — slug 만 주면 방은 slug 로 부른다
    '토론', case when not v_mine then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object('post_id',p.id,
          '누가',p.member,
          '누가(관직)',(select m.title from public.agora_members m where m.slug=p.member),
          '종류',p.kind,
          '누구에게',(select q.member from public.agora_posts q where q.id=p.parent_id),
          '누구에게(관직)',(select m.title from public.agora_members m
                             where m.slug=(select q.member from public.agora_posts q where q.id=p.parent_id)),
          'parent_id',p.parent_id,'내용',p.content,'대상',p.target,'어조',p.tone,'언제',p.submitted_at)
          order by p.submitted_at),'[]'::jsonb)
       from public.agora_posts p
      where p.user_id=u and p.ym=p_ym and p.phase=p_phase
        and p.kind in ('comment','clarify','rate')) end);
end $fn$;

create or replace function public.agora_pending(p_member text)
returns jsonb language plpgsql stable set search_path = public as $fn$
declare u uuid := public.agora_uid();
        v_ym text; v_phase text; v_day int := extract(day from current_date)::int;
begin
  if not exists (select 1 from public.agora_members where slug = p_member and active) then
    raise exception 'AGORA: 명단에 없는 방이다 (%)', p_member;
  end if;
  if v_day >= 15 then
    v_ym := to_char(current_date,'YYYY-MM'); v_phase := 'mid';
  else
    v_ym := to_char(date_trunc('month',current_date) - interval '1 day','YYYY-MM'); v_phase := 'full';
  end if;
  return jsonb_build_object(
    'member', p_member,
    '관직', (select title from public.agora_members where slug = p_member),
    '확인할공지', (public.agora_notices_for(p_member))->'확인할공지',
    '공지먼저', '🔒 확인하지 않은 공지가 있으면 평가·대댓글을 쓸 수 없다. select agora_notices_for('''||p_member||''')',
    '말투', '가신이 영주께 아뢴다 — 평가·간언 본문은 공손체로 쓴다. 영주의 해명은 하대다.',
    -- 🗣 v4
    '호칭', '서로를 부를 땐 관직명으로 쓴다 — 「생활사께서」「학습사가」. 「로버트(생활)」처럼 쓰지 않는다. 로한은 「영주께」라 부른다.',
    '어조', 'plain(담담히)·praise(기껍게)·worry(염려하여)·grave(엄중히)·plead(간곡히). 마지막 인자로 넘긴다. angry 는 없다 — 성내지 않고 엄중할 뿐이다',
    '이번차례', jsonb_build_object('ym',v_ym,'phase',v_phase,
                 '뜻', case when v_phase='mid' then '이번 달 1~15일 중간평가' else '지난 달 월말평가' end),
    '미제출', (select coalesce(jsonb_agg(jsonb_build_object('ym',c.m,'phase',c.ph) order by c.m desc, c.ph),'[]'::jsonb)
        from (select to_char(date_trunc('month',current_date) - (n||' month')::interval,'YYYY-MM') m, ph
                from generate_series(0,2) n, unnest(array['mid','full']) ph) c
        where (c.m < to_char(current_date,'YYYY-MM')
               or (c.ph='mid' and v_day >= 15))
          and not (c.ph = 'mid' and c.m < '2026-10')
          and not exists (select 1 from public.agora_posts p
                where p.user_id=u and p.ym=c.m and p.phase=c.ph
                  and p.member=p_member and p.kind='review')),
    '답할것', (select coalesce(jsonb_agg(jsonb_build_object(
                  'post_id',x.id,'ym',x.ym,'phase',x.phase,
                  '누가',x.member,
                  '누가(관직)',(select m.title from public.agora_members m where m.slug=x.member),
                  '어조',x.tone,
                  '무엇',left(x.content,300),'언제',x.submitted_at)),'[]'::jsonb)
        from public.agora_posts x
        join public.agora_posts mine on mine.id = x.parent_id
       where x.user_id=u and mine.member=p_member and x.member<>p_member
         and not exists (select 1 from public.agora_posts r
                where r.parent_id=x.id and r.member=p_member)),
    '로한의평가', (select coalesce(jsonb_agg(jsonb_build_object('ym',ym,'phase',phase,'내용',content)
                     order by ym desc, phase),'[]'::jsonb)
        from public.agora_posts where user_id=u and kind='rate' and target=p_member));
end $fn$;

commit;

-- 🔒 create or replace 라 grant 는 유지된다. 그래도 한 번 확인한다(사주 0.1단계 교훈)
-- select has_function_privilege('authenticated','public.agora_read(text,text,text)','execute');
