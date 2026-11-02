// "new-checkout enabled · Undo". Undo sends the opposite change based on the
// flag's *current* version, so it goes through concurrency control like any
// other change: if someone edited the flag since, Undo reports the conflict.
import { startTransition, useEffect, useTransition } from "react";
import { conflictingFlag, describeFailure, updateFlag } from "../../api/client";
import { useFlags } from "./flagsContext";

const UNDO_WINDOW_MS = 8000;

export function UndoToast() {
  const { state, dispatch } = useFlags();
  const [isPending, startUndo] = useTransition();
  const { undo, notice } = state;
  const flag = undo && state.flags.find((f) => f.key === undo.key);

  useEffect(() => {
    // Undo is offered for a limited time (a timer is an external system).
    if (!undo) return;
    const timer = setTimeout(() => dispatch({ type: "undo_cleared" }), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [undo, dispatch]);

  function undoToggle() {
    if (!undo || !flag) return;
    startUndo(async () => {
      try {
        const saved = await updateFlag(flag.key, { version: flag.version, enabled: undo.enabled });
        startTransition(() => {
          dispatch({ type: "flag_saved", flag: saved });
          dispatch({ type: "undo_cleared" });
        });
      } catch (error) {
        const current = conflictingFlag(error);
        startTransition(() => {
          if (current) dispatch({ type: "flag_saved", flag: current });
          dispatch({
            type: "notice_shown",
            notice: current
              ? `${flag.key} had already been edited. Check current values.`
              : describeFailure(`Couldn't undo the change to ${flag.key}.`, error),
          });
        });
      }
    });
  }

  if (flag) {
    return (
      <div role="status" className="toast">
        <span>
          {flag.key} {flag.enabled ? "enabled" : "disabled"}
        </span>
        <button type="button" className="toast__action" disabled={isPending} onClick={undoToggle}>
          Undo
        </button>
      </div>
    );
  }
  if (notice) {
    return (
      <div role="status" className="toast">
        <span>{notice}</span>
        <button
          type="button"
          className="toast__action"
          onClick={() => dispatch({ type: "notice_dismissed" })}
        >
          Dismiss
        </button>
      </div>
    );
  }
  return null;
}
