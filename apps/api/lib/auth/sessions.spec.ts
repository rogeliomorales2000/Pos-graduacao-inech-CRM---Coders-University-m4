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
import { createTestUser, deleteUsers } from "@/tests/auth-helpers";

describe("sessions", () => {
  let userIds: string[];
  let createdIds: string[];

  beforeEach(() => {
    userIds = [];
    createdIds = [];
  });

  afterEach(async () => {
    await deleteUsers(userIds);
    createdIds.length = 0;
  });

  it("hashToken produz hash sha-256 determinístico", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("createSession persiste sessão e devolve o token em claro", async () => {
    const { user } = await createTestUser();
    userIds.push(user.id);
    const created = await createSession(user.id);
    createdIds.push(created.id);

    expect(created.token).toBeTruthy();
    expect(created.user_id).toBe(user.id);
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
    const { user } = await createTestUser();
    userIds.push(user.id);
    const created = await createSession(user.id);
    createdIds.push(created.id);

    await revokeSession(created.id);

    const row = await getSessionByToken(created.token);
    expect(row).not.toBeNull();
    expect(row!.revoked_at).not.toBeNull();
    expect(isSessionValid(row)).toBe(false);
  });

  it("sessão expirada é inválida", async () => {
    const { user } = await createTestUser();
    userIds.push(user.id);
    const created = await createSession(user.id, -1);
    createdIds.push(created.id);

    const row = await getSessionByToken(created.token);
    expect(isSessionValid(row)).toBe(false);
  });

  it("sessão revogada não é válida mesmo sem expirar", async () => {
    const { user } = await createTestUser();
    userIds.push(user.id);
    const created = await createSession(user.id, 60_000);
    createdIds.push(created.id);
    await revokeSession(created.id);

    expect(isSessionValid(await getSessionByToken(created.token))).toBe(false);
  });
});
