import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, test } from "vitest";
import { makeFlag } from "../../test/factories";
import { renderApp } from "../../test/renderApp";
import { server } from "../../test/server";

beforeEach(() => {
  server.use(
    http.get("*/api/v1/flags", () =>
      HttpResponse.json([
        makeFlag({ key: "dark-mode", name: "Dark mode" }),
        makeFlag({ key: "new-checkout", name: "New checkout" }),
      ]),
    ),
  );
});

describe("filtering flags", () => {
  test("shows only flags whose key or name matches", async () => {
    await renderApp();

    await userEvent.type(screen.getByRole("searchbox", { name: "Filter flags" }), "dark");

    expect(screen.getByText("Dark mode")).toBeInTheDocument();
    expect(screen.queryByText("New checkout")).not.toBeInTheDocument();
  });

  test("says so when nothing matches", async () => {
    await renderApp();

    await userEvent.type(screen.getByRole("searchbox", { name: "Filter flags" }), "zzz");

    expect(screen.getByText('No flags match "zzz".')).toBeInTheDocument();
  });
});
