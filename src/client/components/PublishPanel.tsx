import { useCallback, useState } from "react";
import type { PublicCase, VerdictAnalysis } from "../../shared/contracts";
import { MAX_STATEMENT_LENGTH } from "../../shared/contracts";
import { publishCase } from "../api";
import { createIdempotencyKey, getDeviceId } from "../storage";
import { TurnstileWidget } from "./TurnstileWidget";

export function PublishPanel({ initialStatement, analysis, onPublished }: {
  initialStatement: string;
  analysis: VerdictAnalysis;
  onPublished(result: { case: PublicCase; url: string }): void;
}) {
  const [publicStatement, setPublicStatement] = useState(initialStatement);
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const [idempotencyKey] = useState(createIdempotencyKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const onToken = useCallback((token: string | undefined) => setTurnstileToken(token), []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const result = await publishCase({
        publicStatement,
        analysis,
        deviceId: getDeviceId(),
        idempotencyKey,
        consent: true,
        ...(turnstileToken ? { turnstileToken } : {}),
      });
      onPublished(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "공개하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="publish-panel" aria-labelledby="publish-title">
      <div className="section-heading">
        <p className="eyebrow">기록 공개 확인</p>
        <h2 id="publish-title">공개할 한 문장을 다시 확인하세요</h2>
      </div>
      <p>아래 문장만 서버로 전송됩니다. 처음 입력한 원문과 로컬 기록은 전송되지 않습니다.</p>
      <form onSubmit={submit}>
        <label htmlFor="public-statement">공개 문장</label>
        <textarea
          id="public-statement"
          value={publicStatement}
          maxLength={MAX_STATEMENT_LENGTH}
          onChange={(event) => setPublicStatement(event.target.value)}
          required
        />
        <div className="field-meta"><span>개인정보·연락처·주소·URL은 공개할 수 없습니다.</span><span>{publicStatement.length}/{MAX_STATEMENT_LENGTH}</span></div>
        <ul className="retention-list">
          <li>공개 사건은 검색·목록에 노출되지 않는 고유 URL로만 열립니다.</li>
          <li>90일 후 자동 만료되며 전역 배심원 투표가 표시됩니다.</li>
          <li>판결은 서버에서 분석값으로 다시 계산됩니다.</li>
        </ul>
        <TurnstileWidget siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onToken={onToken} />
        <label className="consent-row">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          위 문장의 공개, 익명 투표, 최대 90일 보관에 동의합니다.
        </label>
        {error && <p className="error-message" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={!consent || !publicStatement.trim() || busy}>
          {busy ? "사건 기록 중…" : "동의하고 공유 URL 만들기"}
        </button>
      </form>
    </section>
  );
}
