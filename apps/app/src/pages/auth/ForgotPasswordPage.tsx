import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import AuthShell from "../../components/AuthShell";
import FormAlert from "../../components/FormAlert";
import FormField from "../../components/FormField";
import { ApiError, forgotPassword } from "../../lib/api";
import { focusFirstError } from "../../lib/form";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!email.trim()) {
      next.email = "Enter your email address.";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (!phone.trim()) {
      next.phone = "Enter your phone number.";
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
      await forgotPassword({ email: email.trim(), phone: phone.trim() });
      setSent(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        if (Object.keys(error.fields).length === 0) {
          setFormError(error.message);
        } else {
          focusFirstError();
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        intro="If an account exists with this email, we sent a password reset link. The link expires in 30 minutes."
      >
        <p className="auth-alt">
          <Link className="text-link" to="/auth/sign-in">
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      intro="Enter your email and phone to receive a reset link."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError ? <FormAlert>{formError}</FormAlert> : null}

        <FormField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <FormField
          label="Phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          hint="The number registered on your account."
          value={phone}
          error={errors.phone}
          onChange={(event) => setPhone(event.target.value)}
        />

        <button
          type="submit"
          className="button-primary"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? "Sending reset link…" : "Send reset link"}
        </button>
      </form>

      <p className="auth-alt">
        Remembered your password?{" "}
        <Link className="text-link" to="/auth/sign-in">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
