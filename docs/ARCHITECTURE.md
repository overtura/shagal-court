# Architecture

## 한 문장

정적 React 앱과 `/api/*`를 한 Cloudflare Worker 배포에 묶고, 브라우저가 로컬 분석을 수행하며 Worker가 공개 데이터만 검증·재판결해 D1에 저장한다.

## 데이터 흐름

```text
original statement
  -> browser model worker (WebGPU/WASM)
  -> shared pure verdict engine
  -> localStorage history and local party vote
  -> explicit publish confirmation
  -> publicStatement + validated analysis only
  -> Worker validation / Turnstile / rate and daily limits
  -> shared verdict engine recalculation
  -> prepared D1 statements
  -> unlisted share URL / global vote / report
```

## 경계

- Client는 원문, 모델 다운로드 상태, 로컬 이력, 공개 확인 UI를 소유한다.
- Shared는 category, analysis, verdict template, deterministic score만 소유한다. Worker도 이 코드를 사용한다.
- Server는 body 크기·schema·content·identity·limit·idempotency·persistence를 소유한다.
- D1 query는 작은 모듈과 prepared statement를 사용한다. 범용 repository/DI/event bus는 없다.

## 실행

Cloudflare Vite Plugin은 client와 `src/server/index.ts`를 함께 빌드한다. Static Assets는 SPA fallback을 사용하고 `/api/*`만 Worker를 먼저 실행한다. scheduled handler는 만료 사건과 rate limit row를 batch로 정리한다.

## 실패

- 모델 로드/WebGPU/WASM 실패: 동일 입력의 deterministic fallback.
- 공개 API 실패: 로컬 판결과 이력 유지, 재시도 가능한 오류 메시지.
- Turnstile 실패: 공개 차단, 로컬 기능 유지.
- 일일 한도 초과: `daily_limit_reached`, 로컬 기능 유지.
- 숨김/만료/없는 slug: 동일한 404.

## 의도적 단순성

별도 서버, ORM, 상태 관리 라이브러리, 외부 DB, Queue/KV/R2/DO/Vectorize를 사용하지 않는다. 현재 규모에서는 함수와 명시적 SQL이 가장 읽기 쉽고 검증 가능하다.
