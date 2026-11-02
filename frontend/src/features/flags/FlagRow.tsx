import { useState } from "react";
import type { Flag } from "../../api/types";
import { FlagSwitch } from "./FlagSwitch";

type Props = { flag: Flag; isNew: boolean };

export function FlagRow({ flag, isNew }: Props) {
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <li className={isNew ? "flag flag--new" : "flag"}>
      <div className="flag__main">
        <div className="flag__text">
          <span className="flag__name">{flag.name}</span>
          <code className="flag__key">{flag.key}</code>
          {flag.description && <p className="flag__description">{flag.description}</p>}
        </div>
        <FlagSwitch flag={flag} onProblem={setProblem} />
      </div>
      {problem && (
        <p role="alert" className="flag__problem">
          {problem}
        </p>
      )}
    </li>
  );
}
