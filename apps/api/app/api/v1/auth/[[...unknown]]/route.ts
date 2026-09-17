import { apiError } from "@/lib/auth/api-error";

function notFound() {
  return apiError("NOT_FOUND", "Not found.", 404);
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
