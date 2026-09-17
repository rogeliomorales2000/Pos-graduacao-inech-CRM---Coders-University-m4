import { randomBytes } from "node:crypto";

import { db } from "../db";
import { hashToken } from "./sessions";

export const EMAIL_CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export interface EmailConfirmationToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function isTokenValid(
  token: { consumed_at: Date | null; expires_at: Date } | null,
  now: Date = new Date(),
): boolean {
  return token !== null && token.consumed_at === null && token.expires_at > now;
}

export async function createEmailConfirmationToken(
  userId: string,
  ttlMs = EMAIL_CONFIRMATION_TTL_MS,
): Promise<string> {
  const token = generateToken();
  await db`
    insert into email_confirmation_tokens (user_id, token_hash, expires_at)
    values (${userId}, ${hashToken(token)}, ${new Date(Date.now() + ttlMs)})
  `;
  return token;
}

export async function revokeEmailConfirmationTokensForUser(
  userId: string,
): Promise<void> {
  await db`
    update email_confirmation_tokens
    set consumed_at = now()
    where user_id = ${userId} and consumed_at is null
  `;
}

export async function getEmailConfirmationTokenByToken(
  token: string,
): Promise<EmailConfirmationToken | null> {
  const rows = await db<EmailConfirmationToken[]>`
    select id, user_id, token_hash, expires_at, consumed_at, created_at
    from email_confirmation_tokens
    where token_hash = ${hashToken(token)}
    limit 1
  `;
  return rows[0] ?? null;
}

export function isEmailConfirmationTokenValid(
  token: EmailConfirmationToken | null,
  now: Date = new Date(),
): token is EmailConfirmationToken {
  return isTokenValid(token, now);
}

export async function consumeEmailConfirmationToken(id: string): Promise<void> {
  await db`
    update email_confirmation_tokens
    set consumed_at = now()
    where id = ${id} and consumed_at is null
  `;
}

export async function createPasswordResetToken(
  userId: string,
  ttlMs = PASSWORD_RESET_TTL_MS,
): Promise<string> {
  const token = generateToken();
  await db`
    insert into password_reset_tokens (user_id, token_hash, expires_at)
    values (${userId}, ${hashToken(token)}, ${new Date(Date.now() + ttlMs)})
  `;
  return token;
}

export async function revokePasswordResetTokensForUser(
  userId: string,
): Promise<void> {
  await db`
    update password_reset_tokens
    set consumed_at = now()
    where user_id = ${userId} and consumed_at is null
  `;
}

export async function getPasswordResetTokenByToken(
  token: string,
): Promise<PasswordResetToken | null> {
  const rows = await db<PasswordResetToken[]>`
    select id, user_id, token_hash, expires_at, consumed_at, created_at
    from password_reset_tokens
    where token_hash = ${hashToken(token)}
    limit 1
  `;
  return rows[0] ?? null;
}

export function isPasswordResetTokenValid(
  token: PasswordResetToken | null,
  now: Date = new Date(),
): token is PasswordResetToken {
  return isTokenValid(token, now);
}

export async function consumePasswordResetToken(id: string): Promise<void> {
  await db`
    update password_reset_tokens
    set consumed_at = now()
    where id = ${id} and consumed_at is null
  `;
}
