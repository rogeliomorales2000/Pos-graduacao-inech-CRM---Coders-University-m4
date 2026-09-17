import { NextRequest, NextResponse } from "next/server";

import { apiError, readJson, validationError } from "@/lib/auth/api-error";
import { setSessionCookie } from "@/lib/auth/cookies";
import { getEmailService } from "@/lib/auth/email";
import { verifyPassword } from "@/lib/auth/passwords";
import { createSession, revokeAllSessionsForUser } from "@/lib/auth/sessions";
import { findUserByEmail, toPublicUser } from "@/lib/auth/users";
import { validateSignIn } from "@/lib/auth/validation";

const INVALID_CREDENTIALS = "Invalid email, password or phone.";

export async function POST(request: NextRequest) {
  try {
    const parsed = validateSignIn(await readJson(request));
    if (!parsed.ok) {
      return validationError(parsed.errors);
    }
    const { email, password, phone } = parsed.value;

    const user = await findUserByEmail(email);
    if (!user) {
      return apiError("INVALID_CREDENTIALS", INVALID_CREDENTIALS, 401);
    }

    if (!user.confirmed_at) {
      return apiError(
        "ACCOUNT_NOT_CONFIRMED",
        "Confirm your email before signing in.",
        403,
      );
    }

    const passwordMatches = await verifyPassword(password, user.password_hash);
    if (!passwordMatches || user.phone !== phone) {
      return apiError("INVALID_CREDENTIALS", INVALID_CREDENTIALS, 401);
    }

    await revokeAllSessionsForUser(user.id);
    const session = await createSession(user.id);
    await getEmailService().sendNewSessionEmail({ to: user.email });

    const response = NextResponse.json({
      user: toPublicUser(user),
      redirectTo: "/app/home",
    });
    return setSessionCookie(response, session.token);
  } catch (error) {
    console.error("sign-in failed:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
