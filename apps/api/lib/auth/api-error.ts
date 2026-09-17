import { NextResponse } from "next/server";

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function validationError(
  fields: Record<string, string>,
  code = "VALIDATION_ERROR",
) {
  return NextResponse.json(
    {
      error: {
        code,
        message: "Please fix the highlighted fields.",
        fields,
      },
    },
    { status: 400 },
  );
}

export function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

