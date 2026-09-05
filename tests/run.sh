#!/usr/bin/env bash
# 로한북 테스트 러너 — 영향 범위만 병렬로 돈다
#
#   ./run.sh <영역> [work.html]
#   ./run.sh all                 배포 직전 · 전체
#   ./run.sh money               재정(가계부·카드·계좌·세무·예산)
#   ./run.sh goal                목표·루틴·보상·데일리
#   ./run.sh time                타임로그
#   ./run.sh data                마이그레이션·저장·스냅샷
#   ./run.sh css                 레이아웃·브레이크포인트
#   ./run.sh t25 t14             파일명을 직접 나열해도 된다
#
# ⚠️ 규칙: 작업 중엔 영역만, **배포 직전엔 반드시 `all`**.
#    영역 태그는 '보통 이것만 깨진다'는 경험칙이지 보증이 아니다.
set -u
cd "$(dirname "$0")"
HTML="${HTML:-$(cd .. && pwd)/work.html}"

# ── 영역 → 테스트 (t22·t23 은 데이터층이라 어디서든 잘 깨진다) ──
case "${1:-all}" in
  all)   T="t_reg t22 t23 t24 t25 t26 t27 t28 t29 t30 t31 t32 t33 t34 t35 t36 t37 t38 t39 t40 t41 t14 t18 t19 t20 t21" ;;
  money) T="t_reg t20 t21 t25 t26 t27 t28 t31 t32 t37 t40 t41 t22" ;;
  goal)  T="t_reg t24 t30 t36 t38 t39 t22" ;;
  time)  T="t_reg t18 t19 t28 t22" ;;
  data)  T="t22 t23 t_reg t24 t25 t26 t27 t29 t31 t32 t33 t34 t35 t36 t37 t38 t39 t40 t41" ;;
  css)   T="t14 t26 t29 t36 t_reg" ;;
  quick) T="t_reg t22" ;;                # 30초 컷 · 살아는 있나
  *)     T="$*" ;;
esac
[ $# -ge 2 ] && [ -f "${2:-}" ] && { HTML="$2"; T="$1"; }

[ -f "$HTML" ] || { echo "✗ HTML 없음: $HTML   (HTML=/경로/work.html ./run.sh $1)"; exit 2; }
echo "▶ $(echo $T | wc -w)개 · $(basename "$HTML") · $(date +%H:%M:%S)"
S=$(date +%s)
mkdir -p .out
# ⚠️ 0825: 16개를 한꺼번에 띄웠더니 크로미움이 못 떠서 page.goto 가 30초 타임아웃 났다.
#    코드가 아니라 컨테이너 자원 문제였다(따로 돌리면 전부 통과).
#    → 동시 실행에 상한을 둔다. 늘리기 전에 왜 늘리는지 먼저 생각해라.
JOBS="${JOBS:-5}"
PIDS=""; N=0
for t in $T; do
  [ -f "$t.js" ] || { echo "  ? $t.js 없음"; continue; }
  ( timeout 280 node "$t.js" "$HTML" > ".out/$t.log" 2>&1; echo $? > ".out/$t.rc" ) &
  PIDS="$PIDS $!"; N=$((N+1))
  if [ $((N % JOBS)) -eq 0 ]; then for p in $PIDS; do wait "$p"; done; PIDS=""; fi
done
for p in $PIDS; do wait "$p"; done

FAIL=0
for t in $T; do
  [ -f ".out/$t.rc" ] || continue
  rc=$(cat ".out/$t.rc")
  if [ "$rc" = "0" ]; then
    SUM=$(grep -oE '전부 통과 \([0-9]+건\)|전부 통과|빈탭: [^|]*' ".out/$t.log" | head -1)
    [ -z "$SUM" ] && SUM="통과"
    printf "  \033[32m✓\033[0m %-6s %s\n" "$t" "$SUM"
  else
    FAIL=$((FAIL+1))
    printf "  \033[31m✗\033[0m %-6s\n" "$t"
    grep -E "✗|SYNTAX|SyntaxError|ReferenceError|TypeError|실패|Timeout" ".out/$t.log" | head -4 | sed 's/^/       /'
  fi
done
E=$(date +%s)
echo "── $((E-S))초 · $([ $FAIL -eq 0 ] && echo '전부 통과' || echo "실패 $FAIL개  (자세히: tests/.out/<이름>.log)")"
[ "${1:-all}" != "all" ] && [ $FAIL -eq 0 ] && echo "   ⚠️ 영역 테스트만 돌았다. 배포 전엔 ./run.sh all"
exit $FAIL
