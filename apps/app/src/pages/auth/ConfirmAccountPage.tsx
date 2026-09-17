import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import AuthShell from "../../components/AuthShell";
import FormAlert from "../../components/FormAlert";
import { ApiError, confirmAccount } from "../../lib/api";

export default function ConfirmAccountPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    if (!token) {
      setFailed(true);
      setMessage("This confirmation link is invalid.");
      return;
    }

    confirmAccount(token)
      .then((data) => {
        navigate(data.redirectTo || "/app/home", { replace: true });
      })
      .catch((error: unknown) => {
        setFailed(true);
        setMessage(
          error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again.",
        );
      });
  }, [token, navigate]);

  return (
    <AuthShell
      title={failed ? "We could not confirm your account" : "Confirming your account"}
      intro={
        failed
          ? undefined
          : "Hold on while we activate your workspace access."
      }
    >
      {failed ? (
        <FormAlert>{message}</FormAlert>
      ) : (
        <p className="auth-status" role="status" aria-live="polite">
          Confirming your account…
        </p>
      )}
      <p className="auth-alt">
        <Link className="text-link" to="/auth/sign-in">
          Go to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
