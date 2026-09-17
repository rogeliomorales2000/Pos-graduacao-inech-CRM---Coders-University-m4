import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setEmailService } from "@/lib/auth/email";
import { createSession, SESSION_COOKIE } from "@/lib/auth/sessions";
import { db } from "@/lib/db";
import {
  createCapturingEmailService,
  createTestUser,
  deleteUsers,
} from "@/tests/auth-helpers";
import { GET } from "../me/route";
import { POST } from "./route";

function requestWithCookie(token: string) {
  return new NextRequest("http://localhost/api/v1/auth/me", {
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
}

function signInRequest(body: unknown) {
  return new NextRequest("http://localhost/api/v1/auth/sign-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function activeSessions(userId: string): Promise<{ id: string }[]> {
  return db<{ id: string }[]>`
    select id from sessions where user_id = ${userId} and revoked_at is null
  `;
}

describe("POST /api/v1/auth/sign-in", () => {
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

  it("logga com credenciais válidas, revoga sessões anteriores e envia email", async () => {
    const { user, email, phone, password } = await createTestUser({
      confirmed: true,
    });
    userIds.push(user.id);

    const previous = await createSession(user.id);

    const res = await POST(signInRequest({ email, phone, password }));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: { email: string };
      redirectTo: string;
    };
    expect(body.user.email).toBe(email);
    expect(body.redirectTo).toBe("/app/home");

    const setCookies = res.headers.getSetCookie();
    expect(
      setCookies.some((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`)),
    ).toBe(true);

    const previousRows = await db<{ revoked_at: Date | null }[]>`
      select revoked_at from sessions where id = ${previous.id}
    `;
    expect(previousRows[0]?.revoked_at).not.toBeNull();

    const active = await activeSessions(user.id);
    expect(active).toHaveLength(1);

    expect(emails).toHaveLength(1);
    expect(emails[0]?.type).toBe("new-session");
  });

  it("revoga a sessão de outra máquina ao logar (última vence)", async () => {
    const { user, email, phone, password } = await createTestUser({
      confirmed: true,
    });
    userIds.push(user.id);

    const machineA = await createSession(user.id);
    await createSession(user.id);

    const res = await POST(signInRequest({ email, phone, password }));
    expect(res.status).toBe(200);

    const previousRows = await db<{ revoked_at: Date | null }[]>`
      select revoked_at from sessions where id = ${machineA.id}
    `;
    expect(previousRows[0]?.revoked_at).not.toBeNull();

    const active = await activeSessions(user.id);
    expect(active).toHaveLength(1);
  });

  it("após login na máquina B, a sessão da máquina A fica revogada e o guard de /me a barra", async () => {
    const { user, email, phone, password } = await createTestUser({
      confirmed: true,
    });
    userIds.push(user.id);

    const machineA = await createSession(user.id);

    const res = await POST(signInRequest({ email, phone, password }));
    expect(res.status).toBe(200);

    const previousRows = await db<{ revoked_at: Date | null }[]>`
      select revoked_at from sessions where id = ${machineA.id}
    `;
    expect(previousRows[0]?.revoked_at).not.toBeNull();

    const meRes = await GET(requestWithCookie(machineA.token));
    expect(meRes.status).toBe(401);
    expect(await meRes.json()).toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("retorna 401 genérico para telefone incorreto e não cria sessão", async () => {
    const { user, email, password } = await createTestUser({
      confirmed: true,
    });
    userIds.push(user.id);

    const res = await POST(
      signInRequest({ email, phone: "+5511900000000", password }),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      error: { code: "INVALID_CREDENTIALS" },
    });

    const active = await activeSessions(user.id);
    expect(active).toHaveLength(0);
    expect(emails).toHaveLength(0);
  });

  it("retorna 401 genérico para senha incorreta", async () => {
    const { user, email, phone } = await createTestUser({ confirmed: true });
    userIds.push(user.id);

    const res = await POST(
      signInRequest({ email, phone, password: "wrong-password" }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      error: { code: "INVALID_CREDENTIALS" },
    });
  });

  it("bloqueia conta não confirmada com 403 ACCOUNT_NOT_CONFIRMED", async () => {
    const { user, email, phone, password } = await createTestUser({
      confirmed: false,
    });
    userIds.push(user.id);

    const res = await POST(signInRequest({ email, phone, password }));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: { code: "ACCOUNT_NOT_CONFIRMED" },
    });

    const active = await activeSessions(user.id);
    expect(active).toHaveLength(0);
    expect(emails).toHaveLength(0);
  });

  it("retorna 400 VALIDATION_ERROR para email inválido", async () => {
    const res = await POST(
      signInRequest({
        email: "not-an-email",
        phone: "+5511999999999",
        password: "password123",
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
  });
});
