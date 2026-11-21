# showmethemoney

로한북 — 단일 `index.html` 앱. Pages: https://rohanchung.github.io/gagyebu

## 🔒 이 저장소에는 실데이터가 없다
- 데이터의 원본은 서버(Supabase `app_kv`)뿐이다. `index.html` 의 씨앗은 빈 틀이다(v5.14).
- 테스트(`tests/`)의 금액·이름·날짜는 **지어낸 값**이다.
- 실데이터가 든 문서는 비공개 저장소 `gagyebu-dev`(옆 폴더 `showmethemoney-dev`)에 있다.

## dev 로 옮긴 파일 (2026-11-20 · 핸드오프 id 64)
방들이 읽던 경로가 바뀐 것 — 파일 이름만 적는다.

**옮김(공개에서 뺌)**
- `backups/rohanbook_2026-08-18_pre-v6.json`
- `Claude outputs/` 화면 캡처 40장
- `handoff_0814.md` · `handoff_0818.md` · `handoff_0819.md` · `handoff_0820.md` · `handoff_0821.md` · `handoff_0824.md` · `handoff_0825.md`
- `STATUS.md`
- `0901_기초잔액_정합계획.md`

**공개본은 남기고 원본은 dev 에** — 공개본의 실제 금액은 「(실제 금액 — dev 원본)」 자리표다
- `tax-design.md` · `ui-frame-plan.md` · `card-design.md` · `cashflow-design.md` · `data-safety.md` · `goal-design.md`
- `skills/rohanbook-write/SKILL.md`(+`.zip`) · `skills/rohanbook-evidence/SKILL.md`(+`.zip`) — 예시를 지어낸 값으로

## 테스트
```
HTML=index.html NODE_PATH=<_testenv>/node_modules bash tests/run.sh all
```
