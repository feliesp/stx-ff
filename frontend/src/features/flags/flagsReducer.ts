// All changes to the client's list of flags, as named actions on a pure
// function. Easy to test, and every state transition is in one place.
import type { Flag } from "../../api/types";

export type FlagsState = {
  flags: Flag[];
  // Briefly highlighted in the list so you can see where a new flag landed.
  lastCreatedKey: string | null;
};

export type FlagsAction =
  | { type: "flag_created"; flag: Flag }
  // The server's latest version of a flag (after a save, or from a 409 conflict).
  | { type: "flag_saved"; flag: Flag }
  | { type: "flag_deleted"; key: string };

const byKey = (a: Flag, b: Flag) => a.key.localeCompare(b.key);

export function initFlagsState(flags: Flag[]): FlagsState {
  return { flags: [...flags].sort(byKey), lastCreatedKey: null };
}

export function flagsReducer(state: FlagsState, action: FlagsAction): FlagsState {
  switch (action.type) {
    case "flag_created":
      return {
        ...state,
        flags: [...state.flags.filter((f) => f.key !== action.flag.key), action.flag].sort(byKey),
        lastCreatedKey: action.flag.key,
      };
    case "flag_saved":
      return {
        ...state,
        flags: state.flags.map((f) =>
          // Responses can arrive out of order; never go back to an older version.
          f.key === action.flag.key && action.flag.version >= f.version ? action.flag : f,
        ),
      };
    case "flag_deleted":
      return { ...state, flags: state.flags.filter((f) => f.key !== action.key) };
  }
}
