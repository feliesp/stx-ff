import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { makeFlag } from "./test/factories";
import { renderApp } from "./test/renderApp";
import { server } from "./test/server";

describe("loading the flag list", () => {
  test("shows each flag's name, key and description", async () => {
    server.use(
      http.get("*/api/v1/flags", () =>
        HttpResponse.json([makeFlag({ description: "Redesigned checkout flow" })]),
      ),
    );

    await renderApp();

    expect(screen.getByRole("heading", { name: "Feature flags" })).toBeInTheDocument();
    expect(screen.getByText("New checkout")).toBeInTheDocument();
    expect(screen.getByText("new-checkout")).toBeInTheDocument();
    expect(screen.getByText("Redesigned checkout flow")).toBeInTheDocument();
  });

  test("explains what to do when there are no flags yet", async () => {
    server.use(http.get("*/api/v1/flags", () => HttpResponse.json([])));

    await renderApp();

    expect(screen.getByText(/no flags yet/i)).toBeInTheDocument();
  });

  test("shows an error with a support reference, and can retry", async () => {
    server.use(http.get("*/api/v1/flags", () => HttpResponse.json([makeFlag()])));
    server.use(
      http.get(
        "*/api/v1/flags",
        () =>
          HttpResponse.json(
            { type: "internal_error", title: "Boom", status: 500, request_id: "abcdef1234567890" },
            { status: 500, headers: { "Content-Type": "application/problem+json" } },
          ),
        { once: true },
      ),
    );

    await renderApp();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load flags/i);
    expect(screen.getByRole("alert")).toHaveTextContent("ref abcdef12");

    // Retrying suspends again; awaiting act lets the new request resolve.
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    });

    expect(screen.getByText("New checkout")).toBeInTheDocument();
  });
});
