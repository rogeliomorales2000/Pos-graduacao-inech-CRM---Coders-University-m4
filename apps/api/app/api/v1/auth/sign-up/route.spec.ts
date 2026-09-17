import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setEmailService } from "@/lib/auth/email";
import { verifyPassword } from "@/lib/auth/passwords";
import { hashToken } from "@/lib/auth/sessions";
import { findUserByEmail } from "@/lib/auth/users";
import { db } from "@/lib/db";
import {
  createCapturingEmailService,
  deleteUsers,
  tokenFromLink,
} from "@/tests/auth-helpers";
import { POST } from "./route";

function signUpRequest(body: unknown) {
  return new NextRequest("http://localhost/api/v1/auth/sign-up", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  phone: "+5511988887777",
  password: "password123",
  confirm_password: "password123",
};

describe("POST /api/v1/auth/sign-up", () => {
  let createdIds: string[];
  let emails: ReturnType<typeof createCapturingEmailService>["emails"];

  beforeEach(() => {
    createdIds = [];
    const capturing = createCapturingEmailService();
    emails = capturing.emails;
    setEmailService(capturing.service);
  });

  afterEach(async () => {
    setEmailService(null);
    await deleteUsers(createdIds);
  });

  it("cria usuário pendente, hash da senha e envia email de confirmação", async () => {
    const payload = { ...validPayload, email: `ada-${Date.now()}@example.com` };
    const res = await POST(signUpRequest(payload));

    expect(res.status).toBe(201);
    const body = (await res.json()) as { user: { id: string; email: string } };
    createdIds.push(body.user.id);
    expect(body.user.email).toBe(payload.email);

    const user = await findUserByEmail(payload.email);
    expect(user).not.toBeNull();
    expect(user!.confirmed_at).toBeNull();
    expect(user!.password_hash).not.toBe(payload.password);
    expect(await verifyPassword(payload.password, user!.password_hash)).toBe(
      true,
    );

    expect(emails).toHaveLength(1);
    expect(emails[0]?.type).toBe("confirmation");
    const token = tokenFromLink(emails[0]?.link);
    expect(token).toBeTruthy();

    const tokenRows = await db<{ token_hash: string }[]>`
      select token_hash from email_confirmation_tokens where user_id = ${user!.id}
    `;
    expect(tokenRows).toHaveLength(1);
    expect(tokenRows[0]?.token_hash).toBe(hashToken(token));
  });

  it("retorna 409 EMAIL_ALREADY_REGISTERED para email duplicado", async () => {
    const payload = { ...validPayload, email: `dup-${Date.now()}@example.com` };
    const first = await POST(signUpRequest(payload));
    const firstBody = (await first.json()) as { user: { id: string } };
    createdIds.push(firstBody.user.id);

    const res = await POST(signUpRequest(payload));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      error: { code: "EMAIL_ALREADY_REGISTERED" },
    });
  });

  it("retorna 400 PASSWORD_MISMATCH quando as senhas divergem", async () => {
    const res = await POST(
      signUpRequest({
        ...validPayload,
        email: `mismatch-${Date.now()}@example.com`,
        confirm_password: "different123",
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "PASSWORD_MISMATCH" },
    });
    expect(emails).toHaveLength(0);
  });

  it("retorna 400 VALIDATION_ERROR para email inválido e senha curta", async () => {
    const res = await POST(
      signUpRequest({
        ...validPayload,
        email: "not-an-email",
        password: "short",
        confirm_password: "short",
      }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: { code: string; fields: Record<string, string> };
    };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fields.email).toBeDefined();
    expect(body.error.fields.password).toBeDefined();
  });
});
