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

# 🔒 전체 목록은 **한 곳**에만 적는다 — 세 군데에 적혀 있으면 하나만 고치는 날이 온다
ALLT="t_reg t22 t23 t24 t25 t26 t27 t28 t29 t30 t31 t32 t33 t34 t35 t36 t37 t40 t41 t42 t43 t44 t45 t46 t47 t48 t49 t50 t51 t52 t53 t54 t55 t56 t57 t58 t59 b01 b02 b03 b04 t14 t18 t19 t20 t21"
# ── 영역 → 테스트 (t22·t23 은 데이터층이라 어디서든 잘 깨진다) ──
case "${1:-all}" in
  all)   T="$ALLT" ;;
  emr)   T="t43 t44 t14 t22 t_reg" ;;
  money) T="t_reg t56 t50 t51 t20 t21 t25 t26 t27 t28 t31 t32 t37 t40 t41 t22" ;;
  goal)  T="t_reg t24 t30 t36 t42 t45 t47 t48 t49 t22" ;;
  time)  T="t_reg t18 t19 t28 t22" ;;
  data)  T="t46 t49 t22 t23 t_reg t24 t25 t26 t27 t29 t31 t32 t33 t34 t35 t36 t37 t40 t41 t42" ;;
  css)   T="t14 t26 t29 t36 t51 t53 t54 t_reg" ;;
  quick) T="t_reg t22 t52" ;;                # 30초 컷 · 살아는 있나
  # ⏱ v4.48 — 🔒 바뀐 것만 돌린다. 로한: "업데이트 후 최종 검수 하는데 시간이 너무 걸리는데"
  #    git diff 에 나온 **이름**(함수·변수)을 쓰는 테스트만 고른다.
  #    🔒 데이터층(t_reg·t22)과 문지기(t52)는 **늘** 돈다 — 어디를 고치든 깨질 수 있다.
  #    🔒 걸리는 게 없으면 **전체를 돈다**. 못 고른 것을 안 돈 것으로 바꾸면 그게 사고다.
  #    ⚠️ 이건 작업 중에 쓰는 것이다. **배포 전엔 반드시 all.**
  auto)
    CH=$(cd .. && git diff -U0 HEAD -- index.html billiards/index.html 2>/dev/null \
         | grep "^[+-]" | grep -v "^[+-][+-]" \
         | grep -oE "[A-Za-z_][A-Za-z0-9_]{4,}" | sort -u \
         | grep -vE "^(function|return|const|await|async|document|window|length|value|style|class|error|data|false|true|null|undefined|string|number|object|Array|Object|String|Number|Math|JSON|push|filter|forEach|slice|split|join|indexOf|replace|parse|stringify|getElementById|querySelector|querySelectorAll|innerHTML|textContent|addEventListener|appendChild|createElement|setAttribute|classList|dataset|parentElement|children|concat|reduce|every|some|sort|keys|values|catch|Promise|setTimeout|console|display|margin|padding|border|color|font|width|height|button|select|option|input|label|title|onclick|placeholder|table|right|left|center|block|none|flex|size|span|style|class)$" | head -400)      # 🔒 흔한 단어는 뺀다 — function 하나에 전부 걸린다
    if [ -z "$CH" ]; then
      echo "   ⏱ auto: 바뀐 것이 없다 → quick 으로 돈다"
      T="t_reg t22 t52"
    else
      PAT=$(mktemp); printf "%s\n" "$CH" > "$PAT"
      HIT=""
      for f in t*.js b*.js; do
        n="${f%.js}"
        case " t_reg t22 t52 " in *" $n "*) continue;; esac
        grep -qFf "$PAT" "$f" 2>/dev/null && HIT="$HIT $n"
      done
      rm -f "$PAT"
      if [ -z "$HIT" ]; then
        echo "   ⏱ auto: 짚이는 테스트가 없다 → **전체**를 돈다(못 고른 것을 안 돈 것으로 바꾸지 않는다)"
        T="$ALLT"
      else
        T="t_reg t22 t52$HIT"
        # 🔒 절반 넘게 걸리면 고른 뜻이 없다 — 차라리 전체를 돈다(그게 더 정직하다)
        if [ "$(echo $T | wc -w)" -gt 25 ]; then
          echo "   ⏱ auto: 너무 많이 걸렸다($(echo $T | wc -w)개) → 전체를 돈다"
          T="$ALLT"
        else
          echo "   ⏱ auto: 바뀐 이름 $(echo "$CH" | wc -w)개 → 테스트 $(echo $T | wc -w)개"
        fi
      fi
    fi
    ;;
  bb)    T="b01 b02 b03 b04 t52" ;;                     # 당구 연습장(billiards/) · 로한북 문지기
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

# ⏱ v4.48 — 🔴 [결함] 여기는 **배치**였다: 5개를 띄우고 **전부 끝날 때까지 기다린 뒤**
#    다음 5개를 띄웠다. 그래서 배치마다 **가장 느린 하나가 나머지 넷을 붙잡았다**.
#    43개면 9배치, 배치마다 수십 초씩 빈손으로 기다린 셈이다.
# 🔒 작업 풀로 바꾼다 — 한 칸이 비면 **바로** 다음 것을 넣는다. 테스트는 한 줄도 안 건드린다.
# 🔒 느린 것부터 띄운다. 긴 작업을 마지막에 시작하면 그것만 남아 꼬리가 길어진다.
#    (지난 실행 시간을 .out/*.ms 에 남겨 두고 다음 실행에서 그 순서를 쓴다)
JOBS="${JOBS:-$( (nproc 2>/dev/null || echo 5) )}"
# 지난 실행이 남긴 시간으로 느린 순 정렬 — 기록이 없으면 준 순서 그대로
ORD=""
for t in $T; do
  [ -f "$t.js" ] || { echo "  ? $t.js 없음"; continue; }
  ms=0; [ -f ".out/$t.ms" ] && ms=$(cat ".out/$t.ms" 2>/dev/null || echo 0)
  ORD="$ORD$ms $t\n"
done
T2=$(printf "$ORD" | sort -rn | awk "{print \$2}")
for t in $T2; do
  while [ "$(jobs -rp | wc -l)" -ge "$JOBS" ]; do wait -n 2>/dev/null || sleep 0.2; done
  ( _s=$(date +%s%3N)
    timeout 280 node "$t.js" "$HTML" > ".out/$t.log" 2>&1; _rc=$?
    _e=$(date +%s%3N)
    echo $_rc > ".out/$t.rc"; echo $((_e-_s)) > ".out/$t.ms" ) &
done
wait

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
# ⏱ 느린 다섯 — 🔒 어디를 고칠지 **숫자가** 말하게 둔다(짐작으로 손대지 않는다)
SLOW=""
for t in $T; do
  [ -f ".out/$t.ms" ] || continue
  SLOW="$SLOW$(cat ".out/$t.ms") $t\n"
done
if [ -n "$SLOW" ]; then
  echo "   ⏱ 느린 순: $(printf "$SLOW" | sort -rn | head -5 | awk "{printf \"%s %.1fs  \", \$2, \$1/1000}")"
fi
echo "── $((E-S))초 · 동시 $JOBS개 · $([ $FAIL -eq 0 ] && echo '전부 통과' || echo "실패 $FAIL개  (자세히: tests/.out/<이름>.log)")"
[ "${1:-all}" != "all" ] && [ $FAIL -eq 0 ] && echo "   ⚠️ 일부만 돌았다. **배포 전엔 ./run.sh all**"
exit $FAIL
