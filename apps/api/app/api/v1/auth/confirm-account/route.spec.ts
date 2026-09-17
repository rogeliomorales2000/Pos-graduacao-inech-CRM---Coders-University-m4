import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setEmailService } from "@/lib/auth/email";
import { hashToken, SESSION_COOKIE } from "@/lib/auth/sessions";
import {
  createEmailConfirmationToken,
  generateToken,
} from "@/lib/auth/tokens";
import { findUserById } from "@/lib/auth/users";
import { db } from "@/lib/db";
import {
  createCapturingEmailService,
  createTestUser,
  deleteUsers,
} from "@/tests/auth-helpers";
import { POST } from "./route";

function confirmRequest(body: unknown) {
  return new NextRequest("http://localhost/api/v1/auth/confirm-account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/auth/confirm-account", () => {
  let userIds: string[];
  let emails: ReturnType<typeof createCapturingEmailService>["emails"];

  beforeEach(() => {
    userIds = [];
    const capturing = createCapturingEmailService();
    emails = capturing.emails;
    setEmailService(capturing.service);
  });

  afterEach(async () => {
    setEmailService(null);
    await deleteUsers(userIds);
  });

  it("confirma a conta, consome o token e cria sessão com cookie", async () => {
    const { user } = await createTestUser({ confirmed: false });
    userIds.push(user.id);
    const token = await createEmailConfirmationToken(user.id);

    const res = await POST(confirmRequest({ token }));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: { id: string; confirmed_at: string | null };
      redirectTo: string;
    };
    expect(body.redirectTo).toBe("/app/home");
    expect(body.user.id).toBe(user.id);
    expect(body.user.confirmed_at).not.toBeNull();

    const confirmed = await findUserById(user.id);
    expect(confirmed?.confirmed_at).not.toBeNull();

    const tokenRows = await db<{ consumed_at: Date | null }[]>`
      select consumed_at from email_confirmation_tokens
      where token_hash = ${hashToken(token)} order by created_at desc limit 1
    `;
    expect(tokenRows[0]?.consumed_at).not.toBeNull();

    const setCookies = res.headers.getSetCookie();
    expect(
      setCookies.some((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`)),
    ).toBe(true);
  });

  it("usar o mesmo token duas vezes retorna 400 TOKEN_ALREADY_USED", async () => {
    const { user } = await createTestUser({ confirmed: false });
    userIds.push(user.id);
    const token = await createEmailConfirmationToken(user.id);

    const first = await POST(confirmRequest({ token }));
    expect(first.status).toBe(200);

    const sessionsAfterFirst = await db<{ id: string }[]>`
      select id from sessions where user_id = ${user.id} and revoked_at is null
    `;
    expect(sessionsAfterFirst).toHaveLength(1);

    const second = await POST(confirmRequest({ token }));
    expect(second.status).toBe(400);
    expect(await second.json()).toMatchObject({
      error: { code: "TOKEN_ALREADY_USED" },
    });

    const sessionsAfterSecond = await db<{ id: string }[]>`
      select id from sessions where user_id = ${user.id} and revoked_at is null
    `;
    expect(sessionsAfterSecond).toHaveLength(1);
  });

  it("token expirado retorna 400 TOKEN_EXPIRED sem confirmar a conta", async () => {
    const { user } = await createTestUser({ confirmed: false });
    userIds.push(user.id);
    const token = await createEmailConfirmationToken(user.id, -60_000);

    const res = await POST(confirmRequest({ token }));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "TOKEN_EXPIRED" },
    });

    const confirmed = await findUserById(user.id);
    expect(confirmed?.confirmed_at).toBeNull();

    const sessions = await db<{ id: string }[]>`
      select id from sessions where user_id = ${user.id}
    `;
    expect(sessions).toHaveLength(0);
  });

  it("token inválido retorna 400 INVALID_TOKEN", async () => {
    const res = await POST(confirmRequest({ token: generateToken() }));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "INVALID_TOKEN" },
    });
    expect(emails).toHaveLength(0);
  });

  it("conta já confirmada com token válido retorna 400 ACCOUNT_ALREADY_CONFIRMED", async () => {
    const { user } = await createTestUser({ confirmed: true });
    userIds.push(user.id);
    const token = await createEmailConfirmationToken(user.id);

    const res = await POST(confirmRequest({ token }));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "ACCOUNT_ALREADY_CONFIRMED" },
    });
  });

  it("sem token retorna 400 VALIDATION_ERROR", async () => {
    const res = await POST(confirmRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
  });
});