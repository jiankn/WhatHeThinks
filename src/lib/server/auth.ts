import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { newToken, safeEqual, sha256Hex } from "./crypto";
import { getDB } from "./env";

export const SESSION_COOKIE = "wht_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 600_000;

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  image_url: string | null;
  password_hash: string | null;
  google_sub: string | null;
  email_verified_at: number | null;
  created_at: number;
  updated_at: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPassword(value: string): boolean {
  return value.length >= 10 && value.length <= 128;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS },
    key,
    256,
  );
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, rounds, saltValue, expected] = stored.split("$");
  const iterations = Number(rounds);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || !saltValue || !expected) {
    return false;
  }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromBase64Url(saltValue).buffer as ArrayBuffer, iterations },
    key,
    256,
  );
  return safeEqual(toBase64Url(new Uint8Array(bits)), expected);
}

export async function createUser(
  db: D1Database,
  input: { email: string; name?: string | null; passwordHash?: string | null; googleSub?: string | null; imageUrl?: string | null; verified?: boolean },
): Promise<UserRow> {
  const id = nanoid(16);
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO users (id, email, name, image_url, password_hash, google_sub, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      normalizeEmail(input.email),
      input.name?.trim() || null,
      input.imageUrl || null,
      input.passwordHash || null,
      input.googleSub || null,
      input.verified ? now : null,
      now,
      now,
    )
    .run();
  return (await getUserById(db, id))!;
}

export async function getUserById(db: D1Database, id: string): Promise<UserRow | null> {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first<UserRow>();
}

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return db.prepare(`SELECT * FROM users WHERE email = ? COLLATE NOCASE`).bind(normalizeEmail(email)).first<UserRow>();
}

export async function createSession(db: D1Database, userId: string): Promise<{ token: string; expiresAt: number }> {
  const token = newToken();
  const now = Date.now();
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;
  await db.batch([
    db.prepare(`DELETE FROM auth_sessions WHERE expires_at < ?`).bind(now),
    db
      .prepare(`INSERT INTO auth_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?) `)
      .bind(await sha256Hex(token), userId, expiresAt, now),
  ]);
  return { token, expiresAt };
}

export async function deleteSession(db: D1Database, token: string | null): Promise<void> {
  if (!token) return;
  await db.prepare(`DELETE FROM auth_sessions WHERE token_hash = ?`).bind(await sha256Hex(token)).run();
}

export function getSessionTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getUserFromSessionToken(db: D1Database, token: string | null): Promise<UserRow | null> {
  if (!token) return null;
  return db
    .prepare(
      `SELECT users.* FROM auth_sessions
       JOIN users ON users.id = auth_sessions.user_id
       WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ?`,
    )
    .bind(await sha256Hex(token), Date.now())
    .first<UserRow>();
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const store = await cookies();
  return getUserFromSessionToken(await getDB(), store.get(SESSION_COOKIE)?.value ?? null);
}

export async function getRequestUser(req: Request, db: D1Database): Promise<UserRow | null> {
  return getUserFromSessionToken(db, getSessionTokenFromRequest(req));
}

export async function claimReportsForUser(db: D1Database, user: UserRow): Promise<void> {
  await db
    .prepare(`UPDATE reports SET user_id = ? WHERE user_id IS NULL AND email = ? COLLATE NOCASE`)
    .bind(user.id, user.email)
    .run();
}

export function safeNextPath(value: string | null | undefined, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
