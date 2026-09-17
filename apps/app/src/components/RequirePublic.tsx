import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { fetchCurrentUser } from "../lib/api";

type AuthState = "loading" | "authenticated" | "guest";

export default function RequirePublic() {
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then((user) => {
        if (active) {
          setState(user ? "authenticated" : "guest");
        }
      })
      .catch(() => {
        if (active) {
          setState("guest");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <main className="auth-page">
        <p role="status">Loading…</p>
      </main>
    );
  }

  if (state === "authenticated") {
    return <Navigate to="/app/home" replace />;
  }

  return <Outlet />;
}
