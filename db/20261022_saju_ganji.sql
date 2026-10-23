-- 🔴 saju_ganji — 간지는 **함수로만** 계산한다 (사주방 핸드오프 saju-summit-2027 §6①)
-- 왜: 2026-09~10 에 로버트가 일진을 손으로 계산해 틀렸다(saju_notes 일진 오류 고지).
--      10/14 에 요청됐는데 10/22 까지 없었다. 대토론 월별 12칸의 전제다.
--
-- 일간지: i = (JDN + 49) mod 60 — Postgres to_char(d,'J') 가 율리우스 일수(JDN)다.
--         핸드오프 공식 (ordinal + 1721425 + 49) % 60 과 같다(ordinal + 1721425 = JDN).
--         검산(서버에서 돌림): 1986-05-10 甲寅 · 2000-01-01 戊午 · 2026-12-06 甲寅 ✓
-- 연간지: (year - 4) mod 60. 🔒 사주 연도는 입춘 기준이지만 이 함수는 **양력 연도 번호**만 받는다.
--         「몇 년생」처럼 날짜를 넣어 입춘 전후를 가리는 건 하지 않는다(절기 시각 소스가 없다).
-- 월간지: 五虎遁 — 연간이 정하면 寅월 천간이 정해진다(甲己→丙寅 · 乙庚→戊寅 · 丙辛→庚寅 · 丁壬→壬寅 · 戊癸→甲寅).
--         검산: 1986(丙) 巳월 = 癸巳 = 로한 원국 월주 ✓ · 2027(丁) 寅월 = 壬寅
--         ⚠️ **절입 날짜(경계)는 계산하지 않는다.** 寅월이 2/4 인지 2/5 인지는 절기 시각이 있어야 안다.
--            그 소스는 아직 안 정했다. 그래서 이 함수는 「n 번째 달의 간지」만 돌려주고 날짜 범위는 돌려주지 않는다.

create or replace function public.saju_ganji(p_date date)
returns text language sql immutable set search_path to 'public' as $$
  select substr('甲乙丙丁戊己庚辛壬癸', ((to_char(p_date,'J')::int + 49) % 60) % 10 + 1, 1)
      || substr('子丑寅卯辰巳午未申酉戌亥', ((to_char(p_date,'J')::int + 49) % 60) % 12 + 1, 1)
$$;

create or replace function public.saju_year_ganji(p_year int)
returns text language sql immutable set search_path to 'public' as $$
  select substr('甲乙丙丁戊己庚辛壬癸', (((p_year - 4) % 60 + 60) % 60) % 10 + 1, 1)
      || substr('子丑寅卯辰巳午未申酉戌亥', (((p_year - 4) % 60 + 60) % 60) % 12 + 1, 1)
$$;

-- n = 1(寅월) … 12(丑월)
create or replace function public.saju_month_ganji(p_year int)
returns table(n int, branch text, ganji text)
language sql immutable set search_path to 'public' as $$
  with y as (select (((p_year - 4) % 60 + 60) % 60) % 10 as ys),           -- 연간 0=甲 … 9=癸
       s as (select ((ys % 5) * 2 + 2) % 10 as first_stem from y)          -- 寅월 천간(五虎遁)
  select g.n,
         substr('寅卯辰巳午未申酉戌亥子丑', g.n, 1),
         substr('甲乙丙丁戊己庚辛壬癸', ((first_stem + g.n - 1) % 10) + 1, 1)
           || substr('寅卯辰巳午未申酉戌亥子丑', g.n, 1)
  from s, generate_series(1,12) as g(n)
$$;

comment on function public.saju_ganji(date) is '일진(일간지). 손계산 금지 — 이 함수로만. 검산 1986-05-10 甲寅 · 2000-01-01 戊午 · 2026-12-06 甲寅';
comment on function public.saju_month_ganji(int) is '五虎遁 월간지 12칸(寅~丑). 절입 날짜 경계는 계산하지 않는다(절기 시각 소스 미정)';
