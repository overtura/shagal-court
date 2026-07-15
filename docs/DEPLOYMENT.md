# 배포

## 현재 상태 (2026-07-15)

로컬 D1 migration, 전체 검증, production build까지 완료했다. 현재 작업 환경은 Wrangler에 로그인되어 있지 않아 remote D1 생성·migration·production deploy는 실행하지 않았다. 아래 최초 remote 설정을 인증된 운영자가 수행하고, 생성된 D1 ID를 review 가능한 설정 변경으로 반영해야 한다.

## 전제

Node.js 22.15+와 pnpm 10, Cloudflare account, `wrangler login` 또는 제한된 API token이 필요하다. Node.js 24 LTS를 권장한다.

## 로컬

```bash
pnpm install --frozen-lockfile
copy .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm verify
pnpm test:e2e
```

`.dev.vars`는 local dummy secret만 포함하고 commit하지 않는다.

## 최초 원격 설정

```bash
wrangler login
wrangler d1 create shagal-court-db
```

출력된 `database_id`를 `wrangler.jsonc`의 placeholder에 넣는다. 이 변경은 Cloudflare binding protected change이므로 review 후 병합한다.

Cloudflare dashboard 또는 CLI로 secret을 등록한다.

```bash
wrangler secret put HMAC_SECRET
wrangler secret put ADMIN_TOKEN
# 선택 사항
wrangler secret put TURNSTILE_SECRET
```

Turnstile을 쓰면 `TURNSTILE_HOSTNAME`과 client build의 `VITE_TURNSTILE_SITE_KEY`도 production 환경에 설정한다. secret은 build log, PR, artifact에 출력하지 않는다.

## 마이그레이션과 Cloudflare 배포

초기 D1 생성 및 명시적 승인 후에만 실행한다.

```bash
pnpm db:migrate:remote
pnpm deploy
```

배포 후 `/api/health`, 로컬 판결, 공개 확인, 공유 URL, 투표 변경, 신고를 간이 검증한다. 운영 배포는 병합과 별도 단계다.

## Vercel 프런트엔드 배포

`vercel.json`은 `dist/client` 정적 결과와 단일 페이지 경로 재작성을 배포한다. Vercel 빌드에서는 시스템 변수 `VERCEL=1`을 감지해 익명 공개·전역 투표 UI를 숨기고, 브라우저 로컬 판결 체험만 제공한다. Cloudflare D1과 Worker API는 Vercel에서 실행되지 않으므로 전체 공개 기능의 운영 주소로 간주하지 않는다.

```bash
vercel --prod
```

Vercel 배포 후 루트 문서, `/case/:slug` 단일 페이지 진입, 한글 메타데이터, CSP·권한 제한 헤더, 로컬 판결 흐름을 확인한다.

## 되돌리기

Worker version을 Cloudflare dashboard에서 이전 version으로 rollback한다. schema는 additive/compatible migration만 허용하고 migration rollback은 별도 승인 절차로 다룬다. 로컬 판결은 backend rollback과 무관하게 유지된다.
