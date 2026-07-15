# Zero-Cost Guard

2026-07-15에 Cloudflare 공식 문서로 재확인한 Workers Free 기준은 **100,000 requests/day**, 요청당 CPU 10ms, memory 128MB, 외부 subrequest 50회다. Static Assets 요청은 무료이며 version당 20,000 files, 개별 25 MiB 제한이다.

D1 Free 기준은 **5 million rows read/day**, **100,000 rows written/day**, **5 GB total** storage다. 한도를 넘으면 D1 query가 실패하며 자동 과금되는 유료 fallback은 없다.

공식 출처:

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/

## 제품 계약

- 외부 유료 서비스와 서버 AI가 없다.
- Static Assets는 Worker를 거치지 않고, `/api/*`만 dynamic request다.
- 공개 사건은 unlisted이며 피드·검색·랭킹·polling이 없다.
- 사건은 90일 만료, cleanup은 100개 batch다.
- D1 조회는 prepared statement, 명시적 column, index, single-row slug lookup을 사용한다.
- hourly limit: 사건 5, 투표 60, 신고 10 per HMAC device.
- daily soft limit: 사건 500, 투표 10,000, 신고 2,000.
- 한도 초과·D1 장애·Turnstile 장애에서도 로컬 판결은 계속 작동한다.

## 자동 검사

`pnpm cost:check`는 다음을 실패시킨다.

- React, React DOM, Transformers.js 외 production dependency
- R2, KV, Durable Objects, Queues, Vectorize, Analytics Engine, Hyperdrive, service binding
- Express/Nest/Next/Firebase/Supabase/ORM
- `SELECT *`, polling, 누락된 index/table
- Workers CPU/subrequest guard와 90일 TTL 변경
- tracked `.env`, `.dev.vars`, private key
- 이 문서의 공식 Free limit 누락

비용 위험 변경은 `risk:r3`이며 자동 merge 금지다.
