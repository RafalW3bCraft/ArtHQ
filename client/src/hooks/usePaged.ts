import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/queryClient";
import { useAuth } from "./useAuth";
import type { Page } from "@shared/generation";
export function usePaged<T>(url: string, enabled = true, poll: boolean | number = false) {
  const { user } = useAuth();
  const query = useInfiniteQuery({
    queryKey: [url, user?.uid],
    initialPageParam: undefined as string | undefined,
    enabled,
    queryFn: async ({ pageParam, signal }) => {
      const result = await api<Page<T> | T[]>(
        `${url}${pageParam ? `${url.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(pageParam)}` : ""}`,
        { signal, headers: { "X-List-Pagination": "cursor" } },
      );
      return Array.isArray(result)
        ? { items: result, nextCursor: null }
        : result;
    },
    getNextPageParam: (last) => last.nextCursor || undefined,
    refetchInterval: typeof poll === "number" ? poll : poll ? 5000 : false,
  });
  return {
    ...query,
    items: query.data?.pages.flatMap((page) => page.items) || [],
  };
}
