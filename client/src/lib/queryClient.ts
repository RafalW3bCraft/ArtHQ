import { QueryClient } from "@tanstack/react-query";
import { auth } from "./firebase";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export async function api<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };
  if (auth?.currentUser)
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal ?? AbortSignal.timeout(60000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError")
      throw new ApiError("The request took too long. Please try again.", 504);
    throw error;
  }
  if (
    response.status !== 204 &&
    !response.headers.get("content-type")?.includes("application/json")
  ) {
    throw new ApiError(
      "The site service is temporarily unavailable. Please try again later.",
      502,
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body.error || "We could not complete that request. Please try again.",
      response.status,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const send = <T = any>(url: string, data: unknown, method = "POST") =>
  api<T>(url, { method, body: JSON.stringify(data) });
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: ({ queryKey, signal }) => api(String(queryKey[0]), { signal }),
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
