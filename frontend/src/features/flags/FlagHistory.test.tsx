import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test } from "vitest";
import type { Change } from "../../api/types";
import { makeFlag } from "../../test/factories";
import { renderApp } from "../../test/renderApp";
import { server } from "../../test/server";

const created: Change = {
  version: 1,
  action: "created",
  changes: { key: [null, "new-checkout"], name: [null, "New checkout"], enabled: [null, false] },
  request_id: "r1",
  created_at: "2026-11-02T10:00:00Z",
};
const enabled: Change = {
  version: 2,
  action: "updated",
  changes: { enabled: [false, true] },
  request_id: "r2",
  created_at: "2026-11-02T10:05:00Z",
};

async function click(element: HTMLElement) {
  await act(async () => {
    await userEvent.click(element);
  });
}

beforeEach(() => {
  server.use(http.get("*/api/v1/flags", () => HttpResponse.json([makeFlag()])));
});

describe("a flag's history", () => {
  test("opens on demand and lists changes newest first", async () => {
    server.use(
      http.get("*/api/v1/flags/new-checkout/history", () => HttpResponse.json([enabled, created])),
    );
    await renderApp();

    await click(screen.getByRole("button", { name: "History" }));

    const entries = within(screen.getByRole("list", { name: /history of new-checkout/i }))
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(entries[0]).toMatch(/v2.*Enabled/);
    expect(entries[1]).toMatch(/v1.*Created/);
    expect(screen.getByRole("button", { name: "History" })).toHaveAttribute("aria-expanded", "true");
  });

  test("refreshes while open when the flag changes", async () => {
    let history = [created];
    server.use(
      http.get("*/api/v1/flags/new-checkout/history", () => HttpResponse.json(history)),
      http.patch("*/api/v1/flags/new-checkout", () => {
        history = [enabled, created];
        return HttpResponse.json(makeFlag({ enabled: true, version: 2 }));
      }),
    );
    await renderApp();
    await click(screen.getByRole("button", { name: "History" }));

    await click(screen.getByRole("switch", { name: "new-checkout" }));

    const list = screen.getByRole("list", { name: /history of new-checkout/i });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });
});
