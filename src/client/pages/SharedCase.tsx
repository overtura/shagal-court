import { useEffect, useState } from "react";
import type { PublicCase, ReportReason, VoteChoice } from "../../shared/contracts";
import { castVote, fetchCase, sendReport } from "../api";
import { getDeviceId, getRememberedPublicVote, rememberPublicVote } from "../storage";
import { VerdictCard } from "../components/VerdictCard";

const REASONS: Array<[ReportReason, string]> = [
  ["personal-info", "개인정보"], ["threat", "위협"], ["hate", "혐오·차별"], ["spam", "스팸"], ["other", "기타"],
];

export function SharedCase({ slug }: { slug: string }) {
  const [item, setItem] = useState<PublicCase>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [choice, setChoice] = useState<VoteChoice | null>(() => getRememberedPublicVote(slug));
  const [voteBusy, setVoteBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState<string>();

  useEffect(() => {
    void fetchCase(slug)
      .then(({ case: publicCase }) => setItem(publicCase))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "사건을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [slug]);

  const vote = async (nextChoice: VoteChoice) => {
    if (!item) return;
    setVoteBusy(true);
    setError(undefined);
    try {
      const result = await castVote(slug, nextChoice, getDeviceId());
      setItem({ ...item, votes: result.votes });
      setChoice(result.choice);
      rememberPublicVote(slug, result.choice);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "투표하지 못했습니다.");
    } finally {
      setVoteBusy(false);
    }
  };

  const report = async (reason: ReportReason) => {
    try {
      const result = await sendReport(slug, reason, getDeviceId());
      setReportMessage(result.duplicate ? "이미 접수한 신고입니다." : "신고를 접수했습니다.");
      setReportOpen(false);
    } catch (caught) {
      setReportMessage(caught instanceof Error ? caught.message : "신고하지 못했습니다.");
    }
  };

  if (loading) return <main id="main-content" className="shared-shell"><p className="loading-state">사건 기록을 펼치는 중…</p></main>;
  if (error && !item) return <main id="main-content" className="shared-shell"><section className="not-found"><p className="docket-number">비공개 기록</p><h1>사건을 찾을 수 없습니다</h1><p>만료됐거나 숨김 처리된 사건은 같은 404 응답으로 보호합니다.</p><a href="/">새 사건 판결하기</a></section></main>;
  if (!item) return null;

  const total = item.votes.guilty + item.votes.notGuilty;
  const guiltyPercent = total ? Math.round((item.votes.guilty / total) * 100) : 50;
  return (
    <main id="main-content" className="shared-shell">
      <header className="shared-heading">
        <p className="docket-number">공유 사건 · {item.slug.toUpperCase()}</p>
        <h1>“{item.publicStatement}”</h1>
        <p>만료 예정 {new Date(item.expiresAt).toLocaleDateString("ko-KR")}</p>
      </header>
      <VerdictCard analysis={item.analysis} verdict={item.verdict} />
      <section className="global-vote" aria-labelledby="global-vote-title">
        <p className="eyebrow">전역 배심원 기록</p><h2 id="global-vote-title">당신의 한 표는?</h2>
        <div className="global-bar" aria-label={`샤갈 유죄 ${guiltyPercent}%, 샤갈 아님 ${100 - guiltyPercent}%`}>
          <span style={{ width: `${guiltyPercent}%` }} /><i style={{ width: `${100 - guiltyPercent}%` }} />
        </div>
        <div className="vote-totals"><span>샤갈 맞다 <strong>{item.votes.guilty}</strong></span><span>잠깐, 아니다 <strong>{item.votes.notGuilty}</strong></span></div>
        <div className="vote-buttons">
          <button className={choice === "guilty" ? "selected" : ""} disabled={voteBusy} type="button" onClick={() => void vote("guilty")}>샤갈 맞다</button>
          <button className={choice === "not-guilty" ? "selected" : ""} disabled={voteBusy} type="button" onClick={() => void vote("not-guilty")}>잠깐, 아니다</button>
        </div>
        <p className="quiet-note">같은 브라우저에서 선택을 바꾸면 이전 표가 이동하며 총합이 중복되지 않습니다.</p>
        {error && <p className="error-message" role="alert">{error}</p>}
      </section>
      <section className="shared-actions">
        <a className="primary-button" href="/">내 사건도 판결하기</a>
        <button className="text-button" type="button" onClick={() => setReportOpen((value) => !value)}>이 사건 신고</button>
        {reportOpen && <div className="report-options" aria-label="신고 사유">{REASONS.map(([reason, label]) => <button type="button" key={reason} onClick={() => void report(reason)}>{label}</button>)}</div>}
        {reportMessage && <p role="status">{reportMessage}</p>}
      </section>
    </main>
  );
}
