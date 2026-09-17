import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { db } from "../db";
import {
  createSession,
  getSessionByToken,
  hashToken,
  isSessionValid,
  revokeSession,
} from "./sessions";

describe("sessions", () => {
  let createdIds: string[];

  beforeEach(() => {
    createdIds = [];
  });

  afterEach(async () => {
    if (createdIds.length > 0) {
      await db`delete from sessions where id = any(${createdIds})`;
    }
  });

  it("hashToken produz hash sha-256 determinístico", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("createSession persiste sessão e devolve o token em claro", async () => {
    const userId = randomUUID();
    const created = await createSession(userId);
    createdIds.push(created.id);

    expect(created.token).toBeTruthy();
    expect(created.user_id).toBe(userId);
    expect(created.revoked_at).toBeNull();
    expect(created.expires_at.getTime()).toBeGreaterThan(Date.now());

    const row = await getSessionByToken(created.token);
    expect(row).not.toBeNull();
    expect(row!.token_hash).toBe(hashToken(created.token));
    expect(isSessionValid(row)).toBe(true);
  });

  it("getSessionByToken retorna null para token desconhecido", async () => {
    expect(await getSessionByToken("unknown-token")).toBeNull();
  });

  it("revokeSession marca revoked_at e invalida a sessão", async () => {
    const created = await createSession(randomUUID());
    createdIds.push(created.id);

    await revokeSession(created.id);

    const row = await getSessionByToken(created.token);
    expect(row).not.toBeNull();
    expect(row!.revoked_at).not.toBeNull();
    expect(isSessionValid(row)).toBe(false);
  });

  it("sessão expirada é inválida", async () => {
    const created = await createSession(randomUUID(), -1);
    createdIds.push(created.id);

    const row = await getSessionByToken(created.token);
    expect(isSessionValid(row)).toBe(false);
  });

  it("sessão revogada não é válida mesmo sem expirar", async () => {
    const created = await createSession(randomUUID(), 60_000);
    createdIds.push(created.id);
    await revokeSession(created.id);

    expect(isSessionValid(await getSessionByToken(created.token))).toBe(false);
  });
});
