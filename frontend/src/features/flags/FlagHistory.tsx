import { use } from "react";
import type { Change } from "../../api/types";

type Props = { flagKey: string; historyPromise: Promise<Change[]> };

export function FlagHistory({ flagKey, historyPromise }: Props) {
  const changes = use(historyPromise);

  return (
    <ol className="history" aria-label={`History of ${flagKey}`}>
      {changes.map((change) => (
        <li key={change.version} className="history__entry">
          <span className="history__version">v{change.version}</span>
          <span>{describeChange(change)}</span>
          <time dateTime={change.created_at} className="history__time">
            {new Date(change.created_at).toLocaleString()}
          </time>
        </li>
      ))}
    </ol>
  );
}

function describeChange(change: Change): string {
  if (change.action === "created") return "Created";
  return Object.entries(change.changes)
    .map(([field, [before, after]]) =>
      field === "enabled"
        ? after
          ? "Enabled"
          : "Disabled"
        : `${capitalize(field)}: "${String(before)}" → "${String(after)}"`,
    )
    .join("; ");
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
