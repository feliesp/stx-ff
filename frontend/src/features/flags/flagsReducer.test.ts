import { describe, expect, test } from "vitest";
import { makeFlag } from "../../test/factories";
import { flagsReducer, initFlagsState } from "./flagsReducer";

const keys = (state: ReturnType<typeof initFlagsState>) => state.flags.map((f) => f.key);

describe("flagsReducer", () => {
  test("initial flags are sorted by key", () => {
    const state = initFlagsState([makeFlag({ key: "zeta" }), makeFlag({ key: "alpha" })]);

    expect(keys(state)).toEqual(["alpha", "zeta"]);
  });

  test("a created flag is inserted in key order", () => {
    const state = initFlagsState([makeFlag({ key: "alpha" }), makeFlag({ key: "zeta" })]);

    const next = flagsReducer(state, { type: "flag_created", flag: makeFlag({ key: "mid" }) });

    expect(keys(next)).toEqual(["alpha", "mid", "zeta"]);
  });

  test("a saved flag replaces the one with the same key", () => {
    const state = initFlagsState([makeFlag({ enabled: false, version: 1 })]);

    const next = flagsReducer(state, {
      type: "flag_saved",
      flag: makeFlag({ enabled: true, version: 2 }),
    });

    expect(next.flags).toEqual([makeFlag({ enabled: true, version: 2 })]);
  });

  test("an older version never overwrites a newer one (out-of-order responses)", () => {
    const state = initFlagsState([makeFlag({ enabled: true, version: 3 })]);

    const next = flagsReducer(state, {
      type: "flag_saved",
      flag: makeFlag({ enabled: false, version: 2 }),
    });

    expect(next.flags[0]).toMatchObject({ enabled: true, version: 3 });
  });
});
