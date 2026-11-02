import type { ReactElement } from "react";

type Props = {
  label: string;
  hint?: string;
  errors?: string[];
  children: ReactElement;
};

/** A labelled input with an optional hint and the server's field errors. */
export function Field({ label, hint, errors, children }: Props) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
      {errors?.map((message) => (
        <span key={message} className="field__error">
          {message}
        </span>
      ))}
    </label>
  );
}
