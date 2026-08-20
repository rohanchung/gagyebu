# 테스트 스크립트 (로한북)

세션 컨테이너는 대화창이 끝나면 사라진다. 그래서 여기 남긴다.
다음 로버트는 이걸 클라우드 작업폴더로 복사해서 쓴다.

## 실행 환경
```
node <스크립트>.js /경로/work.html
```
- Playwright 필요: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` 에 chromium 이 이미 있다.
  `chromium.launch({executablePath:'/opt/pw-browsers/chromium'})` — `playwright install` 하지 말 것.
- 각 스크립트는 supabase 를 스텁으로 갈아끼운다. 실제 서버에 붙지 않는다.
- 스텁은 `update().eq().eq().select()` 체인을 지원해야 한다 (v1.1 동기화 엔진).

## 무엇을 보는가
| 파일 | 목적 |
|---|---|
| `t_reg.js` | 15탭 순회 — 빈탭 0 · JS 에러 0. **정상 상태**만 본다. |
| `t22.js` | ⭐ **극단 상태 5종**(행 없음/`{}`/schemaVersion만/구버전/ui 없음)으로 15탭 순회 + 백업 왕복 + 불량파일 거부. **마이그레이션을 건드리면 반드시 이걸 돌린다.** |
| `t20.js` | 동기화 — 정상저장 / 충돌→덮어쓰기 / 충돌→새로고침 / 신규계정 / 백업 UI |
| `t21.js` | 동기화 — 일시적 실패 후 재시도 성공 / 계속 실패 시 경고 (약 25초 걸린다) |
| `t23.js` | 📀 **스냅샷** — 접속 시 자동 1개 / 같은 날 중복 방지 / 목록 렌더 / 되돌리기 시 pre_restore 선행 / 보관 상한 정리 |
| `t24.js` | ⭐ **코드 이관 · 버킷 승격** (v1.3) — 루틴 소속 이동 시 `checks` 의 done/due/miss 이관 · 분모 불변 · 취소 시 원복 · 코드 고정 · 목표 삭제로 Z 강등될 때도 이관 / 버킷→연간목표 승격·해제·유령링크 정리. **`checks` 나 코드 발급을 건드리면 반드시 이걸 돌린다.** |
| `t14.js` | 6개 브레이크포인트(390·412·768·1024·1440·1920) 네비·로고·가로overflow |
| `t18.js` | 타임로그 구간 부분 수정 / 구간 비우기 |
| `t19.js` | ✎ 호버 빠른 수정 |

`t_reg.js` / `t14.js` / `t18.js` / `t19.js` 는 `state_rw.json`(목표·보상 시드)을 읽는다. 없으면 Supabase 에서 뽑아 만든다:
`select data->'goals' as goals, data->'rewards' as rewards from app_state;`

## 규칙
- **테스트가 계속 같은 걸 지적하면 테스트가 틀린 게 아니라 코드가 틀린 것이다.** (v1.0에서 9일 무시했다가 터짐)
- **새 기능 테스트는 '잘 된 상태'가 아니라 '빈 상태'부터 먹인다.** (v1.1에서 SEED 키 7개 누락 발견)
- `t16.js` 는 폐기했다 — v11에서 `#v-timelog` 탭이 데일리에 합쳐져 사라졌다.
- **경로를 하드코딩하지 마라.** v1.3 이전 `t_reg`/`t14`/`t18`/`t19`/`t20` 이 `/home/claude/work.html` 과
  `/home/claude/state_rw.json` 을 박아두고 있어서, 폴더를 옮긴 새 세션에서 통째로 안 돌았다.
  → HTML 은 `process.argv[2]`, 시드는 `path.join(__dirname,'state_rw.json')` 으로 통일했다.
