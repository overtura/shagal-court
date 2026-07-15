import { useState } from "react";
import { MAX_STATEMENT_LENGTH, type VerdictAnalysis, type VerdictResult } from "../../shared/contracts";
import { normalizeStatement } from "../../shared/verdict-engine";
import { analyzeLocally, type LocalAnalysisResult } from "../ai/verdict-client";
import { clearLocalHistory, getLocalHistory, saveLocalHistory, type LocalHistoryEntry } from "../storage";
import { LocalPartyVote } from "../components/LocalPartyVote";
import { PublishPanel } from "../components/PublishPanel";
import { VerdictCard } from "../components/VerdictCard";

const EXAMPLES = [
  "버스 줄을 20분 섰는데 문 열리자마자 세 명이 새치기했다.",
  "퇴근 5분 전에 상사가 오늘 안에 끝낼 일을 새로 줬다.",
  "예약 시간에 맞춰 갔는데 가게가 아무 말 없이 문을 닫았다.",
];

interface CurrentVerdict {
  entryId: string;
  originalStatement: string;
  analysis: VerdictAnalysis;
  verdict: VerdictResult;
  modelMode: LocalAnalysisResult["modelMode"];
}

const MODEL_LABELS: Record<LocalAnalysisResult["modelMode"], string> = {
  webgpu: "WebGPU 로컬 모델",
  wasm: "WASM 로컬 모델",
  fallback: "결정론적 오프라인 fallback",
};

export function LocalCourt() {
  const [statement, setStatement] = useState("");
  const [current, setCurrent] = useState<CurrentVerdict>();
  const [history, setHistory] = useState<LocalHistoryEntry[]>(getLocalHistory);
  const [busy, setBusy] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>();

  const judge = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizeStatement(statement);
    if (!normalized) return;
    setBusy(true);
    setShowPublish(false);
    setShareUrl(undefined);
    const result = await analyzeLocally(normalized);
    const entry = saveLocalHistory({ originalStatement: normalized, analysis: result.analysis, verdict: result.verdict });
    setHistory(getLocalHistory());
    setCurrent({ entryId: entry.id, originalStatement: normalized, ...result });
    setBusy(false);
  };

  const loadHistory = (entry: LocalHistoryEntry) => {
    setStatement(entry.originalStatement);
    setCurrent({ entryId: entry.id, originalStatement: entry.originalStatement, analysis: entry.analysis, verdict: entry.verdict, modelMode: "fallback" });
    setShowPublish(false);
    setShareUrl(undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main id="main-content">
      <section className="hero court-grid" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="docket-number">온라인 밈 사건부 · 제001호</p>
          <h1 id="hero-title">억울한 한 줄,<br /><em>샤갈인지 판결합니다.</em></h1>
          <p className="hero-lede">문장은 브라우저 안에서 먼저 분석됩니다. 당신이 공개에 동의하기 전에는 서버로 보내지 않습니다.</p>
          <div className="privacy-seal"><span aria-hidden="true">로컬</span><p><strong>원문 서버 전송 없음</strong><br />WebGPU · WASM · 오프라인 fallback</p></div>
        </div>
        <form className="intake-form paper-panel" onSubmit={judge}>
          <label htmlFor="statement"><span>사건 진술</span><small>이름·연락처·주소는 쓰지 마세요.</small></label>
          <textarea
            id="statement"
            value={statement}
            onChange={(event) => setStatement(event.target.value)}
            maxLength={MAX_STATEMENT_LENGTH}
            placeholder="예: 줄을 20분 섰는데 문 열리자마자 세 명이 새치기했다."
            required
          />
          <div className="field-meta"><span>한 상황만, 사실 중심으로</span><span>{statement.length}/{MAX_STATEMENT_LENGTH}</span></div>
          <button className="primary-button judge-button" type="submit" disabled={busy || !statement.trim()}>{busy ? "로컬 모델 심리 중…" : "판결 도장 찍기"}</button>
          <div className="examples" aria-label="예시 사건">
            <span>예시 사건</span>
            {EXAMPLES.map((example, index) => <button type="button" key={example} onClick={() => setStatement(example)}>0{index + 1}</button>)}
          </div>
        </form>
      </section>

      {current && (
        <section className="result-section court-grid" aria-live="polite">
          <div>
            <VerdictCard analysis={current.analysis} verdict={current.verdict} />
            <p className="model-status"><span aria-hidden="true" /> 분석 방식: {MODEL_LABELS[current.modelMode]}</p>
          </div>
          <aside className="result-actions">
            <LocalPartyVote caseId={current.entryId} />
            <section className="share-callout">
              <p className="eyebrow">전역 배심원에게 묻기</p>
              <h3>이 판결을 익명 사건으로 공개할까요?</h3>
              <p>공개 문장을 별도로 확인한 뒤에만 서버에 저장합니다.</p>
              <button className="secondary-button" type="button" onClick={() => setShowPublish((value) => !value)}>{showPublish ? "공개 확인 닫기" : "공개 내용 확인하기"}</button>
            </section>
          </aside>
        </section>
      )}

      {current && showPublish && (
        <PublishPanel
          initialStatement={current.originalStatement}
          analysis={current.analysis}
          onPublished={({ url }) => {
            setShareUrl(new URL(url, window.location.origin).toString());
            setShowPublish(false);
          }}
        />
      )}

      {shareUrl && (
        <section className="share-success" aria-live="polite">
          <p className="eyebrow">사건 기록 완료</p><h2>공유 URL이 만들어졌습니다</h2>
          <a href={shareUrl}>{shareUrl}</a>
          <button type="button" onClick={() => void navigator.clipboard.writeText(shareUrl)}>주소 복사</button>
        </section>
      )}

      <section className="history-section" aria-labelledby="history-title">
        <div className="section-heading"><p className="eyebrow">이 기기에만 보관</p><h2 id="history-title">최근 로컬 사건부</h2></div>
        {history.length === 0 ? <p className="empty-state">아직 기록된 판결이 없습니다.</p> : (
          <div className="history-list">
            {history.slice(0, 6).map((entry) => (
              <button key={entry.id} type="button" onClick={() => loadHistory(entry)}>
                <span>{new Date(entry.createdAt).toLocaleDateString("ko-KR")}</span><strong>{entry.verdict.title}</strong><p>{entry.originalStatement}</p>
              </button>
            ))}
          </div>
        )}
        {history.length > 0 && <button className="text-button" type="button" onClick={() => { clearLocalHistory(); setHistory([]); }}>로컬 사건부 비우기</button>}
      </section>
    </main>
  );
}
