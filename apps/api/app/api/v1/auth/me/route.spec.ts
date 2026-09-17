import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import {
  createSession,
  revokeSession,
  SESSION_COOKIE,
} from "@/lib/auth/sessions";
import { createTestUser, deleteUsers } from "@/tests/auth-helpers";
import { GET } from "./route";

describe("GET /api/v1/auth/me", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await deleteUsers(userIds);
    userIds.length = 0;
  });

  function requestWithCookie(token?: string) {
    const headers: Record<string, string> = {};
    if (token) {
      headers.cookie = `${SESSION_COOKIE}=${token}`;
    }
    return new NextRequest("http://localhost/api/v1/auth/me", { headers });
  }

  it("sem cookie responde 401 UNAUTHENTICATED", async () => {
    const res = await GET(requestWithCookie());

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("com sessão válida responde o id do usuário", async () => {
    const { user } = await createTestUser();
    userIds.push(user.id);
    const created = await createSession(user.id);

    const res = await GET(requestWithCookie(created.token));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { id: user.id } });
  });

  it("com sessão revogada responde 401 e limpa o cookie", async () => {
    const { user } = await createTestUser();
    userIds.push(user.id);
    const created = await createSession(user.id);
    await revokeSession(created.id);

    const res = await GET(requestWithCookie(created.token));

    expect(res.status).toBe(401);
    const setCookies = res.headers.getSetCookie();
    expect(
      setCookies.some((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`)),
    ).toBe(true);
  });

  it("com token desconhecido responde 401", async () => {
    const res = await GET(requestWithCookie("unknown-token"));

    expect(res.status).toBe(401);
  });
});
