# Privacy

## 기본값

판결 원문은 브라우저의 localStorage와 메모리에만 존재한다. 로컬 임베딩도 Web Worker에서 수행한다. 공개 확인 패널에서 사용자가 별도로 검토한 `publicStatement`만 동의 후 서버로 전송된다.

## 식별

브라우저는 cryptographic random device ID를 localStorage에 만든다. Worker는 이 값을 목적별 HMAC-SHA-256으로 변환한다.

- creator, voter, reporter, idempotency는 서로 다른 purpose prefix를 사용한다.
- DB에는 64자리 HMAC hex만 저장한다.
- 원본 IP, User-Agent, browser fingerprint를 읽거나 저장하지 않는다.
- HMAC secret과 admin token은 Cloudflare secret이며 repository에 두지 않는다.

## 공개 데이터

공개 문장, category, analysis, 서버 판결, 익명 vote counters, 신고 수, 생성·만료 시간만 저장한다. 사건은 unlisted URL이며 목록·검색·랭킹·피드가 없다.

## client 보관

로컬 사건부는 최근 20개로 제한된다. 사용자는 UI에서 지울 수 있다. 로컬 현장 배심원 표와 공개 전역 표 기록은 다른 storage key이며 합산하지 않는다.

## 콘텐츠 검사

전화번호, 주민번호 형태, 이메일, URL, 계좌번호 의심 패턴, 주소, HTML/Markdown, 위협 표현을 규칙 기반으로 차단한다. 안전한 공개 문장으로 다시 편집해야 한다.

## 보존

공개 사건은 최대 90일이다. 숨김·만료·존재하지 않는 사건은 같은 404로 응답해 moderation 상태를 노출하지 않는다. 보존 확대는 자동 병합 금지다.
