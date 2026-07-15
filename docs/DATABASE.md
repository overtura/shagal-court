# Database

Cloudflare D1만 사용하며 ORM은 없다. `migrations/0001_initial.sql`이 baseline이다.

## tables

- `cases`: slug, 공개 문장, category/analysis JSON, 서버 판결, engine version, status, counters, HMAC creator, idempotency HMAC, 생성·만료 시간
- `votes`: `(case_id, voter_hash)` unique, choice, timestamps
- `reports`: `(case_id, reporter_hash)` unique, reason, timestamp
- `rate_limits`: action+hour+HMAC key, count, expiry
- `daily_usage`: UTC day별 공개/투표/신고 soft usage

원문, 원본 IP, User-Agent, fingerprint, 이메일, 전화번호는 column으로 존재하지 않는다.

## 쿼리 원칙

prepared statement와 bind만 사용한다. `SELECT *`는 금지하며 필요한 column을 명시한다. 공개 조회는 slug+status+expires 조건을 한 번에 검사한다. votes/reports는 case 삭제에 cascade된다.

투표 생성·변경은 D1 batch로 vote row와 case counter를 함께 갱신한다. 감소는 `MAX(counter - 1, 0)`로 음수를 방지한다. idempotency HMAC은 unique다.

## index

공개 slug 조회, expiry cleanup, created order, case별 votes/reports, rate expiry에 index가 있다. 공개 목록이 없으므로 무제한 scan endpoint는 없다.

## lifecycle

scheduled cleanup이 한 번에 최대 100개 사건을 expiry 순으로 삭제하고 만료 rate rows를 정리한다. 기본 보존은 90일이며 연장은 protected change다.
