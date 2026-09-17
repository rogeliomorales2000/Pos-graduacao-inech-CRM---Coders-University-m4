export interface SessionUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  confirmed_at?: string | null;
}

interface SessionResponse {
  user: SessionUser;
}

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields: FieldErrors;

  constructor(
    message: string,
    code: string,
    status: number,
    fields: FieldErrors = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

interface ErrorBody {
  error?: {
    code?: string;
    message?: string;
    fields?: FieldErrors;
  };
}

async function parseApiError(response: Response): Promise<ApiError> {
  let code = "UNEXPECTED_ERROR";
  let message = "Something went wrong. Please try again.";
  let fields: FieldErrors = {};

  try {
    const body = (await response.json()) as ErrorBody;
    if (body.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      fields = body.error.fields ?? {};
    }
  } catch {
    // Keep the generic fallback when the body is not JSON.
  }

  return new ApiError(message, code, response.status, fields);
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return (await response.json()) as T;
}

export async function fetchCurrentUser(): Promise<SessionUser | null> {
  const res = await fetch("/api/v1/auth/me", { credentials: "same-origin" });
  if (res.status === 401) {
    return null;
  }
  if (!res.ok) {
    throw new Error("Failed to load the session.");
  }
  const data = (await res.json()) as SessionResponse;
  return data.user ?? null;
}

export async function signOut(): Promise<void> {
  const res = await fetch("/api/v1/auth/sign-out", {
    method: "POST",
    credentials: "same-origin",
  });
  if (!res.ok) {
    throw new Error("Failed to sign out.");
  }
}

export interface SignUpPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
}

export function signUp(payload: SignUpPayload): Promise<{ user: SessionUser }> {
  return postJson("/api/v1/auth/sign-up", payload);
}

export interface SignInPayload {
  email: string;
  password: string;
  phone: string;
}

export function signIn(
  payload: SignInPayload,
): Promise<{ user: SessionUser; redirectTo: string }> {
  return postJson("/api/v1/auth/sign-in", payload);
}

export function resendConfirmation(email: string): Promise<{ ok: boolean }> {
  return postJson("/api/v1/auth/resend-confirmation", { email });
}

export function confirmAccount(
  token: string,
): Promise<{ user: SessionUser; redirectTo: string }> {
  return postJson("/api/v1/auth/confirm-account", { token });
}

export interface ForgotPasswordPayload {
  email: string;
  phone: string;
}

export function forgotPassword(
  payload: ForgotPasswordPayload,
): Promise<{ ok: boolean }> {
  return postJson("/api/v1/auth/forgot-password", payload);
}

export interface ResetPasswordPayload {
  token: string;
  new_password: string;
  confirm_password: string;
}

export function resetPassword(
  payload: ResetPasswordPayload,
): Promise<{ redirectTo: string }> {
  return postJson("/api/v1/auth/reset-password", payload);
}
