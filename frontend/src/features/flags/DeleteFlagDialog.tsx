// Confirmation before the only irreversible action in the app.
import { startTransition, useEffect, useRef, useState, useTransition } from "react";
import { ApiError, conflictingFlag, deleteFlag, describeFailure } from "../../api/client";
import type { Flag } from "../../api/types";
import { useFlags } from "./flagsContext";

type Props = { flag: Flag; onClose: () => void };

export function DeleteFlagDialog({ flag, onClose }: Props) {
  const { dispatch } = useFlags();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startDelete] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function confirm() {
    setProblem(null);
    startDelete(async () => {
      try {
        await deleteFlag(flag.key, flag.version);
        startTransition(() => dispatch({ type: "flag_deleted", key: flag.key }));
      } catch (error) {
        const current = conflictingFlag(error);
        if (current) {
          // The row now shows the current values; confirming again deletes them.
          startTransition(() => dispatch({ type: "flag_saved", flag: current }));
          setProblem(`${flag.key} had already been edited. Check current values.`);
        } else if (error instanceof ApiError && error.problem.status === 404) {
          // Someone else deleted it first: the outcome the user wanted.
          startTransition(() => dispatch({ type: "flag_deleted", key: flag.key }));
        } else {
          setProblem(describeFailure(`Couldn't delete ${flag.key}. Try again.`, error));
        }
      }
    });
  }

  const headingId = `delete-${flag.key}`;
  return (
    <dialog ref={dialogRef} className="dialog" aria-labelledby={headingId} onClose={onClose}>
      <h2 id={headingId}>Delete {flag.key}?</h2>
      <p>It will disappear for everyone, and its key can't be reused. This can't be undone.</p>
      {problem && (
        <p role="alert" className="notice notice--warning">
          {problem}
        </p>
      )}
      <div className="dialog__actions">
        <button type="button" className="button" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="button button--danger"
          disabled={isPending}
          onClick={confirm}
        >
          {isPending ? "Deleting…" : "Delete flag"}
        </button>
      </div>
    </dialog>
  );
}
