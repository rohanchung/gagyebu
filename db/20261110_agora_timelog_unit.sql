-- v4.94 타임로그 10분 칸 — agora_facts 의 「학습분 · 타임로그」가 칸 수 × 30 이었다.
-- 블록에 u(한 칸 분)가 있으면 그 값, 없으면 옛 30분 칸으로 센다. 그 한 곳만 바꾼다.
do $mig$
declare d text;
begin
  d := pg_get_functiondef('public.agora_facts(text,text)'::regprocedure);
  if position('+ 1) * 30' in d) = 0 then raise exception 'pattern not found'; end if;
  d := replace(d, '+ 1) * 30', '+ 1) * coalesce((bl->>''u'')::int, 30)');
  execute d;
end
$mig$;
