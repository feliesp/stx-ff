// On/off switch with an optimistic update: it flips the moment you click,
// then settles on whatever the server says.
//
// useOptimistic shows a temporary value only while the transition is running.
// On success we dispatch the saved flag, so the real state matches and the
// switch stays flipped. On failure we dispatch nothing, so when the transition
// ends React drops the optimistic value: the rollback needs no extra code.
import { startTransition, useOptimistic, useTransition } from "react";
import { conflictingFlag, describeFailure, updateFlag } from "../../api/client";
import type { Flag } from "../../api/types";
import { useFlags } from "./flagsContext";

type Props = {
  flag: Flag;
  onProblem: (message: string | null) => void;
};

export function FlagSwitch({ flag, onProblem }: Props) {
  const { dispatch } = useFlags();
  const [isPending, startToggle] = useTransition();
  const [optimisticEnabled, setOptimisticEnabled] = useOptimistic(flag.enabled);

  function toggle() {
    const enabled = !flag.enabled;
    onProblem(null);
    startToggle(async () => {
      setOptimisticEnabled(enabled);
      try {
        const saved = await updateFlag(flag.key, { version: flag.version, enabled });
        // State updates after an `await` must be wrapped in a transition again.
        startTransition(() => dispatch({ type: "flag_saved", flag: saved }));
      } catch (error) {
        const current = conflictingFlag(error);
        if (current) {
          startTransition(() => dispatch({ type: "flag_saved", flag: current }));
          // Someone (or a retried request) already set it the way we wanted.
          if (current.enabled === enabled) return;
          onProblem(`${flag.key} had already been edited. Check current values.`);
        } else {
          onProblem(describeFailure(`Couldn't update ${flag.key}. Try again.`, error));
        }
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimisticEnabled}
      aria-label={flag.key}
      className="switch"
      // One change at a time per flag: a second click would reuse a stale version.
      disabled={isPending}
      onClick={toggle}
    >
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span className="switch__label">{optimisticEnabled ? "Enabled" : "Disabled"}</span>
    </button>
  );
}
