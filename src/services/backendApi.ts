import { firebaseAuth } from "../firebase";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:3000";

type QueryValue = string | number | boolean | undefined | null;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
};

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, API_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

/**
 * Resolve the current user's ID token, waiting for Firebase to restore the
 * persisted session first. On a fresh page load `currentUser` is null until the
 * async auth-state restore completes; without waiting, requests go out with no
 * bearer token and the backend rejects them ("missing authorization bearer
 * token"). `authStateReady()` resolves once the initial state is known.
 */
async function getAuthToken(): Promise<string | undefined> {
  try {
    await firebaseAuth.authStateReady();
  } catch {
    // Defensive: older SDKs may lack authStateReady — fall back to currentUser.
  }
  return firebaseAuth.currentUser?.getIdToken();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body } = options;

  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export const backendApi = {
  get<T>(path: string, query?: Record<string, QueryValue>) {
    return request<T>(path, { method: "GET", query });
  },
  post<T>(path: string, body?: unknown, query?: Record<string, QueryValue>) {
    return request<T>(path, { method: "POST", body, query });
  },
  patch<T>(path: string, body?: unknown, query?: Record<string, QueryValue>) {
    return request<T>(path, { method: "PATCH", body, query });
  },
  delete<T>(path: string, query?: Record<string, QueryValue>) {
    return request<T>(path, { method: "DELETE", query });
  },
  async upload<T>(path: string, formData: FormData, query?: Record<string, QueryValue>) {
    const token = await getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(buildUrl(path, query), {
      method: "POST",
      headers,
      body: formData,
    });

    if (response.status === 204) {
      return null as T;
    }

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = payload?.error || payload?.message || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload as T;
  },
};
