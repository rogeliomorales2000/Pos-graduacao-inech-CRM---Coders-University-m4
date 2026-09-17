import { NextRequest, NextResponse } from "next/server";

import { readJson } from "@/lib/auth/api-error";
import { getAppUrl, getEmailService } from "@/lib/auth/email";
import {
  createEmailConfirmationToken,
  revokeEmailConfirmationTokensForUser,
} from "@/lib/auth/tokens";
import { findUserByEmail } from "@/lib/auth/users";
import { getString, isValidEmail } from "@/lib/auth/validation";

export async function POST(request: NextRequest) {
  const source = (await readJson(request)) as Record<string, unknown> | null;
  const email = source ? getString(source, "email") : "";

  try {
    if (isValidEmail(email)) {
      const user = await findUserByEmail(email);
      if (user && !user.confirmed_at) {
        await revokeEmailConfirmationTokensForUser(user.id);
        const token = await createEmailConfirmationToken(user.id);
        const confirmationLink = `${getAppUrl()}/auth/confirm-account?token=${token}`;
        await getEmailService().sendConfirmationEmail({
          to: user.email,
          confirmationLink,
        });
      }
    }
  } catch (error) {
    console.error("resend-confirmation failed:", error);
  }

  return NextResponse.json({ ok: true });
}
