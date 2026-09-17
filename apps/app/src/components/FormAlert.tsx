import type { ReactNode } from "react";

type AlertTone = "error" | "success" | "info";

interface FormAlertProps {
  tone?: AlertTone;
  children: ReactNode;
}

export default function FormAlert({ tone = "error", children }: FormAlertProps) {
  return (
    <p
      className="form-alert"
      data-tone={tone}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {children}
    </p>
  );
}
