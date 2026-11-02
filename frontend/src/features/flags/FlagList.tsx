import { FlagRow } from "./FlagRow";
import { useFlags } from "./flagsContext";

export function FlagList() {
  const { state } = useFlags();

  if (state.flags.length === 0) {
    return <p className="empty">No flags yet. Create your first one above.</p>;
  }

  return (
    <ul className="flag-list">
      {state.flags.map((flag) => (
        <FlagRow key={flag.key} flag={flag} />
      ))}
    </ul>
  );
}
