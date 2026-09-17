import { NextRequest, NextResponse } from "next/server";

import { readJson, validationError } from "@/lib/auth/api-error";
import { getAppUrl, getEmailService } from "@/lib/auth/email";
import {
  createPasswordResetToken,
  revokePasswordResetTokensForUser,
} from "@/lib/auth/tokens";
import { findUserByEmail } from "@/lib/auth/users";
import { validateForgotPassword } from "@/lib/auth/validation";

export async function POST(request: NextRequest) {
  const parsed = validateForgotPassword(await readJson(request));
  if (!parsed.ok) {
    return validationError(parsed.errors);
  }
  const { email, phone } = parsed.value;

  try {
    const user = await findUserByEmail(email);
    if (user && user.phone === phone) {
      await revokePasswordResetTokensForUser(user.id);
      const token = await createPasswordResetToken(user.id);
      const resetLink = `${getAppUrl()}/auth/reset-password?token=${token}`;
      await getEmailService().sendPasswordResetEmail({
        to: user.email,
        resetLink,
      });
    }
  } catch (error) {
    console.error("forgot-password failed:", error);
  }

  return NextResponse.json({ ok: true });
}
