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

async function openEditor() {
  await click(screen.getByRole("button", { name: "Edit" }));
  return screen.getByRole("dialog", { name: "Edit new-checkout" });
}

beforeEach(() => {
  server.use(http.get("*/api/v1/flags", () => HttpResponse.json([makeFlag()])));
});

describe("editing a flag", () => {
  test("saves the new name and description with the version it was based on", async () => {
    let sent: unknown;
    server.use(
      http.patch("*/api/v1/flags/new-checkout", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(
          makeFlag({ name: "Checkout v2", description: "Redesign", version: 2 }),
        );
      }),
    );
    await renderApp();
    const dialog = await openEditor();

    const name = within(dialog).getByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "Checkout v2");
    await userEvent.type(within(dialog).getByLabelText("Description"), "Redesign");
    await click(within(dialog).getByRole("button", { name: "Save" }));

    expect(sent).toEqual({ version: 1, name: "Checkout v2", description: "Redesign" });
    expect(screen.getByText("Checkout v2")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("on a conflict, keeps the draft, shows current values, and saves over them next time", async () => {
    const sent: unknown[] = [];
    server.use(
      http.patch("*/api/v1/flags/new-checkout", async ({ request }) => {
        sent.push(await request.json());
        if (sent.length === 1) {
          return HttpResponse.json(
            {
              type: "version_conflict",
              title: "conflict",
              status: 409,
              current: makeFlag({ name: "Renamed elsewhere", version: 4 }),
            },
            { status: 409, headers: { "Content-Type": "application/problem+json" } },
          );
        }
        return HttpResponse.json(makeFlag({ name: "My draft", version: 5 }));
      }),
    );
    await renderApp();
    const dialog = await openEditor();

    const name = within(dialog).getByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "My draft");
    await click(within(dialog).getByRole("button", { name: "Save" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "new-checkout had already been edited. Check current values.",
    );
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Renamed elsewhere");
    expect(name).toHaveValue("My draft");

    await click(within(dialog).getByRole("button", { name: "Save" }));

    expect(sent[1]).toMatchObject({ version: 4, name: "My draft" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
