import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { fetchFlags } from "./api/client";
import type { Flag } from "./api/types";
import { CreateFlagForm } from "./features/flags/CreateFlagForm";
import { FlagList } from "./features/flags/FlagList";
import { FlagsProvider } from "./features/flags/FlagsProvider";
import { LoadError } from "./features/flags/LoadError";
import { UndoToast } from "./features/flags/UndoToast";

type Props = { initialFlagsPromise: Promise<Flag[]> };

export default function App({ initialFlagsPromise }: Props) {
  const [flagsPromise, setFlagsPromise] = useState(initialFlagsPromise);

  return (
    <main className="page">
      <h1>Feature flags</h1>
      {/* Retry: start a fresh request (in an event, not during render) and remount. */}
      <ErrorBoundary FallbackComponent={LoadError} onReset={() => setFlagsPromise(fetchFlags())}>
        <Suspense fallback={<p className="loading">Loading flags…</p>}>
          <FlagsProvider flagsPromise={flagsPromise}>
            <CreateFlagForm />
            <FlagList />
            <UndoToast />
          </FlagsProvider>
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}
