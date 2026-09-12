// Minimal typed fetch helpers used by client components. Pages talk to the
// app's own Route Handlers under /api — no external services involved.

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T,>(url: string) => fetch(url, { cache: "no-store" }).then((r) => handle<T>(r)),
  post: <T,>(url: string, body?: unknown) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then((r) => handle<T>(r)),
  patch: <T,>(url: string, body?: unknown) =>
    fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then((r) => handle<T>(r)),
  del: <T,>(url: string) => fetch(url, { method: "DELETE" }).then((r) => handle<T>(r)),
};
