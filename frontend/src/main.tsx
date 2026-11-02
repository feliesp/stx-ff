import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { fetchFlags } from "./api/client";

// Start loading before the first render, so use() gets one stable promise.
const initialFlagsPromise = fetchFlags();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App initialFlagsPromise={initialFlagsPromise} />
  </StrictMode>,
);
