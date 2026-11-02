import { useFlags } from "./flagsContext";

export function FlagList() {
  const { state } = useFlags();

  if (state.flags.length === 0) {
    return <p className="empty">No flags yet. Create your first one above.</p>;
  }

  return (
    <ul className="flag-list">
      {state.flags.map((flag) => (
        <li key={flag.key} className="flag">
          <div className="flag__text">
            <span className="flag__name">{flag.name}</span>
            <code className="flag__key">{flag.key}</code>
            {flag.description && <p className="flag__description">{flag.description}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
