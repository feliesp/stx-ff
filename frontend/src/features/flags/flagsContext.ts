import { createContext, use, type Dispatch } from "react";
import type { FlagsAction, FlagsState } from "./flagsReducer";

type FlagsContextValue = { state: FlagsState; dispatch: Dispatch<FlagsAction> };

export const FlagsContext = createContext<FlagsContextValue | null>(null);

/** The page's flags and the dispatch to change them. */
export function useFlags(): FlagsContextValue {
  const value = use(FlagsContext);
  if (!value) throw new Error("useFlags must be used inside <FlagsProvider>");
  return value;
}
