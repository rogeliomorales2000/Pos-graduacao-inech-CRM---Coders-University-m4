import { createHash, randomBytes } from "node:crypto";

import { db } from "../db";

export const SESSION_COOKIE = "session";

export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
  last_active_at: Date;
}

export type ValidSession = Session & { token: string };

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  ttlMs = SESSION_TTL_MS,
): Promise<ValidSession> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlMs);

  const rows = await db<Session[]>`
    insert into sessions (user_id, token_hash, expires_at)
    values (${userId}, ${tokenHash}, ${expiresAt})
    returning id, user_id, token_hash, expires_at, revoked_at, created_at, last_active_at
  `;

  const session = rows[0];
  if (!session) {
    throw new Error("createSession: no row returned");
  }
  return { ...session, token };
}

export async function revokeSession(id: string): Promise<void> {
  await db`
    update sessions
    set revoked_at = now()
    where id = ${id} and revoked_at is null
  `;
}

export async function getSessionByToken(
  token: string,
): Promise<Session | null> {
  const rows = await db<Session[]>`
    select id, user_id, token_hash, expires_at, revoked_at, created_at, last_active_at
    from sessions
    where token_hash = ${hashToken(token)}
    limit 1
  `;
  return rows[0] ?? null;
}

export function isSessionValid(
  session: Session | null,
  now: Date = new Date(),
): session is Session {
  return (
    session !== null && session.revoked_at === null && session.expires_at > now
  );
}
