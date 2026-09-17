import { NextRequest, NextResponse } from "next/server";

import { apiError, readJson, validationError } from "@/lib/auth/api-error";
import { getAppUrl, getEmailService } from "@/lib/auth/email";
import { hashPassword } from "@/lib/auth/passwords";
import { createEmailConfirmationToken } from "@/lib/auth/tokens";
import { createUser, findUserByEmail, toPublicUser } from "@/lib/auth/users";
import { validateSignUp } from "@/lib/auth/validation";

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "23505";
}

export async function POST(request: NextRequest) {
  try {
    const parsed = validateSignUp(await readJson(request));
    if (!parsed.ok) {
      if (parsed.errors.confirm_password) {
        return validationError(parsed.errors, "PASSWORD_MISMATCH");
      }
      return validationError(parsed.errors);
    }
    const { firstName, lastName, email, phone, password } = parsed.value;

    const existing = await findUserByEmail(email);
    if (existing) {
      return apiError(
        "EMAIL_ALREADY_REGISTERED",
        "This email is already registered.",
        409,
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
    });

    const token = await createEmailConfirmationToken(user.id);
    const confirmationLink = `${getAppUrl()}/auth/confirm-account?token=${token}`;
    await getEmailService().sendConfirmationEmail({
      to: user.email,
      confirmationLink,
    });

    return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return apiError(
        "EMAIL_ALREADY_REGISTERED",
        "This email is already registered.",
        409,
      );
    }
    console.error("sign-up failed:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
