import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test } from "vitest";
import { makeFlag } from "../../test/factories";
import { renderApp } from "../../test/renderApp";
import { server } from "../../test/server";

const field = (name: string) => screen.getByLabelText(name, { exact: false });

async function submit() {
  await act(async () => {
    await userEvent.click(screen.getByRole("button", { name: "Create flag" }));
  });
}

beforeEach(() => {
  server.use(http.get("*/api/v1/flags", () => HttpResponse.json([])));
});

describe("creating a flag", () => {
  test("suggests a key from the name until the key is edited by hand", async () => {
    await renderApp();

    await userEvent.type(field("Name"), "New Checkout Flow!");
    expect(field("Key")).toHaveValue("new-checkout-flow");

    await userEvent.clear(field("Key"));
    await userEvent.type(field("Key"), "checkout-v2");
    await userEvent.type(field("Name"), " 2");
    expect(field("Key")).toHaveValue("checkout-v2");
  });

  test("adds the new flag to the list and clears the form", async () => {
    let sent: unknown;
    server.use(
      http.post("*/api/v1/flags", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(makeFlag({ description: "Redesign" }), { status: 201 });
      }),
    );
    await renderApp();

    await userEvent.type(field("Name"), "New checkout");
    await userEvent.type(field("Description"), "Redesign");
    await submit();

    expect(sent).toEqual({ key: "new-checkout", name: "New checkout", description: "Redesign" });
    const list = screen.getByRole("list");
    expect(within(list).getByText("New checkout")).toBeInTheDocument();
    expect(field("Name")).toHaveValue("");
    expect(field("Key")).toHaveValue("");
  });

  test("shows the server's field errors and keeps what was typed", async () => {
    server.use(
      http.post("*/api/v1/flags", () =>
        HttpResponse.json(
          {
            type: "flag_key_taken",
            title: "A flag with key 'new-checkout' already exists.",
            status: 409,
            errors: { key: ["A flag with key 'new-checkout' already exists."] },
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    await renderApp();

    await userEvent.type(field("Name"), "New checkout");
    await submit();

    expect(screen.getByText("A flag with key 'new-checkout' already exists.")).toBeInTheDocument();
    expect(field("Name")).toHaveValue("New checkout");
    expect(field("Key")).toHaveValue("new-checkout");
  });
});
