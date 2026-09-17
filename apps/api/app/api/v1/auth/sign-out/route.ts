import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/auth/api-error";
import {
  getSessionByToken,
  isSessionValid,
  revokeSession,
  SESSION_COOKIE,
} from "@/lib/auth/sessions";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (token) {
      const session = await getSessionByToken(token);
      if (session && isSessionValid(session)) {
        await revokeSession(session.id);
      }
    }

    const response = NextResponse.json({ ok: true }, { status: 200 });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    console.error("sign-out failed:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
