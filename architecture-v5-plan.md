# 로한북 v5 — 단계별 구조 기획 (상세)

> 상위 문서: [architecture-v5.md](architecture-v5.md) (원칙·목표 구조)
> 상태: **P0·P1 구현 완료 (2026-11-06 · v4.78) · P1 이중 쓰기 관찰 중 (~2026-11-20)**
> - P0: 스냅샷 id 173 · 기준선 run.sh all 53개 통과 · 가짜 서버는 t70 안에 둠(`_fake_sb.js` 로의 공통화는 P2 때)
> - P1: app_kv 47행 · kv_split/kv_join/kv_apply/kv_norm/kv_verify/kv_save · 트리거 kv_to_blob·blob_to_kv · 실서버 RLS 시험 통과
> - 관찰 기간 기본값 2주로 착수(로한 「지금이 시작하는거라고 착수해」)
> - **P2 구현 완료 (v4.79)**: events(트리거 자동 기록 · 지운 레코드 원본 보존) · actors(scopes) · rb_call 6동사 · 앱 🧾 이력 탭 · 스킬 rohanbook-write
>   - 기본값으로 진행(로한 「다음 진행해」): 권한 표 = P2-2 안 그대로 · 직접 SQL = **차단 말고 direct-sql 로 표시만** · 영구삭제 = 로한만 · 단일 파일 = 보류
>   - 🔴 P1 보안 수리: security definer 함수가 PUBLIC 에 열려 있었다(kv_join 은 전체 데이터) → 전부 회수
>   - 남은 것: 직접 SQL 차단 켜기(방들이 스킬 적용 후) · `_fake_sb.js` 공통화 · activity → events 대체 단계마다 「착수 → 이중 쓰기 → 대조 → 전환」을 거친다. 단계 사이에는 반드시 로한의 확인을 받는다.

---

## 0. 실측 인벤토리 (2026-11-06)

### 0-1. 이미 덩어리 밖에 있는 것 — 건드리지 않는다
| 영역 | 테이블 | 저장 방식 |
|---|---|---|
| EMR | health_settings · health_problems · health_messages | 건별 insert/update ✓ |
| 사주 | saju_forecasts · saju_evaluations · saju_notes · saju_summits · saju_summit_entries · saju_summit_reads · saju_jieqi | 건별 ✓ |
| 아고라 | agora_members · agora_sessions · agora_posts · agora_notices · agora_acks | 건별 ✓ |
| 당구 | bb_boards · bb_attempts · bb_events | 건별 ✓ |
| 협업 | handoffs · sources | 방이 insert, 앱은 읽기만 ✓ |

→ **v5 는 「새로 짓기」가 아니라 「덩어리에 남은 것을 이 방식으로 옮기기」**다. 이미 검증된 패턴이 있다.

### 0-2. 덩어리(app_state.data, 950,374자)에 남은 것
| 키 | 크기 | 하위 (크기 · 건수) | 쓰는 쪽 | 쓰기 빈도 |
|---|---|---|---|---|
| **study** | 517K | words 266K·1,149 / sents 182K·450 / units 19K·75 / drills 19K·55 / errors 15K·64 / strategy 7K / **pomos 3K·25** / tests 3K·11 / week·month·logs·books·phases·exam | 로한 · 학습방 | 높음 (드릴·뽀모) |
| **transactions** | 239K·1,341 | — | 로한 · 생활사 | 높음 |
| saju | 41K | readings 40K·84 / story·daeun·birth·natal·… | 로한 · 사주방 | 낮음 |
| health | 29K | labValues 11K / metrics 9K·83 / weights 6K·89 / labMeds·labDates·labTypes·labVisits·events | 로한 · 순환기 | 중간 |
| insurance | 24K | covers 18K·171 / policies 6K·9 | 생활사 | 낮음 |
| timelog | 23K | 날짜별 배열 | 로한 | 높음 |
| activity | 13K·200 | 활동 로그(최근 200) | 앱 자동 | **매번** |
| journal 9K · checks 8K · posts 7K · goals 5K · meals 5K · accounts 5K · items 4K · rewards 4K · categories 4K · tax 3K · healthPeople 3K · routines 2K | | | | |
| **ui** | 1K | 탭 선택·필터·**pomoRun**(진행 중 뽀모)·seenNotes … | 로한(기기마다) | **매번** |
| 나머지 소형 | cards · debts · budgets · netSnapshots · rewardCards · rewardCfg · taxParams · meta · logs2 · missTags · itemCats · schemaVersion · actTzFixed | | | 낮음 |

### 0-3. 진단
1. **화면 상태(ui)가 공유 데이터에 섞여 있다.** 탭만 바꿔도 저장이 일어나고, 휴대폰과 PC 가 서로의 탭 위치로 충돌한다. → 기기 로컬로 옮긴다.
2. **activity 로그**가 모든 저장에 끼어 같이 바뀐다. 그래서 「무엇을 바꾸든 바뀐 키」가 최소 2개가 된다. → 이력(events)으로 대체한다.
3. **study 가 너무 크다.** 뽀모 한 판(pomos)을 기록하려고 단어 1,149개를 같이 올린다. → 하위 키 단위로 쪼갠다.
4. 앱의 `save()` 호출이 **172곳**이다. 호출부는 하나도 고치지 않는 설계여야 한다(위험 최소화).

---

## P0 — 준비 (반나절 · 앱 변경 없음)

| # | 할 일 | 산출물 |
|---|---|---|
| 0.1 | 📀 manual 스냅샷 「v5 착수 전」 + JSON 내려받기 + GitHub 백업 | 스냅샷 id |
| 0.2 | **스키마 사전** — 0-2 의 키별 필드·타입·예시·쓰는 함수 목록 | `db/schema-dictionary.md` |
| 0.3 | **가짜 백엔드(테스트용)** — 테스트들이 각자 supabase 를 흉내 내는 코드를 공통 모듈 하나로 모은다. app_kv·RPC 를 메모리에서 흉내 낸다 | `tests/_fake_sb.js` |
| 0.4 | 기준선 — `run.sh all` 통과 + 로드·저장 시간 측정(바이트·ms) | 기준 수치 |

---

## P1 — 키별 분리 (1일 + 관찰 1~2주) · 효과: 충돌 대부분 소멸

### P1-1. 화면 상태를 기기 로컬로
- `DB.ui` 중 **기기마다 다른 것**(탭·필터·월 선택·사이드바 접힘 …)은 localStorage `rb_ui` 로 옮긴다. 서버 동기화 대상에서 뺀다.
- **기기 사이에 공유해야 하는 것**만 서버 키 `pref` 로 남긴다.
  - `pomoRun`: 폰에서 시작한 뽀모를 PC 에서 보기
  - `seenNotes`: 공지 읽음 표시
- 구현: `DB.ui` 는 그대로 두고, 저장할 때 직렬화 단계에서 빼고, 불러올 때 다시 합친다. 호출부 172곳은 고치지 않는다.

### P1-2. 테이블
```sql
create table public.app_kv (
  user_id uuid not null,
  key text not null,              -- 'transactions' · 'study/words' · 'pref' …
  data jsonb not null,
  rev int not null default 1,     -- 키별 버전 (낙관적 잠금)
  updated_at timestamptz not null default now(),
  updated_by text not null default 'rohan',   -- actor
  primary key (user_id, key)
);
-- RLS: app_state 와 같은 own 정책
```

### P1-3. 키 지도 (KV_MAP) — 「20K 넘으면 하위로 쪼갠다」
| kv 키 | 원래 위치 |
|---|---|
| `study/words` · `study/sents` · `study/units` · `study/drills` · `study/errors` · `study/pomos` · `study/tests` · `study/strategy` · `study/rest`(나머지 소형) | study.* |
| `health/lab`(labValues·labMeds·labDates·labTypes·labVisits) · `health/metrics` · `health/weights` · `health/rest` | health.* |
| `insurance/covers` · `insurance/policies` | insurance.* |
| `saju/readings` · `saju/rest` | saju.* |
| `transactions` · `timelog` · `checks` · `meals` · `journal` · `goals` · `routines` · `accounts` · `cards` · `debts` · … | 최상위 그대로 (1 키 = 1 행) |
| `pref` | ui 중 공유분 |
| (폐지) `activity` | → P2 의 events 로. 그 전까지는 `activity` 키로 따로 둔다 |

- **지도는 코드 한 곳(`KV_MAP`)에만 둔다.** 「DB 객체 ↔ kv 행들」 변환 함수 `kvSplit(DB)` / `kvJoin(rows)` 두 개가 전부다.
- 앱 안의 `DB` 모양은 **바뀌지 않는다**. 화면 코드는 0줄 수정한다.

### P1-4. 저장 흐름 (doSave 교체)
1. `kvSplit(DB)` 로 키별 문자열을 만든다. 각각을 **기준본 해시**(마지막으로 서버와 맞춘 값)와 비교해 **바뀐 키만** 고른다.
2. RPC `kv_save(changes)` 를 한 번 부른다. `changes` 는 `[{key, data, rev}]` 이다.
   - 서버는 **모든 키의 rev 가 맞을 때만** 한 트랜잭션으로 반영하고 각 rev 를 +1 한다. (예: 결제 확정처럼 키 여러 개가 같이 바뀌어도 반만 저장되는 일이 없다)
   - 하나라도 어긋나면 아무것도 쓰지 않고 `conflicts:[{key, data, rev}]` 를 돌려준다.
3. 충돌이 나면 **어긋난 키만** 3자 병합한다. 기존 `mrg3` 를 키 단위로 재사용한다. 병합한 뒤 다시 `kv_save` 한다.
4. 기존의 보호 장치는 그대로 둔다: 저장은 한 줄로 서기(SAVE_INFLIGHT) · rb_pending(보내기 전 로컬 보관) · 실패 배지 · 5회 재시도.

**효과(예상):** 뽀모 한 판 = `study/pomos` 3K + `pref` 1K. 지금은 950K 를 올린다 → **약 200분의 1**. 생활사가 거래를 고쳐도 학습 키와는 충돌하지 않는다.

### P1-5. 이중 쓰기 — 옛 덩어리와 양방향으로 맞춘다 (서버 트리거)
- **kv → 덩어리:** `app_kv` 가 바뀌면 트리거가 `app_state.data` 의 해당 경로만 `jsonb_set` 으로 고친다. 옛 방식으로 덩어리를 읽는 방·스크립트·백업이 계속 정상으로 돈다.
- **덩어리 → kv:** 방이 옛 습관대로 `app_state` 를 직접 고치면, 트리거가 키별로 비교해 **바뀐 키만** app_kv 로 옮긴다. 이 과정에서 rev 가 올라가므로, 열린 탭은 다음 저장 때 그 키만 병합한다.
- 무한 반복 방지: 세션 변수 `app.sync_origin` 으로 트리거끼리 서로를 다시 부르지 않게 한다.
- 스냅샷(`app_state_snap`)은 이 기간에도 덩어리 기준으로 찍는다(변경 없음).

### P1-6. 전환 판정 · 되돌리기
- 매일 자동 대조(`kv_verify()`): `kvJoin(app_kv) == app_state.data` 가 정규화한 문자열 비교로 일치해야 한다. 불일치가 생기면 배지를 띄우고 핸드오프에 기록한다.
- 1~2주 동안 불일치 0이면 전환한다. 덩어리는 **읽기 전용 보관본**이 된다(트리거 kv→덩어리는 유지할지 그때 결정한다).
- **되돌리기:** 앱 설정에서 `KV_ON=false` 로 바꾸면 옛 `doSave` 경로로 돌아간다. 데이터는 이중 쓰기 덕에 양쪽 모두 최신이다.

### P1-7. 테스트
- 신규 t70~:
  - kvSplit/kvJoin 왕복이 손실 없이 되는지(실데이터 스냅샷 사용)
  - 바뀐 키만 전송되는지
  - 다중 키 원자성
  - 키별 충돌 → 그 키만 병합되는지
  - ui 가 기기 로컬로 가는지(pomoRun 은 공유)
  - KV_ON 끄기 → 옛 경로
- 기존 50여 개: `_fake_sb.js` 위에서 전부 통과해야 한다.

---

## P2 — 쓰기 창구 · 이력 · actor (1~2일) · 효과: 여러 AI 동시 작업

### P2-1. 이력 테이블
```sql
create table public.events (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid not null,
  actor text not null,          -- rohan · 생활사 · 순환기 · 학습 · 사주 · 제작사 · api:<이름>
  verb text,                    -- finish_pomodoro · add_txn · kv_save …
  target text not null,         -- 'kv:transactions' · 'fin_txn:<id>' …
  op text not null,             -- insert · update · delete
  diff jsonb                    -- 바뀐 필드만 {path: [before, after]}
);
```
- app_kv(이후 도메인 테이블)의 트리거가 자동으로 쓴다. kv 의 diff 는 배열 원소 id 단위로 계산한다(거래 1건 변경 = 1 이벤트).
- `activity` 키(최근 200줄)는 events 를 읽어 보여주는 화면으로 바뀐다. 저장 대상에서 빠지므로 「모든 저장에 끼는 키」가 사라진다.

### P2-2. actor 와 권한
```sql
create table public.actors (
  name text primary key,          -- '생활사'
  scopes text[] not null,         -- {'fin.*','insurance.*'}
  token_hash text,                -- P5 외부 API 용 (방은 null)
  active boolean default true
);
```
| actor | scopes (안 — 착수 날 확정) |
|---|---|
| rohan | `*` |
| 생활사 | fin.* · insurance.* · tax.* · sources |
| 순환기 | health.* · sources |
| 학습 | study.* · sources |
| 사주 | saju.* · sources |
| 제작사 | `*` (구조 작업 · 단, 착수 공지 후) |

### P2-3. 쓰기 창구 (RPC) — 1차 목록
| 동사 | 인자 | 하는 일 |
|---|---|---|
| `kv_save(changes)` | P1 | 앱의 일반 저장 |
| `finish_pomodoro(p)` | 시작·끝·분·메모·과목 | study/pomos 에 1건 추가 + pref.pomoRun 해제 |
| `toggle_check(date, routine, v)` | | checks 1칸 |
| `add_txn(t)` · `edit_txn(id, patch)` · `void_txn(id, why)` | | 거래 1건 (void = deleted 표시) |
| `settle_card(card, cycle, picks, date, acct)` | | 회차 진행 + settle 1건 — **한 트랜잭션** |
| `log_drill(d)` · `add_words(list)` | | 학습 |
| `add_weight(w)` · `add_lab(date, values)` | | 건강 |

- 모든 동사는 `rb_call(actor, verb, args)` 한 입구를 지난다. 입구에서 scope 를 확인하고, `set_config('app.actor', …)` 로 actor 를 박은 뒤 실행한다. 그래서 트리거가 이력에 actor 를 남긴다.
- **방이 SQL 로 직접 쓰는 것을 막는 장치:** 트리거가 `app.actor` 가 비어 있는 직접 UPDATE 를 **거절**하고, 「rb_call 을 써라」라는 메시지를 낸다. 트리거는 슈퍼유저(MCP)에게도 걸리므로, 방이 습관대로 쓰려 해도 막힌다.
  - 예외: 제작사의 이주 작업은 `app.actor='제작사'` 를 명시하고 실행한다.
- 스킬·핸드오프 갱신: 각 방의 스킬에 「쓰기는 rb_call 로만」과 동사 목록을 넣는다.

### P2-4. 테스트
- scope 밖 동사 호출 → 거절
- actor 없는 직접 UPDATE → 거절
- settle_card 원자성(중간 실패 시 회차 진행 없음)
- events diff 정확성
- 활동 화면 = events

---

## P3 — 건별 테이블 (영역당 1일 + 관찰) · 효과: 같은 영역 안에서도 충돌 없음

### P3-1. 순서 (빈도 × 크기 × 동시 작성자 수)
1. **life**: `life_pomodoro` · `life_check` · `life_timelog` · `life_meal` — 로한이 매일, 가장 자주 쓴다
2. **study**: `study_word` · `study_sent` · `study_unit` · `study_drill` · `study_error` — 가장 크다. 학습방과 동시에 쓴다
3. **fin**: `fin_txn` · `fin_account` · `fin_card` · `fin_debt` · `fin_budget` — 생활사와 동시에 쓴다. 정합성이 가장 중요해서 마지막에 신중하게
4. health(weights·metrics·lab) · insurance · journal · goals/routines · items/rewards — 필요해지면

### P3-2. 공통 행 모양
```sql
create table public.fin_txn (
  id text primary key,            -- 지금의 uid() 그대로 (이주 시 id 보존)
  user_id uuid not null,
  date date not null, type text not null, method text, amt numeric not null, cat text,   -- 자주 거르는 칸은 실제 칸
  data jsonb not null default '{}',   -- 나머지 필드(memo·inst·instDone·card·catMix …)
  rev int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text not null,
  deleted_at timestamptz             -- 지우지 않는다
);
create index on public.fin_txn (user_id, date);
```
- 앱 쪽: 해당 키를 kv 대신 테이블 행에서 모은다. `DB.transactions` 배열 모양은 유지한다. 저장할 때는 기준본과 비교해 **바뀐 원소만** upsert 한다(rev 확인). 화면 코드는 그대로다.
- 충돌은 **같은 행을 동시에 고쳤을 때만** 생긴다 → 필드 단위로 병합하고, 같은 필드면 나중 것이 이긴다. 이전 값은 events 에 남는다.
- 이주: kv 키 → 테이블 행. 이중 쓰기 → 매일 대조 → 전환. 영역별로 따로 되돌릴 수 있다.

---

## P4 — 동기화·속도 (1일)
| 항목 | 지금 | v5 |
|---|---|---|
| 시작 | 95만 자 내려받기 → 화면 | IndexedDB 캐시로 **즉시** 화면 → `updated_at > 커서` 인 변경분만 받기 |
| 다른 쪽 변경 | 탭을 다시 열 때까지 모름 | Supabase Realtime 구독 → 몇 초 안에 반영(보고 있는 화면은 조용히 다시 그림) |
| 저장 | 95만 자 | 바뀐 행만 (수백 바이트) |
| 오프라인 | 실패 배지 | 로컬 대기열 → 연결되면 순서대로 보냄(rb_pending 일반화) |

- 「탭이 다시 보이면 변경분 받기」(visibilitychange)를 기본으로 하고, Realtime 은 그 위에 얹는다(Realtime 이 끊겨도 맞게 동작해야 한다).

## P5 — 외부 API (필요할 때)
- Edge Function `rb-api`: 토큰 → actors.token_hash 대조 → scope → `rb_call`. 호출 한도와 이력이 붙는다.
- 쓰임 예: 은행·카드 내역 자동 수집기, 체중계, 다른 AI 에이전트.
- 토큰을 폐기하면 즉시 차단된다.

## P6 — 코드 모듈화 (천천히, 기능 작업과 함께)
- 15,000줄 index.html → `core/`(sync·kv·events·ui 틀) + `domains/fin|study|life|health|…`. 빌드 없이 ES modules 로 한다. 단일 파일 배포 원칙은 착수 날 재논의한다.
- 순서: 저장 계층(P1~P4 에서 이미 떼어 냄) → 도메인별로 기능 작업을 할 때 옮긴다(빅뱅 금지).

---

## 일정 (예시 · 업데이트 없는 날 기준)
| 날 | 작업 | 그 뒤 |
|---|---|---|
| D1 | P0 + P1 구현 · 이중 쓰기 시작 | 1~2주 관찰 (평소처럼 사용) |
| D2 | P1 전환 판정 + P2 | 며칠 관찰 · 방 스킬 갱신 |
| D3 | P3-life | 1주 관찰 |
| D4 | P3-study | 1주 관찰 |
| D5 | P3-fin | 2주 관찰 |
| D6 | P4 | — |
| 필요 시 | P5 · P6 | — |

## 착수 날 로한에게 물을 것
1. 이중 쓰기 관찰 기간 (1주 / 2주)
2. actor ↔ scope 표 (P2-2) 확정
3. 「방의 직접 SQL 쓰기 차단」을 P2 에서 바로 켤지, 경고만 먼저 낼지
4. 영구 삭제 권한 = 로한만 (권장)
5. 단일 파일 원칙 유지 여부 (P6)

## 각 단계 공통 체크리스트
- [ ] 📀 스냅샷 「P? 착수 전」
- [ ] 로한 열린 탭 공지 → 끝나면 새로고침 요청
- [ ] `run.sh all` + 신규 테스트 통과
- [ ] 이중 쓰기 대조 0 불일치
- [ ] 핸드오프(id 15) 계약 갱신 · 방 스킬 갱신
- [ ] GitHub Desktop 커밋 문구 전달
