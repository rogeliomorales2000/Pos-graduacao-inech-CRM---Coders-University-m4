import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import {
  createSession,
  getSessionByToken,
  SESSION_COOKIE,
} from "@/lib/auth/sessions";
import { createTestUser, deleteUsers } from "@/tests/auth-helpers";
import { GET as me } from "../me/route";
import { POST } from "./route";

describe("POST /api/v1/auth/sign-out", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await deleteUsers(userIds);
    userIds.length = 0;
  });

  function requestWithCookie(token?: string, method = "POST") {
    const headers: Record<string, string> = {};
    if (token) {
      headers.cookie = `${SESSION_COOKIE}=${token}`;
    }
    return new NextRequest("http://localhost/api/v1/auth/sign-out", {
      method,
      headers,
    });
  }

  it("revoga a sessão corrente, limpa o cookie e responde 200", async () => {
    const { user } = await createTestUser();
    userIds.push(user.id);
    const created = await createSession(user.id);

    const res = await POST(requestWithCookie(created.token));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const session = await getSessionByToken(created.token);
    expect(session?.revoked_at).not.toBeNull();

    const setCookies = res.headers.getSetCookie();
    const sessionCookie = setCookies.find((cookie) =>
      cookie.startsWith(`${SESSION_COOKIE}=`),
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toMatch(/httponly/i);
    expect(sessionCookie).toMatch(/expires=Thu, 01 Jan 1970/i);
  });

  it("a sessão revogada deixa de autenticar (GET /me responde 401)", async () => {
    const { user } = await createTestUser();
    userIds.push(user.id);
    const created = await createSession(user.id);

    await POST(requestWithCookie(created.token));

    const meRes = await me(requestWithCookie(created.token, "GET"));
    expect(meRes.status).toBe(401);
    expect(await meRes.json()).toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("sem cookie de sessão responde 200 idempotente", async () => {
    const res = await POST(requestWithCookie());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("com token desconhecido responde 200 sem erro", async () => {
    const res = await POST(requestWithCookie("unknown-token"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("não revoga outras sessões do mesmo usuário", async () => {
    const { user } = await createTestUser();
    userIds.push(user.id);
    const first = await createSession(user.id);
    const second = await createSession(user.id);

    await POST(requestWithCookie(first.token));

    expect((await getSessionByToken(first.token))?.revoked_at).not.toBeNull();
    expect((await getSessionByToken(second.token))?.revoked_at).toBeNull();
  });
});
