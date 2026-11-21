-- 🩺 EMR 사람별 — 나 · 어머니 · 아버지 (로한 지시 2026-10-21)
-- 로한: 「EMR도 탭으로 나, 어머니, 아버지 이렇게 구분해서 만들어서」
--
-- 🔒 더하기만 한다. 기존 문제 3건(순환기·오십견·칼륨식단)은 기본값 'me' 로 그대로 「나」에 남는다.
-- 🔒 AI 방이 「누구 얘기인지」 확실히 알게 emr_thread 의 problem 에 person 을 싣는다.
--    (emr_pending 은 반환 열을 바꾸려면 함수를 지웠다 다시 만들어야 해서 건드리지 않는다 —
--     AI 방은 emr_thread 와 사실 묶음 머리줄 「[대상]」 으로 안다.)

alter table public.health_problems add column if not exists person text not null default 'me';
alter table public.health_problems drop constraint if exists health_problems_person_check;
alter table public.health_problems add constraint health_problems_person_check
  check (person in ('me','mom','dad'));

-- emr_thread — 반환 problem 에 person 한 칸만 더한다(나머지 본문은 그대로)
do $mig$
declare d text; n int;
begin
  select pg_get_functiondef('public.emr_thread(text,text)'::regprocedure) into d;
  n := (length(d) - length(replace(d, '''status'', pr.status)', ''))) / length('''status'', pr.status)');
  if n <> 1 then raise exception 'emr_thread 본문에서 고칠 자리를 정확히 하나 찾지 못했다 (%건)', n; end if;
  d := replace(d, '''status'', pr.status)', '''status'', pr.status, ''person'', pr.person)');
  execute d;
end $mig$;
