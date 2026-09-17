import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import AuthShell from "../../components/AuthShell";
import FormAlert from "../../components/FormAlert";
import FormField from "../../components/FormField";
import { ApiError, resendConfirmation, signIn } from "../../lib/api";
import { focusFirstError } from "../../lib/form";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ResendState = "idle" | "sending" | "sent" | "error";

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const passwordReset = Boolean(
    (location.state as { passwordReset?: boolean } | null)?.passwordReset,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [accountNotConfirmed, setAccountNotConfirmed] = useState(false);
  const [resendState, setResendState] = useState<ResendState>("idle");
  const [submitting, setSubmitting] = useState(false);

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!email.trim()) {
      next.email = "Enter your email address.";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (!password) {
      next.password = "Enter your password.";
    }
    if (!phone.trim()) {
      next.phone = "Enter your phone number.";
    }
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setAccountNotConfirmed(false);

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      focusFirstError();
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const result = await signIn({
        email: email.trim(),
        password,
        phone: phone.trim(),
      });
      navigate(result.redirectTo || "/app/home", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "ACCOUNT_NOT_CONFIRMED") {
          setAccountNotConfirmed(true);
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

  async function handleResend() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setErrors((current) => ({
        ...current,
        email: "Enter the email used at sign-up to resend the link.",
      }));
      focusFirstError();
      return;
    }

    setResendState("sending");
    try {
      await resendConfirmation(email.trim());
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  }

  return (
    <AuthShell
      title="Sign in"
      intro="Access your workspace and pick up where you left off."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {passwordReset ? (
          <FormAlert tone="success">
            Password updated. Sign in with your new password.
          </FormAlert>
        ) : null}

        {accountNotConfirmed ? (
          <FormAlert>
            Confirm your email before signing in. Check your inbox or resend the
            confirmation link.
          </FormAlert>
        ) : null}

        {resendState === "sent" ? (
          <FormAlert tone="success">
            Check your inbox for the new confirmation link.
          </FormAlert>
        ) : null}

        {resendState === "error" ? (
          <FormAlert>
            We could not resend the link. Please try again in a moment.
          </FormAlert>
        ) : null}

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
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <FormField
          label="Phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          hint="Repeat the phone number registered on your account."
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
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        {accountNotConfirmed ? (
          <button
            type="button"
            className="button-secondary"
            onClick={handleResend}
            disabled={resendState === "sending"}
            aria-busy={resendState === "sending"}
          >
            {resendState === "sending"
              ? "Resending link…"
              : "Resend confirmation email"}
          </button>
        ) : null}
      </form>

      <p className="auth-alt">
        <Link className="text-link" to="/auth/forgot-password">
          Forgot your password?
        </Link>
      </p>
      <p className="auth-alt">
        New to Intech CRM?{" "}
        <Link className="text-link" to="/auth/sign-up">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
