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

## 예시
```sql
-- 거래 추가
select rb_call('생활사','rec_add', $${"key":"transactions","why":"삼성 11/25 청구서 대사 — 누락분",
  "rec":{"type":"expense","amt":50144,"date":"2026-10-09","cat":"취미비용","method":"삼성 탭탭오","card":true,"memo":"트랜스포트 피버3"}}$$::jsonb);

-- 결제액 정정 (해당 settle 한 건만)
select rb_call('생활사','rec_edit', $${"key":"transactions","id":"xlj4vwxj","why":"실청구액","patch":{"amt":403489}}$$::jsonb);

-- 단어 여러 개
select rb_call('학습','rec_add', $${"key":"study/words","why":"11/6 단원 7 단어","recs":[{"jp":"猫","kana":"ねこ","ko":"고양이"}]}$$::jsonb);

-- 예산 한 칸
select rb_call('생활사','map_put', $${"key":"budgets","sub":"국민연금","value":122020,"why":"고정비 편입(로한 결정)"}$$::jsonb);
```
반환값: `{"ok":true,"key":…,"rev":…,"ids":[…]}`. 실패하면 이유와 함께 예외가 난다. 고친 다음 다시 부른다.

## 쓰기 전·후 확인
1. 고칠 레코드를 먼저 읽는다.
   ```sql
   select x from app_kv, jsonb_array_elements(data) x where key='transactions' and x->>'id'='xlj4vwxj';
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
- `update app_state …` / `update app_kv …` 로 직접 쓰는 것. 이력에 direct-sql 로 남고, 다음 단계에서 막힌다.
- 레코드 배열을 통째로 바꾸는 것(`kv_put` 으로 transactions 등).
- 이유 없이 지우는 것.
- 다른 담당사의 키를 쓰는 것. 필요하면 핸드오프로 그 방에 요청한다.
- 증빙 원장은 이 스킬이 아니라 `rohanbook-evidence`(📂 증빙함)로 올린다.
