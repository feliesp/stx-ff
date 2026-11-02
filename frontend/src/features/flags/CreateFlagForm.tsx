// Create form using a React 19 form action. useActionState runs the async
// action on submit and gives back its latest result (field errors) plus a
// pending flag, so there's no hand-written loading/error state.
import { startTransition, useActionState, useState } from "react";
import { ApiError, createFlag, describeFailure } from "../../api/client";
import { useFlags } from "./flagsContext";
import { suggestKey } from "./suggestKey";

type FormResult = {
  errors: Record<string, string[]>;
  failure: string | null;
};

const NO_ERRORS: FormResult = { errors: {}, failure: null };

export function CreateFlagForm() {
  const { dispatch } = useFlags();
  // Fields are controlled: React resets uncontrolled fields after every form
  // action, which would wipe the user's input when the server rejects it.
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyEditedByHand, setKeyEditedByHand] = useState(false);
  const [description, setDescription] = useState("");

  const [result, formAction, isPending] = useActionState(async (): Promise<FormResult> => {
    try {
      const flag = await createFlag({ key, name, description });
      startTransition(() => {
        dispatch({ type: "flag_created", flag });
        setName("");
        setKey("");
        setKeyEditedByHand(false);
        setDescription("");
      });
      return NO_ERRORS;
    } catch (error) {
      if (error instanceof ApiError && error.problem.errors) {
        return { errors: error.problem.errors, failure: null };
      }
      return { errors: {}, failure: describeFailure("Couldn't create the flag. Try again.", error) };
    }
  }, NO_ERRORS);

  function changeName(value: string) {
    setName(value);
    if (!keyEditedByHand) setKey(suggestKey(value));
  }

  return (
    <form action={formAction} className="create-form" aria-labelledby="create-heading">
      <h2 id="create-heading">New flag</h2>
      <div className="create-form__fields">
        <Field label="Name" errors={result.errors.name}>
          <input value={name} onChange={(e) => changeName(e.target.value)} required maxLength={100} />
        </Field>
        <Field label="Key" hint="Used in code. Can't be changed later." errors={result.errors.key}>
          <input
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setKeyEditedByHand(true);
            }}
            required
            maxLength={64}
            spellCheck={false}
          />
        </Field>
        <Field label="Description" errors={result.errors.description}>
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        </Field>
      </div>
      {result.failure && (
        <p role="alert" className="create-form__failure">
          {result.failure}
        </p>
      )}
      <button type="submit" className="button button--primary" disabled={isPending}>
        {isPending ? "Creating…" : "Create flag"}
      </button>
    </form>
  );
}

type FieldProps = {
  label: string;
  hint?: string;
  errors?: string[];
  children: React.ReactElement;
};

function Field({ label, hint, errors, children }: FieldProps) {
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
