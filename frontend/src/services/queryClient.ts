import { MutationCache, QueryClient, type QueryKey } from "@tanstack/react-query";

/** Khai báo mở rộng metadata của TanStack Query Mutation cho auto-invalidation */
declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      invalidates?: QueryKey[];
    };
  }
}

/**
 * QueryClient (TanStack Query) dùng chung cho cả ứng dụng.
 *
 * Tích hợp cơ chế Auto-Invalidation thông qua MutationCache:
 * Bất kỳ mutation nào thành công nếu khai báo meta.invalidates sẽ tự động
 * kích hoạt queryClient.invalidateQueries mà không cần code lặp lại ở UI.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      const meta = mutation.meta as { invalidates?: QueryKey[] } | undefined;
      if (meta?.invalidates && Array.isArray(meta.invalidates)) {
        for (const key of meta.invalidates) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
      }
    },
  }),
});
