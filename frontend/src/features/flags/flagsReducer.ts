// All changes to the client's list of flags, as named actions on a pure
// function. Easy to test, and every state transition is in one place.
import type { Flag } from "../../api/types";

export type FlagsState = {
  flags: Flag[];
  // Briefly highlighted in the list so you can see where a new flag landed.
  lastCreatedKey: string | null;
  // Client-side text filter on key or name.
  filter: string;
  // One step of interaction history: how to undo the last toggle.
  undo: { key: string; enabled: boolean } | null;
  // A message for the toast, e.g. why an Undo didn't happen.
  notice: string | null;
};

export type FlagsAction =
  | { type: "flag_created"; flag: Flag }
  // The server's latest version of a flag (after a save, or from a 409 conflict).
  | { type: "flag_saved"; flag: Flag }
  // A successful toggle: saved like any change, and remembered for Undo.
  | { type: "flag_toggled"; flag: Flag }
  | { type: "undo_cleared" }
  | { type: "notice_shown"; notice: string }
  | { type: "notice_dismissed" }
  | { type: "flag_deleted"; key: string }
  | { type: "filter_changed"; filter: string };

const byKey = (a: Flag, b: Flag) => a.key.localeCompare(b.key);

export function initFlagsState(flags: Flag[]): FlagsState {
  return { flags: [...flags].sort(byKey), lastCreatedKey: null, filter: "", undo: null, notice: null };
}

export function flagsReducer(state: FlagsState, action: FlagsAction): FlagsState {
  switch (action.type) {
    case "flag_created":
      return {
        ...state,
        flags: [...state.flags.filter((f) => f.key !== action.flag.key), action.flag].sort(byKey),
        lastCreatedKey: action.flag.key,
        filter: "", // a filter could hide the flag we want to highlight
      };
    case "flag_saved":
      return {
        ...state,
        flags: state.flags.map((f) =>
          // Responses can arrive out of order; never go back to an older version.
          f.key === action.flag.key && action.flag.version >= f.version ? action.flag : f,
        ),
      };
    case "flag_toggled":
      return {
        ...flagsReducer(state, { type: "flag_saved", flag: action.flag }),
        undo: { key: action.flag.key, enabled: !action.flag.enabled },
        notice: null,
      };
    case "undo_cleared":
      return { ...state, undo: null };
    case "notice_shown":
      return { ...state, undo: null, notice: action.notice };
    case "notice_dismissed":
      return { ...state, notice: null };
    case "flag_deleted":
      return {
        ...state,
        flags: state.flags.filter((f) => f.key !== action.key),
        undo: state.undo?.key === action.key ? null : state.undo,
      };
    case "filter_changed":
      return { ...state, filter: action.filter };
  }
}

/** The flags to show: those whose key or name contains the filter (any case). */
export function visibleFlags(state: FlagsState): Flag[] {
  const needle = state.filter.trim().toLowerCase();
  if (!needle) return state.flags;
  return state.flags.filter(
    (f) => f.key.includes(needle) || f.name.toLowerCase().includes(needle),
  );
}
