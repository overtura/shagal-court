# API

모든 body는 `application/json`, 최대 8 KiB이며 문서화된 필드 외의 값은 거절한다. 오류는 `{ "error": { "code", "message" } }`이고 숨김·만료·없는 사건은 같은 404다.

## `GET /api/health`

D1 연결을 확인하고 `{ ok, service, time }`을 반환한다.

## `POST /api/cases`

```json
{
  "publicStatement": "공개를 확인한 180자 이하 문장",
  "analysis": { "category": "대기·일정", "unfairness": 0.5, "absurdity": 0.6, "otherResponsibility": 0.7, "harm": 0.2, "misunderstanding": 0.1, "mitigation": 0.1, "confidence": 0.8 },
  "deviceId": "browser-random-id",
  "idempotencyKey": "one-publish-attempt-id",
  "consent": true,
  "turnstileToken": "optional"
}
```

원문 필드는 존재하지 않는다. 검증, content filter, optional Turnstile, hourly/daily limit, server verdict, idempotency 후 `{ case, url, reused }`를 반환한다.

## `GET /api/cases/:slug`

활성·미만료 공개 사건과 verdict, vote counters를 반환한다. 목록 endpoint는 없다.

## `PUT /api/cases/:slug/vote`

`{ choice: "guilty" | "not-guilty", deviceId }`. D1 batch가 표를 upsert하고 `votes`를 기준으로 counter를 다시 계산한다. 응답의 `changed`는 해당 요청이 vote row를 실제 생성·변경했는지를 뜻한다. 같은 선택의 `changed: false` 요청도 동시 race를 이용한 quota 우회를 막기 위해 hourly/daily abuse limit 평가 대상이다.

## `POST /api/cases/:slug/report`

`{ reason: "personal-info" | "threat" | "hate" | "spam" | "other", deviceId }`. 같은 reporter는 idempotent하다. 익명 신고는 관리자 검토 신호만 누적하며 사건을 숨길 권한을 갖지 않는다.

## 관리자

- `POST /api/admin/cases/:slug/hide`
- `DELETE /api/admin/cases/:slug`

`Authorization: Bearer <ADMIN_TOKEN>`이 필요하다. 초기 관리 UI는 없다.
