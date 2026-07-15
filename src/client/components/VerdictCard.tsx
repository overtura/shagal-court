import type { VerdictAnalysis, VerdictResult } from "../../shared/contracts";

const AXIS_LABELS: Array<[keyof Omit<VerdictAnalysis, "category">, string]> = [
  ["unfairness", "억울함"],
  ["absurdity", "황당함"],
  ["otherResponsibility", "상대 책임"],
  ["harm", "피해 강도"],
  ["misunderstanding", "오해 가능성"],
  ["mitigation", "사정참작"],
  ["confidence", "확신도"],
];

export function VerdictCard({ analysis, verdict }: { analysis: VerdictAnalysis; verdict: VerdictResult }) {
  return (
    <article className={`verdict-card verdict-${verdict.code}`} aria-labelledby="verdict-title">
      <div className="verdict-meta">
        <span>사건 분류 {analysis.category}</span>
        <span>밈 지수 {verdict.score}/100</span>
      </div>
      <div className="verdict-heading">
        <p className="eyebrow">판결 주문</p>
        <h2 id="verdict-title">{verdict.title}</h2>
        <span className="stamp" aria-hidden="true">판결</span>
      </div>
      <p className="verdict-summary">{verdict.summary}</p>
      <ul className="reason-list">
        {verdict.reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
      <div className="axis-grid" aria-label="판결 분석값">
        {AXIS_LABELS.map(([axis, label]) => (
          <div className="axis" key={axis}>
            <div><span>{label}</span><strong>{Math.round(analysis[axis] * 100)}</strong></div>
            <meter min="0" max="100" value={Math.round(analysis[axis] * 100)} aria-label={label} />
          </div>
        ))}
      </div>
      <p className="disclaimer" role="note">{verdict.disclaimer}</p>
    </article>
  );
}
