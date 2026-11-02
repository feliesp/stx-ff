// Thin typed wrapper around fetch for the flags API. Every non-2xx response
// becomes an ApiError carrying the server's Problem Details body.
import type { Change, Flag, Problem } from "./types";

const BASE = "/api/v1";

export class ApiError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.title);
    this.name = "ApiError";
    this.problem = problem;
  }

  /** Short request ID that support can search logs for. */
  get reference(): string | undefined {
    return this.problem.request_id?.slice(0, 8);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError({ type: "network_error", title: "Can't reach the server.", status: 0 });
  }
  if (!response.ok) {
    throw new ApiError(await readProblem(response));
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

async function readProblem(response: Response): Promise<Problem> {
  const requestId = response.headers.get("X-Request-ID");
  try {
    const problem = (await response.json()) as Problem;
    return { ...problem, request_id: problem.request_id ?? requestId };
  } catch {
    // Not a Problem body (e.g. a proxy error page): describe it generically.
    return { type: "http_error", title: response.statusText, status: response.status, request_id: requestId };
  }
}

export function fetchFlags(): Promise<Flag[]> {
  return request<Flag[]>("/flags");
}

export type FlagChanges = {
  version: number;
  enabled?: boolean;
  name?: string;
  description?: string;
};

/** Partial update; `version` is the version the change is based on. */
export function updateFlag(key: string, changes: FlagChanges): Promise<Flag> {
  return request<Flag>(`/flags/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

/** The flag's current state, if the error is an optimistic-concurrency conflict. */
export function conflictingFlag(error: unknown): Flag | undefined {
  return error instanceof ApiError && error.problem.type === "version_conflict"
    ? error.problem.current
    : undefined;
}

/** A user-facing sentence for an unexpected API failure. */
export function describeFailure(action: string, error: unknown): string {
  const reference = error instanceof ApiError ? error.reference : undefined;
  return reference ? `${action} (ref ${reference})` : action;
}

export type NewFlag = { key: string; name: string; description: string };

export function createFlag(flag: NewFlag): Promise<Flag> {
  return request<Flag>("/flags", { method: "POST", body: JSON.stringify(flag) });
}

export function fetchHistory(key: string): Promise<Change[]> {
  return request<Change[]>(`/flags/${encodeURIComponent(key)}/history`);
}
