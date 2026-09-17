import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setEmailService } from "@/lib/auth/email";
import { verifyPassword } from "@/lib/auth/passwords";
import { hashToken } from "@/lib/auth/sessions";
import { createPasswordResetToken } from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import {
  createCapturingEmailService,
  createTestUser,
  deleteUsers,
} from "@/tests/auth-helpers";
import { POST as signInPOST } from "../sign-in/route";
import { POST } from "./route";

function resetRequest(body: unknown) {
  return new NextRequest("http://localhost/api/v1/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function signInRequest(body: unknown) {
  return new NextRequest("http://localhost/api/v1/auth/sign-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function resetTokenRow(
  userId: string,
): Promise<{ consumed_at: Date | null } | undefined> {
  const rows = await db<{ consumed_at: Date | null }[]>`
    select consumed_at from password_reset_tokens
    where user_id = ${userId} order by created_at desc limit 1
  `;
  return rows[0];
}

async function revokeTokenForTest(token: string): Promise<void> {
  await db`
    update password_reset_tokens
    set consumed_at = now()
    where token_hash = ${hashToken(token)}
  `;
}

describe("POST /api/v1/auth/reset-password", () => {
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

  it("atualiza a senha, consome o token, revoga sessões e envia email", async () => {
    const { user, password } = await createTestUser({ confirmed: true });
    userIds.push(user.id);
    const token = await createPasswordResetToken(user.id);
    const newPassword = "new-secure-password";

    const res = await POST(
      resetRequest({
        token,
        new_password: newPassword,
        confirm_password: newPassword,
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ redirectTo: "/auth/sign-in" });

    const afterHash = await db<{ password_hash: string }[]>`
      select password_hash from users where id = ${user.id}
    `;
    expect(await verifyPassword(password, afterHash[0]!.password_hash)).toBe(
      false,
    );
    expect(await verifyPassword(newPassword, afterHash[0]!.password_hash)).toBe(
      true,
    );

    expect((await resetTokenRow(user.id))?.consumed_at).not.toBeNull();
    expect(emails).toHaveLength(1);
    expect(emails[0]?.type).toBe("reset-success");
  });

  it("após reset, a senha antiga não loga e a nova loga no sign-in", async () => {
    const { user, email, phone, password } = await createTestUser({
      confirmed: true,
    });
    userIds.push(user.id);
    const token = await createPasswordResetToken(user.id);
    const newPassword = "new-secure-password";

    const res = await POST(
      resetRequest({
        token,
        new_password: newPassword,
        confirm_password: newPassword,
      }),
    );
    expect(res.status).toBe(200);

    const oldSignIn = await signInPOST(
      signInRequest({ email, password, phone }),
    );
    expect(oldSignIn.status).toBe(401);
    expect(await oldSignIn.json()).toMatchObject({
      error: { code: "INVALID_CREDENTIALS" },
    });

    const newSignIn = await signInPOST(
      signInRequest({ email, password: newPassword, phone }),
    );
    expect(newSignIn.status).toBe(200);
    expect(await newSignIn.json()).toMatchObject({ redirectTo: "/app/home" });
    expect(
      newSignIn.headers
        .getSetCookie()
        .some((cookie) => cookie.startsWith("session=")),
    ).toBe(true);
  });

  it("revoga todas as sessões do usuário ao resetar", async () => {
    const { user } = await createTestUser();
    userIds.push(user.id);
    const token = await createPasswordResetToken(user.id);
    const newPassword = "new-secure-password";

    await db`
      insert into sessions (user_id, token_hash, expires_at)
      values (${user.id}, ${hashToken("session-token")}, ${new Date(Date.now() + 60_000)})
    `;

    const res = await POST(
      resetRequest({
        token,
        new_password: newPassword,
        confirm_password: newPassword,
      }),
    );
    expect(res.status).toBe(200);

    const sessions = await db<{ revoked_at: Date | null }[]>`
      select revoked_at from sessions where user_id = ${user.id}
    `;
    expect(sessions.length).toBeGreaterThan(0);
    for (const session of sessions) {
      expect(session.revoked_at).not.toBeNull();
    }
  });

  it("senhas divergentes retornam 400 PASSWORD_MISMATCH sem efeito", async () => {
    const { user } = await createTestUser();
    userIds.push(user.id);
    const token = await createPasswordResetToken(user.id);

    const res = await POST(
      resetRequest({
        token,
        new_password: "new-secure-password",
        confirm_password: "different-password",
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "PASSWORD_MISMATCH" },
    });

    expect((await resetTokenRow(user.id))?.consumed_at).toBeNull();
    expect(emails).toHaveLength(0);
  });

  it("token expirado retorna 400 TOKEN_EXPIRED sem alterar nada", async () => {
    const { user, password } = await createTestUser();
    userIds.push(user.id);
    const token = await createPasswordResetToken(user.id, -60_000);

    const res = await POST(
      resetRequest({
        token,
        new_password: "new-secure-password",
        confirm_password: "new-secure-password",
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "TOKEN_EXPIRED" },
    });

    const afterHash = await db<{ password_hash: string }[]>`
      select password_hash from users where id = ${user.id}
    `;
    expect(await verifyPassword(password, afterHash[0]!.password_hash)).toBe(
      true,
    );
    expect(emails).toHaveLength(0);
  });

  it("token já consumido retorna 400 TOKEN_ALREADY_USED", async () => {
    const { user, password } = await createTestUser();
    userIds.push(user.id);
    const token = await createPasswordResetToken(user.id);
    await revokeTokenForTest(token);

    const res = await POST(
      resetRequest({
        token,
        new_password: "new-secure-password",
        confirm_password: "new-secure-password",
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "TOKEN_ALREADY_USED" },
    });

    const afterHash = await db<{ password_hash: string }[]>`
      select password_hash from users where id = ${user.id}
    `;
    expect(await verifyPassword(password, afterHash[0]!.password_hash)).toBe(
      true,
    );
  });

  it("token inexistente retorna 400 INVALID_TOKEN", async () => {
    const res = await POST(
      resetRequest({
        token: "unknown-token",
        new_password: "new-secure-password",
        confirm_password: "new-secure-password",
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "INVALID_TOKEN" },
    });
  });

  it("senha menor que 8 caracteres retorna 400 VALIDATION_ERROR", async () => {
    const res = await POST(
      resetRequest({
        token: "whatever",
        new_password: "short",
        confirm_password: "short",
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
  });
});
