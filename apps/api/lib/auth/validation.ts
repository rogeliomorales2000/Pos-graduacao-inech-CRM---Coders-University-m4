export const PASSWORD_MIN_LENGTH = 8;

export type ValidationErrors = Record<string, string>;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ValidationErrors };

export function asRecord(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return {};
}

export function getString(
  source: Record<string, unknown>,
  key: string,
): string {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export function validateSignUp(body: unknown): ValidationResult<SignUpInput> {
  const source = asRecord(body);
  const firstName = getString(source, "first_name");
  const lastName = getString(source, "last_name");
  const email = getString(source, "email");
  const phone = getString(source, "phone");
  const password = getString(source, "password");
  const confirmPassword = getString(source, "confirm_password");
  const errors: ValidationErrors = {};

  if (!firstName) {
    errors.first_name = "First name is required.";
  }
  if (!lastName) {
    errors.last_name = "Last name is required.";
  }
  if (!email) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!phone) {
    errors.phone = "Phone is required.";
  }
  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password !== confirmPassword) {
    errors.confirm_password = "Passwords do not match.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { firstName, lastName, email, phone, password } };
}

export interface SignInInput {
  email: string;
  password: string;
  phone: string;
}

export function validateSignIn(body: unknown): ValidationResult<SignInInput> {
  const source = asRecord(body);
  const email = getString(source, "email");
  const password = getString(source, "password");
  const phone = getString(source, "phone");
  const errors: ValidationErrors = {};

  if (!email) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!password) {
    errors.password = "Password is required.";
  }
  if (!phone) {
    errors.phone = "Phone is required.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { email, password, phone } };
}

export interface ForgotPasswordInput {
  email: string;
  phone: string;
}

export function validateForgotPassword(
  body: unknown,
): ValidationResult<ForgotPasswordInput> {
  const source = asRecord(body);
  const email = getString(source, "email");
  const phone = getString(source, "phone");
  const errors: ValidationErrors = {};

  if (!email) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!phone) {
    errors.phone = "Phone is required.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { email, phone } };
}

export function validateToken(
  body: unknown,
): ValidationResult<{ token: string }> {
  const source = asRecord(body);
  const token = getString(source, "token");
  if (!token) {
    return { ok: false, errors: { token: "Token is required." } };
  }
  return { ok: true, value: { token } };
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export function validateResetPassword(
  body: unknown,
): ValidationResult<ResetPasswordInput> {
  const source = asRecord(body);
  const token = getString(source, "token");
  const newPassword = getString(source, "new_password");
  const confirmPassword = getString(source, "confirm_password");
  const errors: ValidationErrors = {};

  if (!token) {
    errors.token = "Token is required.";
  }
  if (!newPassword) {
    errors.new_password = "New password is required.";
  } else if (newPassword.length < PASSWORD_MIN_LENGTH) {
    errors.new_password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (newPassword !== confirmPassword) {
    errors.confirm_password = "Passwords do not match.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { token, newPassword } };
}
