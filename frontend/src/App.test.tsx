import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "./App";

test("shows the page title", () => {
  render(<App />);

  expect(screen.getByRole("heading", { name: "Feature flags" })).toBeInTheDocument();
});
