// Holds the list of flags for the whole page: loaded once with use(), then
// kept up to date by dispatching reducer actions after each API call.
import { use, useReducer, type ReactNode } from "react";
import type { Flag } from "../../api/types";
import { FlagsContext } from "./flagsContext";
import { flagsReducer, initFlagsState } from "./flagsReducer";

type Props = {
  // Must be created outside render (a new promise per render would refetch forever).
  flagsPromise: Promise<Flag[]>;
  children: ReactNode;
};

export function FlagsProvider({ flagsPromise, children }: Props) {
  // use() suspends until the promise resolves; <Suspense> shows the fallback meanwhile,
  // and a rejection is caught by the nearest error boundary.
  const initialFlags = use(flagsPromise);
  const [state, dispatch] = useReducer(flagsReducer, initialFlags, initFlagsState);
  return <FlagsContext value={{ state, dispatch }}>{children}</FlagsContext>;
}
