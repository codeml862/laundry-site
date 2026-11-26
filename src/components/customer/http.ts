export class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const result = await fetch(path, {
    cache: "no-store",
    ...options,
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });
  const data = await result.json().catch(() => null);
  if (!result.ok) {
    const message = typeof data?.error === "string" ? data.error : (typeof data?.message === "string" ? data.message : "Something went wrong. Please try again.");
    throw new RequestError(message, result.status);
  }
  return data as T;
}

const retryable = new Set([502, 503, 504]);
const retryDelays = [800, 2000, 4000];
const wait = (ms: number, signal?: AbortSignal | null) => new Promise<void>((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
});

/** GET with automatic retries for temporary outages (e.g. the database waking up). Not used for writes. */
export async function getWithRetry<T>(path: string, options?: RequestInit): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request<T>(path, options);
    } catch (error) {
      const temporary = error instanceof RequestError ? retryable.has(error.status) : !(error instanceof DOMException && error.name === "AbortError");
      if (!temporary || attempt >= retryDelays.length || options?.signal?.aborted) throw error;
      await wait(retryDelays[attempt], options?.signal);
    }
  }
}

export function post<T>(path: string, body: Record<string, unknown>) {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function friendlyError(error: unknown) {
  if (error instanceof RequestError) {
    return retryable.has(error.status) ? "We're having trouble connecting right now. Please try again in a moment." : error.message;
  }
  return "We couldn't connect. Check your internet connection and try again.";
}

export const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function rupees(paise: number) {
  return money.format(paise / 100);
}
