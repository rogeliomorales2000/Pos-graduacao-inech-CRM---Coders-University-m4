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

function resendRequest(body: unknown) {
  return new NextRequest("http://localhost/api/v1/auth/resend-confirmation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function confirmationTokens(
  userId: string,
): Promise<{ consumed_at: Date | null }[]> {
  return db<{ consumed_at: Date | null }[]>`
    select consumed_at from email_confirmation_tokens
    where user_id = ${userId} order by created_at desc
  `;
}

describe("POST /api/v1/auth/resend-confirmation", () => {
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

  it("reenvia email de confirmação para conta pendente e gera novo token", async () => {
    const { user, email } = await createTestUser({ confirmed: false });
    userIds.push(user.id);

    const res = await POST(resendRequest({ email }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(emails).toHaveLength(1);
    expect(emails[0]?.type).toBe("confirmation");
    const token = tokenFromLink(emails[0]?.link);
    expect(token).toBeTruthy();

    const tokens = await confirmationTokens(user.id);
    expect(tokens).toHaveLength(1);
    expect(
      await db<{ token_hash: string }[]>`
      select token_hash from email_confirmation_tokens
      where user_id = ${user.id} and token_hash = ${hashToken(token)}
    `,
    ).toHaveLength(1);
  });

  it("email inexistente responde 200 genérico sem enviar email", async () => {
    const res = await POST(resendRequest({ email: "ghost@example.com" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(emails).toHaveLength(0);
  });

  it("conta já confirmada responde 200 genérico sem enviar email", async () => {
    const { user, email } = await createTestUser({ confirmed: true });
    userIds.push(user.id);

    const res = await POST(resendRequest({ email }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(emails).toHaveLength(0);
  });

  it("email inválido responde 200 genérico sem enviar email", async () => {
    const res = await POST(resendRequest({ email: "not-an-email" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(emails).toHaveLength(0);
  });

  it("novo reenvio revoga o token anterior da conta pendente", async () => {
    const { user, email } = await createTestUser({ confirmed: false });
    userIds.push(user.id);

    await POST(resendRequest({ email }));
    await POST(resendRequest({ email }));

    const tokens = await confirmationTokens(user.id);
    expect(tokens).toHaveLength(2);
    expect(tokens.filter((token) => token.consumed_at !== null)).toHaveLength(
      1,
    );
    expect(tokens.filter((token) => token.consumed_at === null)).toHaveLength(
      1,
    );
  });
});
