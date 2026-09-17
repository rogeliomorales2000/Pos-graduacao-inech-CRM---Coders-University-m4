import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { signOut } from "../../lib/api";

export default function HomePage() {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      // Leave anyway: the session may still be active, so the sign-in page
      // will be reached and the next attempt can finish the job.
    } finally {
      navigate("/auth/sign-in", { replace: true });
    }
  }

  return (
    <main className="app-page">
      <p className="eyebrow">Workspace</p>
      <h1>Intech CRM</h1>
      <p>Welcome back. This is your home for now.</p>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-busy={signingOut}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </main>
  );
}
