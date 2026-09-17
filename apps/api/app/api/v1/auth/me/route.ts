import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/auth/api-error";
import {
  getSessionByToken,
  isSessionValid,
  SESSION_COOKIE,
} from "@/lib/auth/sessions";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return apiError("UNAUTHENTICATED", "Unauthenticated.", 401);
    }

    const session = await getSessionByToken(token);
    if (!session || !isSessionValid(session)) {
      const response = apiError("UNAUTHENTICATED", "Unauthenticated.", 401);
      response.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(0),
      });
      return response;
    }

    return NextResponse.json({ user: { id: session.user_id } });
  } catch (error) {
    console.error("session lookup failed:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
