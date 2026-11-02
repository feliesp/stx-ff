import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test } from "vitest";
import type { Flag } from "../../api/types";
import { makeFlag } from "../../test/factories";
import { renderApp } from "../../test/renderApp";
import { server } from "../../test/server";

const problem = (status: number, body: object) =>
  HttpResponse.json(body, { status, headers: { "Content-Type": "application/problem+json" } });

const theSwitch = () => screen.getByRole("switch", { name: "new-checkout" });

async function click(element: HTMLElement) {
  // The click starts an async transition; awaiting act lets it finish.
  await act(async () => {
    await userEvent.click(element);
  });
}

beforeEach(() => {
  server.use(http.get("*/api/v1/flags", () => HttpResponse.json([makeFlag()])));
});

describe("toggling a flag", () => {
  test("flips immediately, before the server answers", async () => {
    let release!: () => void;
    const answered = new Promise<void>((resolve) => (release = resolve));
    let sent: unknown;
    server.use(
      http.patch("*/api/v1/flags/new-checkout", async ({ request }) => {
        sent = await request.json();
        await answered;
        return HttpResponse.json(makeFlag({ enabled: true, version: 2 }));
      }),
    );
    await renderApp();

    await userEvent.click(theSwitch());

    expect(theSwitch()).toHaveAttribute("aria-checked", "true");
    await act(async () => release());
    expect(theSwitch()).toHaveAttribute("aria-checked", "true");
    expect(sent).toEqual({ version: 1, enabled: true });
  });

  test("rolls back and explains when the server fails", async () => {
    server.use(
      http.patch("*/api/v1/flags/new-checkout", () =>
        problem(500, { type: "internal_error", title: "Boom", status: 500, request_id: "abcdef1234" }),
      ),
    );
    await renderApp();

    await click(theSwitch());

    expect(theSwitch()).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't update new-checkout/i);
    expect(screen.getByRole("alert")).toHaveTextContent("ref abcdef12");
  });

  test("on a conflict, shows the current values and says it was edited elsewhere", async () => {
    const current: Flag = makeFlag({ name: "Checkout (renamed)", enabled: false, version: 3 });
    server.use(
      http.patch("*/api/v1/flags/new-checkout", () =>
        problem(409, {
          type: "version_conflict",
          title: "'new-checkout' had already been edited. Check current values.",
          status: 409,
          current,
        }),
      ),
    );
    await renderApp();

    await click(theSwitch());

    expect(theSwitch()).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Checkout (renamed)")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "new-checkout had already been edited. Check current values.",
    );
  });

  test("a conflict that already matches what was asked for counts as success", async () => {
    server.use(
      http.patch("*/api/v1/flags/new-checkout", () =>
        problem(409, {
          type: "version_conflict",
          title: "conflict",
          status: 409,
          current: makeFlag({ enabled: true, version: 2 }),
        }),
      ),
    );
    await renderApp();

    await click(theSwitch());

    expect(theSwitch()).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
