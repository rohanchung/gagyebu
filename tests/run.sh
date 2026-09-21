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
# Missing tools must never turn an unexecuted test run into a success.
for tool in dirname wc basename date mkdir timeout node grep head sed; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing test tool: $tool (check PATH)"; exit 2; }
done
cd "$(dirname "$0")" || exit 2
HTML="${HTML:-$(cd .. && pwd)/work.html}"

# ── 영역 → 테스트 (t22·t23 은 데이터층이라 어디서든 잘 깨진다) ──
case "${1:-all}" in
  all)   T="t_reg t22 t23 t24 t25 t26 t27 t28 t29 t30 t31 t32 t33 t34 t35 t36 t37 t40 t41 t42 t43 t44 t45 t46 t47 t48 t49 t14 t18 t19 t20 t21" ;;
  emr)   T="t43 t44 t14 t22 t_reg" ;;
  money) T="t_reg t20 t21 t25 t26 t27 t28 t31 t32 t37 t40 t41 t22" ;;
  goal)  T="t_reg t24 t30 t36 t42 t45 t47 t48 t49 t22" ;;
  time)  T="t_reg t18 t19 t28 t22" ;;
  data)  T="t46 t49 t22 t23 t_reg t24 t25 t26 t27 t29 t31 t32 t33 t34 t35 t36 t37 t40 t41 t42" ;;
  css)   T="t14 t26 t29 t36 t_reg" ;;
  quick) T="t_reg t22" ;;                # 30초 컷 · 살아는 있나
  *)     T="$*" ;;
esac
[ $# -ge 2 ] && [ -f "${2:-}" ] && { HTML="$2"; T="$1"; }

[ -f "$HTML" ] || { echo "✗ HTML 없음: $HTML   (HTML=/경로/work.html ./run.sh $1)"; exit 2; }
# 🔒 문법 선검사 — 총붕괴는 1초에 잡혀야 한다.
#    2026-09-21: CHANGELOG 문자열 안에 작은따옴표를 그대로 넣어 문자열이 끊겼고,
#    앱이 아예 안 떠서 **32개가 222초를 태우고 전부 실패**했다.
#    파싱도 안 되는 파일을 크로미움 32번 띄워 확인할 이유가 없다.
if ! node syntax.js "$HTML"; then
  echo "── 문법부터 깨졌다. 나머지는 돌리지 않는다."
  exit 1
fi
echo "▶ $(echo $T | wc -w)개 · $(basename "$HTML") · $(date +%H:%M:%S)"
S=$(date +%s)
mkdir -p .out
# ⚠️ 0825: 16개를 한꺼번에 띄웠더니 크로미움이 못 떠서 page.goto 가 30초 타임아웃 났다.
#    코드가 아니라 컨테이너 자원 문제였다(따로 돌리면 전부 통과).
#    → 동시 실행에 상한을 둔다. 늘리기 전에 왜 늘리는지 먼저 생각해라.
# ── 크로미움 위치 ──
# 🔒 테스트 파일에 경로를 박지 않는다. CHROME 이 있으면 그것, 없으면 각 파일이
#    /opt/pw-browsers/chromium 을 찾고, 그것도 없으면 playwright 가 제 번들을 쓴다.
#    (CI 에서 돌리기 위한 조건이다 — GitHub Actions 컨테이너엔 /opt/pw-browsers 가 없다)
if [ -z "${CHROME:-}" ] && [ -x /opt/pw-browsers/chromium ]; then
  export CHROME=/opt/pw-browsers/chromium
fi

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
