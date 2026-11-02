import { FlagRow } from "./FlagRow";
import { useFlags } from "./flagsContext";
import { visibleFlags } from "./flagsReducer";

export function FlagList() {
  const { state, dispatch } = useFlags();

  if (state.flags.length === 0) {
    return <p className="empty">No flags yet. Create your first one above.</p>;
  }

  const flags = visibleFlags(state);
  return (
    <section aria-label="Flags">
      <input
        type="search"
        className="filter"
        aria-label="Filter flags"
        placeholder="Filter by key or name…"
        value={state.filter}
        onChange={(e) => dispatch({ type: "filter_changed", filter: e.target.value })}
      />
      {flags.length === 0 ? (
        <p className="empty">No flags match "{state.filter}".</p>
      ) : (
        <ul className="flag-list">
          {flags.map((flag) => (
            <FlagRow key={flag.key} flag={flag} isNew={flag.key === state.lastCreatedKey} />
          ))}
        </ul>
      )}
    </section>
  );
}
