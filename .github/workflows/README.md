# CI

`test.yml` — 푸시하면 GitHub 이 `bash tests/run.sh all` 로 25개 스위트를 돌린다.
(`./run.sh` 가 아니라 **`bash`** 다 — git index 의 run.sh 모드가 100644 라 실행권한이 없다.
 윈도우 커밋 + `filemode=false` 조합이면 작업트리의 +x 가 git 에 올라가지 않는다.)

- 결과는 커밋 옆 ✓/✗ 로 보인다. GitHub Desktop 에서도 보인다.
- 실패하면 `test-logs` 아티팩트에 스위트별 로그가 붙는다.
- 손으로 돌리려면 GitHub → Actions → tests → Run workflow.

🔒 **테스트 파일에 크로미움 경로를 박지 마라.** `process.env.CHROME` → `/opt/pw-browsers/chromium`(있으면)
→ playwright 번들 순으로 찾는다. 이 순서가 깨지면 CI 가 먼저 죽는다.
