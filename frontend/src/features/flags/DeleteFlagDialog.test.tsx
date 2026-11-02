import { act, screen, within } from "@testing-library/react";
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

async function openConfirmation() {
  await click(screen.getByRole("button", { name: "Delete" }));
  return screen.getByRole("dialog", { name: "Delete new-checkout?" });
}

beforeEach(() => {
  server.use(http.get("*/api/v1/flags", () => HttpResponse.json([makeFlag()])));
});

describe("deleting a flag", () => {
  test("asks for confirmation, then removes the flag", async () => {
    let requested: URL | undefined;
    server.use(
      http.delete("*/api/v1/flags/new-checkout", ({ request }) => {
        requested = new URL(request.url);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderApp();
    const dialog = await openConfirmation();

    expect(dialog).toHaveTextContent("its key can't be reused");
    await click(within(dialog).getByRole("button", { name: "Delete flag" }));

    expect(requested?.searchParams.get("version")).toBe("1");
    expect(screen.queryByText("New checkout")).not.toBeInTheDocument();
    expect(screen.getByText(/no flags yet/i)).toBeInTheDocument();
  });

  test("cancelling keeps the flag and sends nothing", async () => {
    await renderApp();
    const dialog = await openConfirmation();

    await click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("New checkout")).toBeInTheDocument();
  });

  test("on a conflict, shows that it was edited and keeps asking", async () => {
    server.use(
      http.delete("*/api/v1/flags/new-checkout", () =>
        HttpResponse.json(
          {
            type: "version_conflict",
            title: "conflict",
            status: 409,
            current: makeFlag({ name: "Renamed elsewhere", version: 3 }),
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    await renderApp();
    const dialog = await openConfirmation();

    await click(within(dialog).getByRole("button", { name: "Delete flag" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "new-checkout had already been edited. Check current values.",
    );
    expect(screen.getByText("Renamed elsewhere")).toBeInTheDocument();
  });
});
