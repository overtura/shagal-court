# Operations

## health

`GET /api/health`는 D1 `SELECT 1`과 Worker 응답을 검증한다. synthetic polling 서비스는 두지 않는다. 장애 확인은 배포 직후와 수동 운영 점검에서 수행한다.

## moderation

관리 UI는 없다. 관리 bearer token을 shell history에 직접 남기지 말고 process environment에서 사용한다.

```powershell
$headers = @{ Authorization = "Bearer $env:SHAGAL_ADMIN_TOKEN" }
Invoke-RestMethod -Method Post -Headers $headers -Uri "https://<worker>/api/admin/cases/<slug>/hide"
Invoke-RestMethod -Method Delete -Headers $headers -Uri "https://<worker>/api/admin/cases/<slug>"
```

3개 고유 HMAC reporter가 신고하면 자동 숨김된다. 숨김·만료·삭제 후 외부 응답은 모두 일반 404다.

## cleanup

매일 UTC 03:17 scheduled handler가 만료 사건 100개와 만료 rate rows를 정리한다. backlog가 생기면 다음 cron에서 계속 처리한다. 보존 기간을 늘리거나 batch를 무제한으로 바꾸지 않는다.

## 한도와 degraded mode

Workers/D1 dashboard에서 requests, CPU, D1 rows read/write, storage를 확인한다. 일일 soft limit에 도달하면 공개 API는 503을 반환하고 로컬 판결은 유지된다. 유료 plan으로 자동 전환하지 않는다.

## incident checklist

1. `/api/health`와 최근 deployment version 확인
2. D1 Free limit·storage·migration 상태 확인
3. secret 존재만 확인하고 값을 출력하지 않기
4. 오류가 public validation, Turnstile, rate/daily limit, D1 중 어디인지 code로 분류
5. 필요하면 이전 Worker version rollback
6. 개인정보 노출 의심 시 사건 hide/delete 후 범위와 원인 기록

## log 원칙

request body, device ID, HMAC, token, IP, User-Agent를 log하지 않는다. operation type과 generalized error만 남긴다.
