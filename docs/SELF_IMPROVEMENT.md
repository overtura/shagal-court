# Self-Improvement v2

## 실행

```bash
pnpm improve:status
pnpm improve:dry
pnpm improve
pnpm improve:small
pnpm improve:major
```

Windows wrapper는 `scripts/run-self-improvement.ps1`, Unix entry는 `.sh`다. 중앙 bot은 다음 순서로 찾는다.

1. `SELF_IMPROVING_BOT_HOME`
2. repository sibling `../self-improving-maintainer-bot`
3. `maintainer-bot/project.json`의 `centralBotPath`

없으면 clone하지 않고 설정 방법을 출력한다.

## cadence

실제로 merged되고 `self-improvement`와 size label이 있는 PR만 센다.

`small → small → small → small → major → 반복`

- open, closed, draft, review 실패 PR은 세지 않는다.
- major가 병합되지 않으면 다음 실행도 major다.
- 사용자 강제 small은 `cadence:override`로 집계에서 제외한다.
- GitHub가 가능하면 항상 label 이력을 권위로 사용한다.
- GitHub 조회가 실패할 때만 `cadence-state.json`을 사용하고, 복구되면 GitHub로 state를 고친다.

fixture는 `tests/shared/cadence.test.ts`에서 이력 없음, small 4개, major 실패, override, major merge reset을 검증한다.

## small

하나의 작은 사용자 문제, 최대 8 files/300 changed lines, production dependency 0, 완결된 test와 browser verification이 기준이다.

## major

하나의 사용자-visible vertical slice이며 flow/UI, domain logic, persistence/rendering, failure/fallback, tests/eval, operations 중 최소 3개를 연결한다. 최대 22 files/1500 lines이고 docs-only, TODO, mock-only, 가짜 버튼은 실패다. acceptance criteria와 신규 E2E 또는 실패 재현을 먼저 만든다.

major backlog에서 `ready`, 높은 사용자 가치, 현재 구조에서 완결, 최근 PR과 비중복, 외부 유료 서비스 없음, safe path 순으로 선택한다. protected 후보만 있으면 같은 가치의 safe 대안을 선택한다.

## merge gate

자동 merge는 non-draft, risk:r1/r2, allowPaths 안, denyPaths 없음, `pnpm verify`, Playwright mobile/desktop, 회귀+신규 test, Codex red-team PASS, unresolved thread 0, production dependency 0, 구현/문서 일치, major acceptance 완료일 때만 squash로 수행한다. review 대응은 최대 3회다.

DB migration, auth/admin security, secret, Cloudflare binding, workflow, model, 개인정보 확대, 외부 유료 API, rate/safety 완화는 protected `risk:r3`이고 proposal/draft와 human review만 허용한다.

## central bot

프로필은 `maintainer-bot/profiles/shagal-court-small.json`과 `-major.json`이다. 중앙 bot runner에 절대 경로로 전달할 수 있어 중앙 repository 수정 없이 dry-run 가능하다. 영구 등록이 필요하면 먼저 다음으로 검증한다.

```powershell
.\scripts\register-maintainer-profiles.ps1 -DryRun
```

실제 등록은 중앙 bot worktree가 clean이고 별도 branch/PR 계획이 있을 때만 수행한다. self-improvement run은 production secret을 읽거나 출력하지 않는다.
