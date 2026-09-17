import { NextRequest, NextResponse } from "next/server";

import { apiError, readJson, validationError } from "@/lib/auth/api-error";
import { setSessionCookie } from "@/lib/auth/cookies";
import { createSession, revokeAllSessionsForUser } from "@/lib/auth/sessions";
import {
  consumeEmailConfirmationToken,
  getEmailConfirmationTokenByToken,
} from "@/lib/auth/tokens";
import { confirmUser, findUserById, toPublicUser } from "@/lib/auth/users";
import { validateToken } from "@/lib/auth/validation";

export async function POST(request: NextRequest) {
  try {
    const parsed = validateToken(await readJson(request));
    if (!parsed.ok) {
      return validationError(parsed.errors);
    }

    const record = await getEmailConfirmationTokenByToken(parsed.value.token);
    if (!record) {
      return apiError(
        "INVALID_TOKEN",
        "This confirmation link is invalid.",
        400,
      );
    }
    if (record.consumed_at) {
      return apiError(
        "TOKEN_ALREADY_USED",
        "This confirmation link was already used.",
        400,
      );
    }
    if (record.expires_at <= new Date()) {
      return apiError(
        "TOKEN_EXPIRED",
        "This confirmation link has expired.",
        400,
      );
    }

    const user = await findUserById(record.user_id);
    if (!user) {
      return apiError(
        "INVALID_TOKEN",
        "This confirmation link is invalid.",
        400,
      );
    }
    if (user.confirmed_at) {
      return apiError(
        "ACCOUNT_ALREADY_CONFIRMED",
        "This account is already confirmed.",
        400,
      );
    }

    await consumeEmailConfirmationToken(record.id);
    await confirmUser(user.id);
    await revokeAllSessionsForUser(user.id);
    const session = await createSession(user.id);

    const confirmedUser = (await findUserById(user.id)) ?? user;
    const response = NextResponse.json({
      user: toPublicUser(confirmedUser),
      redirectTo: "/app/home",
    });
    return setSessionCookie(response, session.token);
  } catch (error) {
    console.error("confirm-account failed:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
