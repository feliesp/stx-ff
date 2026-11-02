import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test } from "vitest";
import { makeFlag } from "../../test/factories";
import { renderApp } from "../../test/renderApp";
import { server } from "../../test/server";

async function click(element: HTMLElement) {
  await act(async () => {
    await userEvent.click(element);
  });
}

const theSwitch = () => screen.getByRole("switch", { name: "new-checkout" });

beforeEach(() => {
  server.use(http.get("*/api/v1/flags", () => HttpResponse.json([makeFlag()])));
});

describe("undoing a toggle", () => {
  test("offers Undo after a toggle and restores the previous state", async () => {
    const sent: unknown[] = [];
    server.use(
      http.patch("*/api/v1/flags/new-checkout", async ({ request }) => {
        const body = (await request.json()) as { version: number; enabled: boolean };
        sent.push(body);
        return HttpResponse.json(makeFlag({ enabled: body.enabled, version: body.version + 1 }));
      }),
    );
    await renderApp();

    await click(theSwitch());
    expect(screen.getByRole("status")).toHaveTextContent("new-checkout enabled");

    await click(screen.getByRole("button", { name: "Undo" }));

    expect(sent[1]).toEqual({ version: 2, enabled: false });
    expect(theSwitch()).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  test("an undo that conflicts says the flag was edited", async () => {
    let calls = 0;
    server.use(
      http.patch("*/api/v1/flags/new-checkout", () => {
        calls += 1;
        if (calls === 1) return HttpResponse.json(makeFlag({ enabled: true, version: 2 }));
        return HttpResponse.json(
          {
            type: "version_conflict",
            title: "conflict",
            status: 409,
            current: makeFlag({ enabled: true, name: "Renamed", version: 3 }),
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } },
        );
      }),
    );
    await renderApp();

    await click(theSwitch());
    await click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "new-checkout had already been edited. Check current values.",
    );
    expect(screen.getByText("Renamed")).toBeInTheDocument();
  });
});
