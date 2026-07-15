# Safety

## 서비스 성격

샤갈 재판소는 밈 엔터테인먼트다. 실제 법률 판단이나 조언이 아니며 모든 판결 카드와 공유 사건에 disclaimer를 표시한다.

## 입력 방어

- 180자, 8 KiB request 제한
- NFKC·공백 normalization
- 연락처·주민번호·이메일·URL·주소·계좌번호 의심 패턴 차단
- HTML·Markdown 차단
- 위협·보복 표현 차단
- analysis category와 모든 축 0~1 검증
- prepared D1 statement와 strict slug pattern

## 남용 방어

Turnstile secret이 있으면 공개 전에 검증한다. 없을 때도 HMAC device 기준 hourly limit과 UTC daily soft limit을 적용한다. 신고는 동일 reporter가 한 사건에 한 번만 집계되고 3건에서 자동 숨김된다. 관리자는 secret bearer token으로 숨김·삭제할 수 있다.

## 금지 출력

법 조항, 형량, 벌금, 고소 가능성, 범죄 성립, 범죄자 단정, 의료·법률 진단, 신상 공개, 보복 권고, 혐오·차별 증폭을 생성하지 않는다.

## 오류 정책

내부 SQL·secret·moderation 상태를 오류에 포함하지 않는다. 숨김·만료는 같은 일반 404다. 예상하지 못한 오류는 server log에 메시지 종류만 남기고 request body나 identity를 출력하지 않는다.

## 변경 위험

admin authorization, HMAC/secret, rate limit 완화, 개인정보 범위 확대, safety filter 완화, migration은 `risk:r3` protected change다. 자동 merge하지 않고 별도 human review가 필요하다.
