import type { Flag } from "../api/types";

export function makeFlag(overrides: Partial<Flag> = {}): Flag {
  return {
    key: "new-checkout",
    name: "New checkout",
    description: "",
    enabled: false,
    version: 1,
    created_at: "2026-11-02T10:00:00Z",
    updated_at: "2026-11-02T10:00:00Z",
    ...overrides,
  };
}
