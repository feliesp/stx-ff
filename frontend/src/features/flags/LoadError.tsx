import type { FallbackProps } from "react-error-boundary";
import { ApiError } from "../../api/client";

export function LoadError({ error, resetErrorBoundary }: FallbackProps) {
  const reference = error instanceof ApiError ? error.reference : undefined;
  return (
    <div role="alert" className="notice notice--error">
      <p>
        Couldn't load flags.{reference && <> (ref {reference})</>}
      </p>
      <button type="button" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  );
}
