import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  createSession,
  getSessionByToken,
  SESSION_COOKIE,
} from "@/lib/auth/sessions";
import { POST } from "./route";

describe("POST /api/v1/auth/sign-out", () => {
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
    return new NextRequest("http://localhost/api/v1/auth/sign-out", {
      method: "POST",
      headers,
    });
  }

  it("revoga a sessão corrente, limpa o cookie e responde 200", async () => {
    const created = await createSession(randomUUID());
    createdIds.push(created.id);

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
    const userId = randomUUID();
    const first = await createSession(userId);
    const second = await createSession(userId);
    createdIds.push(first.id, second.id);

    await POST(requestWithCookie(first.token));

    expect((await getSessionByToken(first.token))?.revoked_at).not.toBeNull();
    expect((await getSessionByToken(second.token))?.revoked_at).toBeNull();
  });
});
