import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  intro?: string;
  children: ReactNode;
}

export default function AuthShell({ title, intro, children }: AuthShellProps) {
  return (
    <main className="auth-page">
      <div className="auth-panel">
        <p className="auth-brand" translate="no">
          Intech CRM
        </p>
        <h1>{title}</h1>
        {intro ? <p className="auth-intro">{intro}</p> : null}
        {children}
      </div>
    </main>
  );
}
