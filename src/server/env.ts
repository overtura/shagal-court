export interface Env {
  DB: D1Database;
  APP_ENV: string;
  CASE_TTL_DAYS: string;
  HMAC_SECRET?: string;
  ADMIN_TOKEN?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_HOSTNAME?: string;
}

export function requireSecret(value: string | undefined, name: string): string {
  if (!value || value.length < 24) throw new Error(`${name} is not configured`);
  return value;
}
