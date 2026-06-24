function resolveApiUrl(): string {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return "demo://local";
  }
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return "/api/backend";
}

export const API_URL = resolveApiUrl();
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
export const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "dev-secret";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function demoRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const { initDemoFromJson, demoApi, ingestDemoCsv } = await import("./demo-store");
  await initDemoFromJson(BASE_PATH);
  const method = options?.method?.toUpperCase();
  if (path.startsWith("/ingest/csv") && method !== "GET") {
    return ingestDemoCsv(BASE_PATH) as Promise<T>;
  }
  return demoApi(path, options) as T;
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  if (IS_DEMO_MODE || API_URL === "demo://local") {
    return demoRequest<T>(path, options);
  }

  const url = `${API_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new ApiError(`API request timed out (${url}). Is the backend running on port 8000?`);
    }
    throw new ApiError(
      `Cannot reach the API at ${url}. Start the backend: ` +
        "`uvicorn backend.main:app --port 8000`"
    );
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || res.statusText, res.status);
  }
  return res.json();
}

export function apiAdmin<T>(path: string, options?: RequestInit): Promise<T> {
  return api<T>(path, {
    ...options,
    headers: {
      "X-Admin-Secret": ADMIN_SECRET,
      ...(options?.headers || {}),
    },
  });
}

export function sampleCsvUrl(): string {
  return `${BASE_PATH}/sample/apollo_export.csv`;
}
