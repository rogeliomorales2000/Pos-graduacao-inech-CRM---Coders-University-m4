import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  createSession,
  revokeSession,
  SESSION_COOKIE,
} from "@/lib/auth/sessions";
import { GET } from "./route";

describe("GET /api/v1/auth/me", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    if (createdIds.length > 0) {
      await db`delete from sessions where id = any(${createdIds})`;
    }
    createdIds.length = 0;
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
    const userId = randomUUID();
    const created = await createSession(userId);
    createdIds.push(created.id);

    const res = await GET(requestWithCookie(created.token));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { id: userId } });
  });

  it("com sessão revogada responde 401 e limpa o cookie", async () => {
    const created = await createSession(randomUUID());
    createdIds.push(created.id);
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
