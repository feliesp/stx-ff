// Edit a flag's name and description in a native <dialog>.
//
// The save is based on a specific version. If someone else changed the flag
// in the meantime (409), we keep the user's draft, show the current values,
// and move the base version forward: saving again deliberately overwrites.
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { ApiError, conflictingFlag, describeFailure, updateFlag } from "../../api/client";
import type { Flag } from "../../api/types";
import { Field } from "./Field";
import { useFlags } from "./flagsContext";

type Props = { flag: Flag; onClose: () => void };

type SaveResult = {
  errors: Record<string, string[]>;
  failure: string | null;
  conflict: Flag | null;
};

const NOTHING: SaveResult = { errors: {}, failure: null, conflict: null };

export function EditFlagDialog({ flag, onClose }: Props) {
  const { dispatch } = useFlags();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(flag.name);
  const [description, setDescription] = useState(flag.description);
  const [baseVersion, setBaseVersion] = useState(flag.version);

  useEffect(() => {
    // showModal() traps focus, adds a backdrop and closes on Escape.
    dialogRef.current?.showModal();
  }, []);

  const [result, formAction, isPending] = useActionState(async (): Promise<SaveResult> => {
    try {
      const saved = await updateFlag(flag.key, { version: baseVersion, name, description });
      startTransition(() => {
        dispatch({ type: "flag_saved", flag: saved });
        onClose();
      });
      return NOTHING;
    } catch (error) {
      const current = conflictingFlag(error);
      if (current) {
        startTransition(() => {
          dispatch({ type: "flag_saved", flag: current });
          setBaseVersion(current.version);
        });
        return { ...NOTHING, conflict: current };
      }
      if (error instanceof ApiError && error.problem.errors) {
        return { ...NOTHING, errors: error.problem.errors };
      }
      return { ...NOTHING, failure: describeFailure("Couldn't save. Try again.", error) };
    }
  }, NOTHING);

  const headingId = `edit-${flag.key}`;
  return (
    <dialog ref={dialogRef} className="dialog" aria-labelledby={headingId} onClose={onClose}>
      <form action={formAction}>
        <h2 id={headingId}>Edit {flag.key}</h2>
        {result.conflict && (
          <div role="alert" className="notice notice--warning">
            <p>{flag.key} had already been edited. Check current values.</p>
            <p>
              Current name: <strong>{result.conflict.name}</strong>
              <br />
              Current description: <strong>{result.conflict.description || "(none)"}</strong>
            </p>
            <p>Save again to replace them with yours.</p>
          </div>
        )}
        <Field label="Name" errors={result.errors.name}>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
        </Field>
        <Field label="Description" errors={result.errors.description}>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </Field>
        {result.failure && (
          <p role="alert" className="create-form__failure">
            {result.failure}
          </p>
        )}
        <div className="dialog__actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
