import { MAX_STATEMENT_LENGTH } from "../../shared/contracts";
import { normalizeStatement } from "../../shared/verdict-engine";
import { HttpError } from "../http";

const BLOCKED_PATTERNS: ReadonlyArray<{ code: string; pattern: RegExp }> = [
  { code: "resident_number", pattern: /\b\d{6}\s*[- ]?\s*[1-4]\d{6}\b/ },
  { code: "phone", pattern: /\b(?:01[016789])[- .]?\d{3,4}[- .]?\d{4}\b/ },
  { code: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { code: "url", pattern: /(?:https?:\/\/|www\.)\S+/i },
  { code: "account_number", pattern: /\b\d{2,6}[- ]\d{2,6}[- ]\d{2,6}\b/ },
  { code: "address", pattern: /(?:로|길|동|읍|면)\s*\d{1,4}(?:[- ]\d{1,4})?(?:번지|호)?/ },
  { code: "threat", pattern: /(죽여|찾아가서|보복|해코지|패버|가만두지)/ },
  { code: "markup", pattern: /<[^>]+>|(?:^|\s)(?:#{1,6}|>|```|\*\*)\s?/m },
];

export function validatePublicStatement(value: unknown): string {
  if (typeof value !== "string") throw new HttpError(400, "invalid_statement", "공개 문장을 입력해 주세요.");
  const statement = normalizeStatement(value);
  if (!statement || statement.length > MAX_STATEMENT_LENGTH) throw new HttpError(400, "invalid_statement", `공개 문장은 1~${MAX_STATEMENT_LENGTH}자여야 합니다.`);
  const blocked = BLOCKED_PATTERNS.find(({ pattern }) => pattern.test(statement));
  if (blocked) throw new HttpError(422, "unsafe_content", `공개할 수 없는 정보 또는 표현이 감지됐습니다: ${blocked.code}`);
  return statement;
}
