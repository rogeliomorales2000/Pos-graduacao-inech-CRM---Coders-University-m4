import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import AuthShell from "../../components/AuthShell";
import FormAlert from "../../components/FormAlert";
import FormField from "../../components/FormField";
import { ApiError, signUp } from "../../lib/api";
import { focusFirstError } from "../../lib/form";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_VALUES: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export default function SignUpPage() {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!values.firstName.trim()) {
      next.first_name = "Enter your first name.";
    }
    if (!values.lastName.trim()) {
      next.last_name = "Enter your last name.";
    }
    if (!values.email.trim()) {
      next.email = "Enter your email address.";
    } else if (!EMAIL_PATTERN.test(values.email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (!values.phone.trim()) {
      next.phone = "Enter your phone number.";
    }
    if (!values.password) {
      next.password = "Choose a password.";
    } else if (values.password.length < PASSWORD_MIN_LENGTH) {
      next.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (values.password !== values.confirmPassword) {
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
      await signUp({
        first_name: values.firstName.trim(),
        last_name: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
        confirm_password: values.confirmPassword,
      });
      setSubmittedEmail(values.email.trim());
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

  if (submittedEmail) {
    return (
      <AuthShell
        title="Check your email"
        intro={`We sent a confirmation link to ${submittedEmail}. Open it to activate your account.`}
      >
        <p className="auth-alt">
          Already confirmed?{" "}
          <Link className="text-link" to="/auth/sign-in">
            Sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      intro="Set up access to your workspace and its AI agents."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError ? <FormAlert>{formError}</FormAlert> : null}

        <div className="field-row">
          <FormField
            label="First name"
            name="first_name"
            autoComplete="given-name"
            value={values.firstName}
            error={errors.first_name}
            onChange={(event) => update("firstName", event.target.value)}
          />
          <FormField
            label="Last name"
            name="last_name"
            autoComplete="family-name"
            value={values.lastName}
            error={errors.last_name}
            onChange={(event) => update("lastName", event.target.value)}
          />
        </div>

        <FormField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={values.email}
          error={errors.email}
          onChange={(event) => update("email", event.target.value)}
        />

        <FormField
          label="Phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          hint="You will repeat this number each time you sign in."
          value={values.phone}
          error={errors.phone}
          onChange={(event) => update("phone", event.target.value)}
        />

        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          value={values.password}
          error={errors.password}
          onChange={(event) => update("password", event.target.value)}
        />

        <FormField
          label="Confirm password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          error={errors.confirm_password}
          onChange={(event) => update("confirmPassword", event.target.value)}
        />

        <button
          type="submit"
          className="button-primary"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="auth-alt">
        Already have an account?{" "}
        <Link className="text-link" to="/auth/sign-in">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
