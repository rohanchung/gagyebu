---
name: rohanbook-write
description: 로한북 데이터(가계부 거래·계좌·예산·학습 단어/예문/단원·건강 체중/검사·사주 풀이 등)를 담당사로서 고치거나 추가할 때 반드시 따르는 쓰기 규칙. "가계부에 넣어", "거래 고쳐", "단어 추가", "체중 기록", "로한북 데이터 수정" 등 로한북 Supabase(ytkbrdgbklnijbwkvino)에 쓰는 모든 작업에 발동한다. 쓰기는 rb_call 창구로만 한다.
---

# 로한북 쓰기 창구 (v5 P2)

로한북 데이터는 키별 행(`public.app_kv`)에 들어 있다. **담당사는 SQL 로 데이터를 직접 UPDATE 하지 않는다.**
쓰기는 언제나 `rb_call(actor, verb, args)` 한 곳으로 한다.

창구를 거치면 좋은 점:
- 레코드 한 건만 원자적으로 바뀐다. 로한이 같은 시간에 다른 것을 해도 충돌하지 않는다.
- 누가·무엇을·왜 바꿨는지 `events` 에 자동으로 남는다. 지운 레코드도 원본째 남는다.
- 권한 밖의 키, 잘못된 값(금액이 숫자가 아닌 것 등), 중복 id 는 서버가 거절한다.

> 창구를 안 거치고 직접 SQL 로 쓰면(`app_state` jsonb_set 이나 `app_kv` UPDATE) 지금은 막지 않는다. 대신 이력에 **`direct-sql`** 로 찍히고, 로한의 🧾 이력 화면에 경고 색으로 보인다. 다음 단계에서는 막힌다.

## actor 와 권한
| actor | 쓸 수 있는 키 |
|---|---|
| 생활사 | transactions · accounts · cards · debts · budgets · tax · taxParams · netSnapshots · categories · items · insurance/* |
| 순환기 | health/* · healthPeople |
| 학습 | study/* (words · sents · units · drills · errors · pomos · tests · strategy · rest) |
| 사주 | saju/* (readings · rest) |
| 제작사 | * (구조 작업 — 로한에게 착수를 알린 뒤) |

키 목록과 크기는 이렇게 본다.
```sql
select key, rev, length(data::text) chars, updated_by, updated_at from app_kv order by key;
```

## 동사
| 동사 | args | 쓰는 곳 |
|---|---|---|
| `rec_add` | `{key, rec}` 또는 `{key, recs:[…]}` (id 가 없으면 서버가 만든다) | 레코드 배열 — transactions, study/words … |
| `rec_edit` | `{key, id, patch}` — patch 의 필드만 바뀐다. 값이 `null` 인 필드는 지운다. id 는 바꿀 수 없다 | 〃 |
| `rec_remove` | `{key, id, why}` — **why 필수** | 〃 |
| `map_put` | `{key, sub, value}` | 날짜·이름 맵 — checks, timelog, meals, budgets … |
| `map_del` | `{key, sub, why}` — **why 필수** | 〃 |
| `kv_put` | `{key, data, why}` — 통째 교체. 레코드 배열에는 쓸 수 없다 | 작은 설정 객체(study/strategy 등) |

모든 동사에 `why`(이유)를 붙이기를 권장한다. 이력 화면에 그대로 보인다.

### 칸 안쪽 배열 — `path` (2026-11-23)
객체 칸 **안에 든 레코드 배열**(예: `health/rest` 의 `events`, `healthPeople` 의 `mom` → `events`)도 한 건씩 다룬다.
`rec_add` · `rec_edit` · `rec_remove` 에 `path`(문자열 배열)를 붙인다. 배열을 통째로 다시 짜지 않는다.
```sql
-- 검진 이벤트 한 건만 고친다 (상태 · 날짜 · 결과)
select rb_call('순환기','rec_edit', $${"key":"health/rest","path":["events"],"id":"x예시아이디",
  "why":"검진 시행 완료","patch":{"status":"완료","treatment":"결과 요약(예시)"}}$$::jsonb);
-- 가족(어머니) 이벤트 추가
select rb_call('순환기','rec_add', $${"key":"healthPeople","path":["mom","events"],"why":"진료 기록",
  "rec":{"date":"2026-01-15","name":"예시 진료"}}$$::jsonb);
```

`map_put` · `map_del` 도 `path` 를 받는다(2026-11-23 · 칸 안쪽 객체의 한 칸만). 바깥 칸이 없으면 거절한다 — 바깥부터 만든다.

### 📜 토정비결 2판 — `saju/readings` 의 `tojeong:YYYY` (사주 actor)
출처를 따로따로 넣어도 서로 덮지 않게, **바깥 틀 한 번 → 출처 한 줄씩 → 종합** 순서로 넣는다.
```sql
-- ① 틀 (해마다 한 번 · 이미 있으면 건너뛴다)
select rb_call('사주','map_put', $${"key":"saju/readings","sub":"tojeong:2027","why":"2027 토정 틀",
  "value":{"v":2,"year":2027,"madeAt":"2026-11-23","gwae":null,"sources":[],"synth":null}}$$::jsonb);
-- ② 출처 하나 (kind: room=우리 방 · vendor=외부 업체 / luck: good·mixed·bad·null — 쓴 쪽이 말한 것만)
select rb_call('사주','rec_add', $${"key":"saju/readings","path":["tojeong:2027","sources"],"why":"출처 추가(예시)",
  "rec":{"id":"s1","who":"예시업체","kind":"vendor","gwae":{"no":"000","name":"예시 괘"},"title":"예시 제목",
         "body":"요지를 옮겨 적은 글(예시)","months":{"1":{"t":"예시","luck":"good"}},"src":"예시 앱","at":"2026-11-23"}}$$::jsonb);
-- 출처 하나 고치기
select rb_call('사주','rec_edit', $${"key":"saju/readings","path":["tojeong:2027","sources"],"id":"s1","why":"오타","patch":{"title":"고친 제목"}}$$::jsonb);
-- ③ 종합(정리한 한 판) · 종합의 한 달만
select rb_call('사주','map_put', $${"key":"saju/readings","path":["tojeong:2027"],"sub":"synth","why":"종합",
  "value":{"by":"점술부장","summary":"예시 총평","months":null,"keys":["예시"],"note":"갈린 곳 정리(예시)"}}$$::jsonb);
select rb_call('사주','map_put', $${"key":"saju/readings","path":["tojeong:2027","synth","months"],"sub":"3","why":"3월 종합",
  "value":{"t":"예시","luck":"mixed"}}$$::jsonb);
```
서버가 거절하는 것: `kind`·`luck` 이 정한 값 밖 · 출처 id 겹침 · 달 키가 1~12 밖 · `year` 가 키의 해와 다름. 합의(몇 곳이 같은 길흉)는 넣지 않는다 — 화면이 센다. 외부 업체 글은 통째로 붙이지 말고 요지를 옮겨 적는다.

## 예시
```sql
-- 거래 추가
select rb_call('생활사','rec_add', $${"key":"transactions","why":"카드 청구서 대사 — 누락분(예시)",
  "rec":{"type":"expense","amt":12000,"date":"2026-01-15","cat":"취미비용","method":"예시카드","card":true,"memo":"예시 물건"}}$$::jsonb);

-- 결제액 정정 (해당 settle 한 건만)
select rb_call('생활사','rec_edit', $${"key":"transactions","id":"x예시아이디","why":"실청구액","patch":{"amt":12000}}$$::jsonb);

-- 단어 여러 개
select rb_call('학습','rec_add', $${"key":"study/words","why":"11/6 단원 7 단어","recs":[{"jp":"猫","kana":"ねこ","ko":"고양이"}]}$$::jsonb);

-- 예산 한 칸
select rb_call('생활사','map_put', $${"key":"budgets","sub":"통신비","value":100000,"why":"고정비 편입(예시)"}$$::jsonb);
```
반환값: `{"ok":true,"key":…,"rev":…,"ids":[…]}`. 실패하면 이유와 함께 예외가 난다. 고친 다음 다시 부른다.

## 쓰기 전·후 확인
1. 고칠 레코드를 먼저 읽는다.
   ```sql
   select x from app_kv, jsonb_array_elements(data) x where key='transactions' and x->>'id'='x예시아이디';
   ```
2. 부른다.
3. 결과를 다시 읽고, 이력을 본다.
   ```sql
   select at, actor, verb, target, note, diff from events order by id desc limit 5;
   ```
4. 덩어리(app_state)와 어긋나지 않았는지 확인한다. 이중 쓰기 기간(~2026-11-20)에는 결과가 `{"ok":true}` 여야 한다.
   ```sql
   select kv_verify();
   ```
5. 로한에게 한국어로 보고한다: 무엇을 · 몇 건 · 왜 · 로한북에서 어디서 보이는지.

## 하지 말 것
- `update app_state …` / `update app_kv …` 로 직접 쓰는 것. 🔴 **app_state 직접 쓰기는 2026-11-23 부터 서버가 거절한다** — 2026-11-21 부터는 써도 앱에 닿지 않고 사라졌다. app_kv 직접 쓰기는 이력에 direct-sql 로 남는다.
- 레코드 배열을 통째로 바꾸는 것(`kv_put` 으로 transactions 등).
- 이유 없이 지우는 것.
- 다른 담당사의 키를 쓰는 것. 필요하면 핸드오프로 그 방에 요청한다.
- 증빙 원장은 이 스킬이 아니라 `rohanbook-evidence`(📂 증빙함)로 올린다.
