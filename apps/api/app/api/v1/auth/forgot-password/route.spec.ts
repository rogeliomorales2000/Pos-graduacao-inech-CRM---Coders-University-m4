import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setEmailService } from "@/lib/auth/email";
import { hashToken } from "@/lib/auth/sessions";
import { db } from "@/lib/db";
import {
  createCapturingEmailService,
  createTestUser,
  deleteUsers,
  tokenFromLink,
} from "@/tests/auth-helpers";
import { POST } from "./route";

function forgotRequest(body: unknown) {
  return new NextRequest("http://localhost/api/v1/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function resetTokenHashes(
  userId: string,
): Promise<{ token_hash: string; consumed_at: Date | null }[]> {
  return db<{ token_hash: string; consumed_at: Date | null }[]>`
    select token_hash, consumed_at from password_reset_tokens
    where user_id = ${userId} order by created_at desc
  `;
}

describe("POST /api/v1/auth/forgot-password", () => {
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

  it("envia email de reset com token para conta com email+telefone corretos", async () => {
    const { user, email, phone } = await createTestUser();
    userIds.push(user.id);

    const res = await POST(forgotRequest({ email, phone }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(emails).toHaveLength(1);
    expect(emails[0]?.type).toBe("reset");
    const token = tokenFromLink(emails[0]?.link);
    expect(token).toBeTruthy();

    const tokens = await resetTokenHashes(user.id);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.token_hash).toBe(hashToken(token));
    expect(tokens[0]?.consumed_at).toBeNull();
  });

  it("novo pedido revoga o token anterior (só o último link vale)", async () => {
    const { user, email, phone } = await createTestUser();
    userIds.push(user.id);

    await POST(forgotRequest({ email, phone }));
    const res = await POST(forgotRequest({ email, phone }));

    expect(res.status).toBe(200);
    expect(emails).toHaveLength(2);

    const tokens = await resetTokenHashes(user.id);
    expect(tokens).toHaveLength(2);
    const consumed = tokens.filter((token) => token.consumed_at !== null);
    const active = tokens.filter((token) => token.consumed_at === null);
    expect(consumed).toHaveLength(1);
    expect(active).toHaveLength(1);

    const secondToken = tokenFromLink(emails[1]?.link);
    expect(active[0]?.token_hash).toBe(hashToken(secondToken));
  });

  it("telefone incorreto responde 200 genérico sem enviar email", async () => {
    const { user, email } = await createTestUser();
    userIds.push(user.id);

    const res = await POST(forgotRequest({ email, phone: "+5511900000000" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(emails).toHaveLength(0);
    expect(await resetTokenHashes(user.id)).toHaveLength(0);
  });

  it("email inexistente responde 200 genérico sem enviar email", async () => {
    const res = await POST(
      forgotRequest({ email: "ghost@example.com", phone: "+5511999999999" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(emails).toHaveLength(0);
  });

  it("respostas de email inexistente e telefone incorreto são idênticas", async () => {
    const absentRes = await POST(
      forgotRequest({ email: "ghost@example.com", phone: "+5511999999999" }),
    );

    const { user, email } = await createTestUser();
    userIds.push(user.id);
    const wrongPhoneRes = await POST(
      forgotRequest({ email, phone: "+5511900000000" }),
    );

    expect(absentRes.status).toBe(200);
    expect(wrongPhoneRes.status).toBe(200);
    expect(await absentRes.text()).toBe(await wrongPhoneRes.text());
  });

  it("retorna 400 VALIDATION_ERROR para campos vazios", async () => {
    const res = await POST(forgotRequest({}));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
  });
});
