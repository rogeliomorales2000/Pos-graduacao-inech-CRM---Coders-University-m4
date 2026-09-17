import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import AuthShell from "../../components/AuthShell";
import FormAlert from "../../components/FormAlert";
import FormField from "../../components/FormField";
import { ApiError, resetPassword } from "../../lib/api";
import { focusFirstError } from "../../lib/form";

const PASSWORD_MIN_LENGTH = 8;
const TOKEN_ERROR_CODES = new Set([
  "INVALID_TOKEN",
  "TOKEN_EXPIRED",
  "TOKEN_ALREADY_USED",
]);

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(
    token ? null : "This reset link is invalid.",
  );
  const [submitting, setSubmitting] = useState(false);

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!newPassword) {
      next.new_password = "Choose a new password.";
    } else if (newPassword.length < PASSWORD_MIN_LENGTH) {
      next.new_password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (newPassword !== confirmPassword) {
      next.confirm_password = "Passwords do not match.";
    }
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      focusFirstError();
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await resetPassword({
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      navigate("/auth/sign-in", {
        replace: true,
        state: { passwordReset: true },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (TOKEN_ERROR_CODES.has(error.code)) {
          setTokenError(error.message);
        } else {
          setErrors(error.fields);
          if (Object.keys(error.fields).length === 0) {
            setFormError(error.message);
          } else {
            focusFirstError();
          }
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (tokenError) {
    return (
      <AuthShell title="We could not reset your password">
        <FormAlert>{tokenError}</FormAlert>
        <p className="auth-alt">
          <Link className="text-link" to="/auth/forgot-password">
            Request a new reset link
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      intro="Your other sessions will be signed out once the password changes."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError ? <FormAlert>{formError}</FormAlert> : null}

        <FormField
          label="New password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          value={newPassword}
          error={errors.new_password}
          onChange={(event) => setNewPassword(event.target.value)}
        />

        <FormField
          label="Confirm new password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          error={errors.confirm_password}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        <button
          type="submit"
          className="button-primary"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? "Updating password…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}
