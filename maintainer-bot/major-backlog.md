# Major Backlog

선택 우선순위는 `ready` → 높은 사용자 가치 → 현재 구조에서 완결 → 최근 PR과 비중복 → 외부 유료 서비스 없음 → major-safe다. protected 후보는 cadence를 완료하지 않으며 같은 가치의 safe 대안을 먼저 찾는다.

## 1. 이의 제기·재심 단계

- 사용자 문제: 첫 판결의 이유가 상황을 놓쳤을 때 바로 보완할 흐름이 없다.
- 기대 효과: 추가 맥락이 판결 축을 어떻게 바꾸는지 이해한다.
- 구현 범위: 로컬 2차 진술, before/after analysis, 새 로컬 verdict, history 연결, 오류 fallback, E2E.
- 명시적 비범위: 공개 사건 수정, DB schema, 법률 항소 표현.
- acceptance criteria: 원문·추가 맥락이 로컬에만 있고 두 판결이 명확히 비교되며 새 결과만 별도 공개 가능하다.
- 검증 방법: unit deterministic comparison, offline E2E, 360/1440 browser.
- 예상 위험: 화면 복잡성, 실제 법적 재심 오해.
- 선행 조건: 비교 표현에 대한 safety copy 검토.
- 상태: candidate

## 2. 배심원 판결 요약

- 사용자 문제: 숫자 두 개만으로 전역 배심원 분위기를 빠르게 이해하기 어렵다.
- 기대 효과: 투표 분포와 표본 크기를 밈 문장으로 즉시 이해한다.
- 구현 범위: shared pure summary, shared page card, zero-vote/close-race fallback, unit/E2E/docs.
- 명시적 비범위: 생성형 AI, 새 table, voter segment, 법률 문구.
- acceptance criteria: 표본 크기별 결정론적 요약, local party와 혼합 금지, 투표 수정 즉시 갱신.
- 검증 방법: boundary unit tests와 shared vote E2E.
- 예상 위험: 적은 표를 과장할 수 있음.
- 선행 조건: 없음.
- 상태: ready

## 3. 공유 카드 편집기와 privacy preview

- 사용자 문제: 공유 전 문장과 카드 노출 범위를 한눈에 확인하기 어렵다.
- 기대 효과: 개인정보를 줄이고 안심하고 링크를 공유한다.
- 구현 범위: client-only card preview, template 선택, public statement highlight, copy/download, accessibility/E2E.
- 명시적 비범위: 파일 업로드, 서버 이미지 생성, R2, 임의 SVG scripting.
- acceptance criteria: 원문은 preview/export에 자동 포함되지 않고 공개 문장만 사용한다.
- 검증 방법: privacy unit test, pixel/DOM browser checks at 360/1440.
- 예상 위험: 이미지 다운로드의 글꼴·브라우저 차이.
- 선행 조건: browser-native export feasibility 확인.
- 상태: ready

## 4. 관리자 moderation queue CLI와 운영 리포트

- 사용자 문제: 신고된 slug를 하나씩 알지 못하면 운영자가 검토하기 어렵다.
- 기대 효과: 기존 data로 bounded queue를 확인하고 hide/delete 결정을 기록한다.
- 구현 범위: 기존 schema query, admin CLI, pagination/limit, safe output redaction, operations docs/tests.
- 명시적 비범위: 관리 UI, 새 auth, migration, raw identity 출력.
- acceptance criteria: 최대 50건, 공개 문장·count·expiry만 표시하고 token/data를 log하지 않는다.
- 검증 방법: D1 fixture, CLI output snapshot, admin API integration.
- 예상 위험: admin token handling과 moderation 문장 노출.
- 선행 조건: secret 전달 방식을 human review.
- 상태: blocked

## 5. 신고 정책 검증 도구

- 사용자 문제: 새 content/report 규칙이 정상 문장을 과도하게 숨기는지 알기 어렵다.
- 기대 효과: safety 정책 변경 전에 false positive/negative를 재현한다.
- 구현 범위: local fixture runner, anonymized eval set, threshold simulation, report markdown.
- 명시적 비범위: production data 수집, 자동 정책 완화, 외부 moderation API.
- acceptance criteria: 개인정보 fixture를 repository에 넣지 않고 정책 완화는 자동 적용하지 않는다.
- 검증 방법: deterministic eval and cost guard.
- 예상 위험: fixture 자체의 민감 정보.
- 선행 조건: synthetic-only dataset 합의.
- 상태: candidate

## 6. 만료 전 export와 공유 종료 UX

- 사용자 문제: 90일 만료 전에 기록을 보존하거나 종료 시점을 이해하기 어렵다.
- 기대 효과: 공개 종료를 예측하고 로컬 파일로 안전하게 보관한다.
- 구현 범위: expiry countdown, public-data-only JSON/text export, expired local view, E2E.
- 명시적 비범위: retention 연장, server archive, R2.
- acceptance criteria: export는 공개 데이터만 포함하고 만료 후 server fetch 없이 설명한다.
- 검증 방법: clock-controlled unit/E2E.
- 예상 위험: 원문과 공개 데이터 혼동.
- 선행 조건: export privacy copy.
- 상태: ready

## 7. local party/global vote 비교

- 사용자 문제: 내 주변 반응과 전역 투표의 차이를 안전하게 비교하기 어렵다.
- 기대 효과: 두 집계를 섞지 않고 차이를 재미있게 본다.
- 구현 범위: explicit two-column comparison, minimum sample caveat, local-only join by slug, E2E.
- 명시적 비범위: local votes upload, combined score, demographic inference.
- acceptance criteria: 두 total과 source가 항상 표시되고 합산 수치는 없다.
- 검증 방법: storage/API separation tests and responsive E2E.
- 예상 위험: 표본 차이를 의미 있게 과장.
- 선행 조건: 공유 사건에 대응하는 local result가 있을 때만 노출.
- 상태: candidate

## 8. 판결 엔진 버전 비교

- 사용자 문제: 엔진 개선 후 판결이 달라진 이유를 확인할 수 없다.
- 기대 효과: 같은 analysis에서 version별 차이를 설명한다.
- 구현 범위: 기존 engine version registry, local comparison, reasons diff, tests/docs.
- 명시적 비범위: AI model 교체, DB migration, 공개 사건 재작성.
- acceptance criteria: 과거 함수가 deterministic하게 보존되고 새 default가 기존 회귀 fixture를 통과한다.
- 검증 방법: golden vectors, browser comparison E2E.
- 예상 위험: bundle 증가와 오래된 logic 유지 비용.
- 선행 조건: 두 번째 engine version이 실제 가치를 가져야 함.
- 상태: candidate

## 9. 무료 한도 도달 degraded mode

- 사용자 문제: 공개 한도 도달을 일반 서버 오류로 오해한다.
- 기대 효과: 로컬 판결이 안전함을 알리고 나중에 재시도할 수 있다.
- 구현 범위: typed limit state, local pending publish record, UTC reset 안내, retry UX, E2E/docs.
- 명시적 비범위: queue, background sync, paid plan, rate-limit 완화.
- acceptance criteria: 공개 payload를 동의 후에만 local pending으로 보관하고 자동 전송하지 않는다.
- 검증 방법: 429/503 route E2E, local persistence unit.
- 예상 위험: 사용자가 자동 재시도를 기대할 수 있음.
- 선행 조건: 없음.
- 상태: ready

## 10. 익명 작성 취소·삭제 token

- 사용자 문제: 공개한 작성자가 관리자 없이 자기 사건을 삭제할 수 없다.
- 기대 효과: 계정 없이도 데이터 통제권을 높인다.
- 구현 범위: one-time capability token, hash storage, delete route, recovery limits, E2E.
- 명시적 비범위: 계정, 이메일 복구, token 조회.
- acceptance criteria: raw token은 client에 한 번만 표시되고 DB에는 hash만 저장된다.
- 검증 방법: replay/guessing/expiry integration tests and red-team.
- 예상 위험: migration과 authorization boundary.
- 선행 조건: human-approved migration/security design.
- 상태: blocked

## 11. 투표 변화 snapshot

- 사용자 문제: 시간이 지나며 배심원 의견이 변했는지 알 수 없다.
- 기대 효과: bounded한 변화 추세를 본다.
- 구현 범위: daily aggregate snapshot, bounded read, chart/text mode, cleanup.
- 명시적 비범위: individual voter history, realtime polling, analytics.
- acceptance criteria: identity 없이 aggregate만 저장하고 90일과 함께 삭제된다.
- 검증 방법: migration, scheduled test, bounded query E2E.
- 예상 위험: migration과 write 비용.
- 선행 조건: D1 cost budget과 human-approved migration.
- 상태: blocked

## 12. 접근성 텍스트 재판 모드

- 사용자 문제: 장식적 기록물 레이아웃이 저시력·인지 부담 사용자에게 복잡할 수 있다.
- 기대 효과: 같은 기능을 단순 선형 텍스트로 이용한다.
- 구현 범위: client preference, semantic linear layout, high contrast, persistent local setting, keyboard/E2E.
- 명시적 비범위: 별도 앱, screen reader vendor integration, server preference.
- acceptance criteria: 기능·disclaimer·집계 source가 기본 모드와 동일하고 motion/decorations가 제거된다.
- 검증 방법: keyboard order, contrast audit, 360/1440 E2E.
- 예상 위험: 두 UI의 기능 drift.
- 선행 조건: 없음.
- 상태: ready
