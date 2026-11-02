import { act, render } from "@testing-library/react";
import App from "../App";
import { fetchFlags } from "../api/client";

/** Render the whole app and wait for the initial flag list to load. */
export async function renderApp() {
  // use() suspends on the promise; awaiting act lets it resolve inside the test.
  await act(async () => {
    render(<App initialFlagsPromise={fetchFlags()} />);
  });
}
