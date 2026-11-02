// A fake network for component tests (Mock Service Worker). Tests register the
// responses they need with `server.use(...)`. Handlers match "*/api/..." because
// jsdom resolves relative URLs against its own origin.
import { setupServer } from "msw/node";

export const server = setupServer();
