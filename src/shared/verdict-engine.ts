import {
  CATEGORIES,
  DISCLAIMER,
  ENGINE_VERSION,
  type CaseCategory,
  type MemeVerdict,
  type VerdictAnalysis,
  type VerdictResult,
} from "./contracts";
import { VERDICT_TEMPLATES } from "./verdict-templates";

const CATEGORY_KEYWORDS: ReadonlyArray<[CaseCategory, readonly string[]]> = [
  ["직장·업무", ["회사", "직장", "상사", "팀장", "업무", "퇴근", "회의", "야근"]],
  ["돈·거래", ["돈", "결제", "환불", "가격", "계좌", "거래", "빌려", "중고"]],
  ["교통·공공예절", ["버스", "지하철", "택시", "운전", "주차", "줄", "새치기", "좌석"]],
  ["인간관계", ["친구", "동료", "가족", "부모", "선배", "후배", "지인"]],
  ["연애·약속", ["연인", "남친", "여친", "데이트", "약속", "연락", "기념일"]],
  ["서비스·기계", ["고장", "배송", "서비스", "고객", "앱", "기계", "주문", "기사"]],
  ["대기·일정", ["기다", "지각", "예약", "일정", "취소", "시간", "마감"]],
];

const RESPONSIBILITY_WORDS = ["안", "못", "거절", "무시", "취소", "빼앗", "새치기", "늦", "고장"];
const HARM_WORDS = ["손해", "잃", "아프", "해고", "망가", "환불", "돈", "시간", "피해"];
const MITIGATION_WORDS = ["실수", "몰랐", "사정", "급", "오해", "처음", "미안", "착각"];

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const roundAxis = (value: number) => Math.round(clamp(value) * 1000) / 1000;

function keywordRatio(text: string, words: readonly string[]): number {
  const matches = words.reduce((total, word) => total + (text.includes(word) ? 1 : 0), 0);
  return clamp(matches / Math.max(2, words.length / 2));
}

function embeddingSignal(embedding: readonly number[] | undefined, offset: number): number {
  if (!embedding?.length) return 0.5;
  let total = 0;
  const stride = 17 + offset * 2;
  for (let index = offset; index < embedding.length; index += stride) {
    total += embedding[index] ?? 0;
  }
  return clamp(0.5 + Math.tanh(total) * 0.35);
}

export function normalizeStatement(input: string): string {
  return input.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function classifyCategory(text: string): CaseCategory {
  let best: { category: CaseCategory; score: number } = { category: "순수 황당", score: 0 };
  for (const [category, words] of CATEGORY_KEYWORDS) {
    const score = words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
    if (score > best.score) best = { category, score };
  }
  return best.category;
}

export function analyzeStatement(textInput: string, embedding?: readonly number[]): VerdictAnalysis {
  const text = normalizeStatement(textInput);
  const punctuation = clamp((text.match(/[!?ㅋㅎ]/g)?.length ?? 0) / 5);
  const responsibility = keywordRatio(text, RESPONSIBILITY_WORDS);
  const harm = keywordRatio(text, HARM_WORDS);
  const mitigation = keywordRatio(text, MITIGATION_WORDS);
  const lengthConfidence = clamp(text.length / 70);

  return {
    category: classifyCategory(text),
    unfairness: roundAxis(0.2 + responsibility * 0.5 + embeddingSignal(embedding, 1) * 0.3),
    absurdity: roundAxis(0.2 + punctuation * 0.45 + embeddingSignal(embedding, 2) * 0.35),
    otherResponsibility: roundAxis(0.15 + responsibility * 0.65 + embeddingSignal(embedding, 3) * 0.2),
    harm: roundAxis(0.1 + harm * 0.65 + embeddingSignal(embedding, 4) * 0.25),
    misunderstanding: roundAxis(0.15 + mitigation * 0.45 + embeddingSignal(embedding, 5) * 0.4),
    mitigation: roundAxis(0.1 + mitigation * 0.65 + embeddingSignal(embedding, 6) * 0.25),
    confidence: roundAxis(0.25 + lengthConfidence * 0.45 + (embedding ? 0.25 : 0.05)),
  };
}

export function isVerdictAnalysis(value: unknown): value is VerdictAnalysis {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const axes = ["unfairness", "absurdity", "otherResponsibility", "harm", "misunderstanding", "mitigation", "confidence"];
  return (
    typeof item.category === "string" &&
    CATEGORIES.includes(item.category as CaseCategory) &&
    axes.every((axis) => typeof item[axis] === "number" && Number.isFinite(item[axis]) && item[axis] >= 0 && item[axis] <= 1)
  );
}

export function calculateVerdict(analysis: VerdictAnalysis): VerdictResult {
  const positive =
    analysis.unfairness * 0.29 +
    analysis.absurdity * 0.21 +
    analysis.otherResponsibility * 0.27 +
    analysis.harm * 0.13;
  const context = analysis.misunderstanding * 0.06 + analysis.mitigation * 0.18;
  const rawScore = clamp(positive - context + 0.12);
  const score = Math.round(rawScore * 100);

  let code: MemeVerdict;
  if (analysis.confidence < 0.42) code = "insufficient";
  else if (score >= 62) code = "shagal-guilty";
  else if (score >= 45) code = "mitigated";
  else code = "shagal-not-guilty";

  const template = VERDICT_TEMPLATES[code];
  const reasons = [
    analysis.otherResponsibility >= 0.55 ? "상대방 책임 신호가 비교적 큽니다." : "상대방 책임 신호는 제한적입니다.",
    analysis.absurdity >= 0.55 ? "상황의 황당함이 기록에 선명합니다." : "황당함보다 맥락 확인이 우선입니다.",
    analysis.mitigation >= 0.5 ? "사정참작할 표현이 함께 감지됐습니다." : "뚜렷한 사정참작 표현은 적습니다.",
  ];

  return { code, score, title: template.title, summary: template.summary, reasons, disclaimer: DISCLAIMER, engineVersion: ENGINE_VERSION };
}

export function createLocalVerdict(text: string, embedding?: readonly number[]): { analysis: VerdictAnalysis; verdict: VerdictResult } {
  const analysis = analyzeStatement(text, embedding);
  return { analysis, verdict: calculateVerdict(analysis) };
}
