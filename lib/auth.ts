// Lightweight, stateless auth for the dashboard.
// Credentials live in env vars (never hardcoded), so they aren't exposed in the repo.

export const SESSION_COOKIE = "wa_session";

function creds() {
  return {
    email: process.env.AUTH_EMAIL || "",
    password: process.env.AUTH_PASSWORD || "",
    secret: process.env.AUTH_SECRET || "",
  };
}

/**
 * Deterministic session token derived from the credentials + secret.
 * Stored in an HttpOnly cookie on login and re-derived in middleware to verify.
 * Uses Web Crypto so it works in both the Node and Edge (middleware) runtimes.
 */
export async function sessionToken(): Promise<string> {
  const { email, password, secret } = creds();
  const data = new TextEncoder().encode(`${email}:${password}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** True only if auth is configured AND the supplied credentials match exactly. */
export function checkCredentials(email: string, password: string): boolean {
  const c = creds();
  if (!c.email || !c.password || !c.secret) return false;
  return email.trim().toLowerCase() === c.email.toLowerCase() && password === c.password;
}

/** Whether auth env vars are configured at all (used to fail safe). */
export function authConfigured(): boolean {
  const c = creds();
  return Boolean(c.email && c.password && c.secret);
}
