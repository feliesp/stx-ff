// Thin typed wrapper around fetch for the flags API. Every non-2xx response
// becomes an ApiError carrying the server's Problem Details body.
import type { Flag, Problem } from "./types";

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
