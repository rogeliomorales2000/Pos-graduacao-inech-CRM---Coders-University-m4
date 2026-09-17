import type { InputHTMLAttributes } from "react";
import { useId } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export default function FormField({
  label,
  error,
  hint,
  id,
  ...inputProps
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null]
      .filter((value): value is string => value !== null)
      .join(" ") || undefined;

  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        {...inputProps}
      />
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
