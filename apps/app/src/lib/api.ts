export interface SessionUser {
  id: string;
}

interface SessionResponse {
  user: SessionUser;
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
