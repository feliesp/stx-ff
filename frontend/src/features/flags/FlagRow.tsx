import { startTransition, Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { fetchHistory } from "../../api/client";
import type { Change, Flag } from "../../api/types";
import { EditFlagDialog } from "./EditFlagDialog";
import { FlagHistory } from "./FlagHistory";
import { FlagSwitch } from "./FlagSwitch";

type Props = { flag: Flag; isNew: boolean };

type LoadedHistory = { promise: Promise<Change[]>; version: number };

const loadHistory = (flag: Flag): LoadedHistory => ({
  promise: fetchHistory(flag.key),
  version: flag.version,
});

export function FlagRow({ flag, isNew }: Props) {
  const [problem, setProblem] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  // null = history closed. The promise is created in event handlers/effects,
  // never in render, and remembers which flag version it was fetched for.
  const [history, setHistory] = useState<LoadedHistory | null>(null);
  const historyOpen = history !== null;

  useEffect(() => {
    // Refresh an open history when the flag changes. As a transition, React
    // keeps showing the old entries until the new ones arrive (no flicker).
    if (history && history.version !== flag.version) {
      startTransition(() => setHistory(loadHistory(flag)));
    }
  }, [history, flag]);

  return (
    <li className={isNew ? "flag flag--new" : "flag"}>
      <div className="flag__main">
        <div className="flag__text">
          <span className="flag__name">{flag.name}</span>
          <code className="flag__key">{flag.key}</code>
          {flag.description && <p className="flag__description">{flag.description}</p>}
        </div>
        <button type="button" className="button button--small" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button
          type="button"
          className="button button--small"
          aria-expanded={historyOpen}
          onClick={() => setHistory(historyOpen ? null : loadHistory(flag))}
        >
          History
        </button>
        <FlagSwitch flag={flag} onProblem={setProblem} />
      </div>
      {problem && (
        <p role="alert" className="flag__problem">
          {problem}
        </p>
      )}
      {editing && <EditFlagDialog flag={flag} onClose={() => setEditing(false)} />}
      {history && (
        <ErrorBoundary fallback={<p className="flag__problem">Couldn't load history.</p>}>
          <Suspense fallback={<p className="loading">Loading history…</p>}>
            <FlagHistory flagKey={flag.key} historyPromise={history.promise} />
          </Suspense>
        </ErrorBoundary>
      )}
    </li>
  );
}
