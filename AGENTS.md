# Repository Agent Guide

## Product invariant

This is a meme court, not a legal service. Every verdict surface must show:

`이 판결은 밈입니다. 실제 법률 판단이나 법률 조언이 아닙니다.`

The original statement is browser-local. Never add it to `CreateCaseRequest`, server logs, D1, analytics, error reporting, or URL parameters. Only the separately reviewed `publicStatement` may cross the network after explicit consent.

## Architecture

- `src/client/**`: authoring UI, local model worker, local history and local party vote.
- `src/shared/**`: pure analysis/verdict contracts reused by client and Worker.
- `src/server/**`: one Cloudflare Worker, prepared D1 SQL, validation, HMAC identities, optional Turnstile and cleanup.
- No Express, NestJS, Next.js, ORM, external DB, paid API, account, OAuth, feed, search, ranking, polling or analytics.
- Keep public/global votes separate from local party votes.
- Hidden and expired cases always return the same generalized 404.

## Change rules

- Do not push directly to `main`; use a branch and PR.
- Use prepared statements, explicit selected columns and bounded result sets. `SELECT *` is forbidden.
- Preserve `false`, zero counters, idempotency and non-negative vote counters.
- Do not add a production dependency without explicit approval.
- Migration, auth/admin security, secrets, Cloudflare bindings, workflows, model replacement, retention expansion, rate-limit weakening and safety-policy weakening are protected changes and must not auto-merge.
- Run `pnpm cost:check` for every change and `pnpm test:e2e` for UI or flow changes.

## Self-improvement trigger

사용자가 "자가개선 루프 돌려줘"라고 입력하면 `docs/SELF_IMPROVEMENT.md`와 `maintainer-bot/project.json`을 읽고, 현재 cadence에 맞는 1회의 end-to-end 자가개선 루프를 실행한다. PR 생성, 검증, red-team review, 조건부 자동 merge까지 수행한다.

다음 표현도 같은 의미다.

- 자가개선 루프 실행해
- 자가개선 한 번 돌려줘
- improvement loop 실행

GitHub에서 실제로 병합되고 `self-improvement` 및 size label이 붙은 PR만 cadence를 진행시킨다. `small → small → small → small → major`를 지키며 major가 실패하면 다음 실행도 major다. 강제 small은 `cadence:override`로 제외한다.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm cost:check
pnpm test:e2e
```
