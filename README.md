# 샤갈 재판소

![상아색 사건 기록지 위를 검은 붓 획과 붉은 판결 도장이 가로지르는 샤갈 재판소 추상 이미지](public/shagal-court-social.png)

억울하거나 황당한 일을 한 줄로 적으면 브라우저 로컬 임베딩과 결정론적 규칙으로 밈 판결을 만드는 개인정보 보호 중심 웹앱입니다. 원문은 공개 동의 전까지 브라우저를 떠나지 않습니다. 사용자가 별도로 확인한 공개 문장만 최대 90일 동안 Cloudflare D1에 보관되며, 검색에 노출되지 않는 고유 URL에서 익명 배심원 투표와 신고를 받을 수 있습니다.

> 이 판결은 밈입니다. 실제 법률 판단이나 법률 조언이 아닙니다.

## 핵심 경계

- 로컬 분석: `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, WebGPU → WASM → 결정론적 fallback
- 서버: 하나의 Cloudflare Worker, Static Assets, D1, 선택적 Turnstile
- 개인정보: 원본 IP·User-Agent·fingerprint를 저장하지 않고 random device ID의 HMAC만 저장
- 공개: 명시적 동의 후 검토한 한 문장만 전송, 검색·피드·랭킹 없음
- 비용: Workers/D1 Free 한도 안에서만 동작하고 초과 시 공개 기능만 제한
- 만료: 사건은 기본 90일 후 scheduled cleanup으로 삭제

## 빠른 시작

Node.js 22.15 이상과 pnpm 10이 필요합니다. 최신 Cloudflare Vite 플러그인을 위해 Node.js 24 LTS를 권장합니다.

```bash
pnpm install
copy .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm dev
```

`.dev.vars`의 `HMAC_SECRET`과 `ADMIN_TOKEN`은 로컬 전용 임의 문자열로 교체합니다. 이 파일은 Git에서 제외됩니다.

## 명령

```text
pnpm dev                Vite + local workerd 개발 서버
pnpm build              strict typecheck + Cloudflare production build
pnpm lint               ESLint
pnpm typecheck          DOM client와 Worker 전역을 분리한 strict 검사
pnpm test               client/shared + Workers/D1 테스트
pnpm test:client        React, localStorage, verdict, privacy 경계
pnpm test:worker        실제 workerd + local D1 migration 통합 테스트
pnpm test:e2e           Playwright 1440/768/360 E2E
pnpm cost:check         무료 비용·binding·secret·SQL 가드
pnpm verify             lint/typecheck/test/build/cost 통합 검증
pnpm deploy             Cloudflare Worker 배포
pnpm db:migrate:local   local D1 migration
pnpm db:migrate:remote  명시적으로 승인된 remote D1 migration
pnpm improve:status     다음 self-improvement size 확인
pnpm improve:dry        중앙 bot dry-run
pnpm improve            cadence에 맞는 1회 end-to-end 루프
```

## 구조

```text
src/client/        React UI, browser model worker, localStorage, API client
src/server/        Worker router, D1 queries, validation, security, cleanup
src/shared/        client와 Worker가 공유하는 판결 계약과 순수 엔진
migrations/        초기 D1 schema
tests/             client/shared와 workerd/D1 테스트
e2e/               실제 브라우저 전체 흐름
docs/              제품·운영·보안·비용 문서
maintainer-bot/    small/major profile, cadence, eval, backlog
scripts/           비용 가드, profile 등록, self-improvement wrapper
```

자세한 내용은 [제품](docs/PRODUCT.md), [아키텍처](docs/ARCHITECTURE.md), [개인정보](docs/PRIVACY.md), [안전](docs/SAFETY.md), [배포](docs/DEPLOYMENT.md), [자가개선](docs/SELF_IMPROVEMENT.md)을 참고하세요.
