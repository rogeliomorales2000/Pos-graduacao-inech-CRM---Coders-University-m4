import { NextRequest, NextResponse } from "next/server";

import { apiError, readJson, validationError } from "@/lib/auth/api-error";
import { getEmailService } from "@/lib/auth/email";
import { hashPassword } from "@/lib/auth/passwords";
import { revokeAllSessionsForUser } from "@/lib/auth/sessions";
import {
  consumePasswordResetToken,
  getPasswordResetTokenByToken,
} from "@/lib/auth/tokens";
import { findUserById, updateUserPassword } from "@/lib/auth/users";
import { validateResetPassword } from "@/lib/auth/validation";

export async function POST(request: NextRequest) {
  try {
    const parsed = validateResetPassword(await readJson(request));
    if (!parsed.ok) {
      if (parsed.errors.confirm_password) {
        return validationError(parsed.errors, "PASSWORD_MISMATCH");
      }
      return validationError(parsed.errors);
    }
    const { token, newPassword } = parsed.value;

    const record = await getPasswordResetTokenByToken(token);
    if (!record) {
      return apiError("INVALID_TOKEN", "This reset link is invalid.", 400);
    }
    if (record.consumed_at) {
      return apiError(
        "TOKEN_ALREADY_USED",
        "This reset link was already used.",
        400,
      );
    }
    if (record.expires_at <= new Date()) {
      return apiError("TOKEN_EXPIRED", "This reset link has expired.", 400);
    }

    const user = await findUserById(record.user_id);
    if (!user) {
      return apiError("INVALID_TOKEN", "This reset link is invalid.", 400);
    }

    const passwordHash = await hashPassword(newPassword);
    await updateUserPassword(user.id, passwordHash);
    await consumePasswordResetToken(record.id);
    await revokeAllSessionsForUser(user.id);
    await getEmailService().sendPasswordResetSuccess({ to: user.email });

    return NextResponse.json({ redirectTo: "/auth/sign-in" });
  } catch (error) {
    console.error("reset-password failed:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
