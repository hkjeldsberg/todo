/**
 * Single shared password, taken from the environment. No user table: the app is
 * one notebook. A successful login mints an HMAC-signed, HttpOnly session cookie
 * that middleware verifies on every request.
 *
 * Uses Web Crypto only, so the same code runs in middleware and in Server Actions.
 */

export const SESSION_COOKIE = "todo_session";
const SESSION_DAYS = 90;

export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

/** TextEncoder returns a view; Web Crypto wants a standalone ArrayBuffer. */
function toBuffer(value: string): ArrayBuffer {
  const view = new TextEncoder().encode(value);
  return view.buffer.slice(
    view.byteOffset,
    view.byteOffset + view.byteLength,
  ) as ArrayBuffer;
}

function secret(): ArrayBuffer {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      "Missing AUTH_SECRET (32+ random chars, see .env.example). Generate: openssl rand -hex 32",
    );
  }
  return toBuffer(value);
}

/**
 * Local-only escape hatch for headless playtests: AUTH_DISABLED=1 skips the gate,
 * and only under `next dev`. Production builds ignore it.
 */
export function authBypassed(): boolean {
  return process.env.NODE_ENV === "development" && process.env.AUTH_DISABLED === "1";
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD && process.env.AUTH_SECRET);
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    secret(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, toBuffer(payload));
  return Array.from(new Uint8Array(mac))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Length-independent, constant-time-ish comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function passwordMatches(candidate: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

/** `<expiry-ms>.<hex hmac>` */
export async function createSessionToken(): Promise<string> {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  return `${expires}.${await sign(String(expires))}`;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (authBypassed()) return true;
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;

  const expires = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  return safeEqual(signature, await sign(expires));
}
