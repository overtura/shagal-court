import { HttpError } from "../http";

interface TurnstileResponse {
  success?: boolean;
  hostname?: string;
}

export async function verifyTurnstile(token: unknown, secret: string | undefined, expectedHostname: string | undefined): Promise<void> {
  if (!secret) return;
  if (typeof token !== "string" || token.length < 10) throw new HttpError(400, "turnstile_required", "사람인지 확인해 주세요.");
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  let result: TurnstileResponse;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    result = (await response.json()) as TurnstileResponse;
  } catch {
    throw new HttpError(503, "turnstile_unavailable", "사람 확인 서비스를 사용할 수 없습니다.");
  }
  if (!result.success || (expectedHostname && result.hostname !== expectedHostname)) {
    throw new HttpError(403, "turnstile_failed", "사람 확인에 실패했습니다.");
  }
}
