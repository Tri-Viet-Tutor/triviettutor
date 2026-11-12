import { MutationCache, QueryClient, type QueryKey } from "@tanstack/react-query";

/** Khai báo mở rộng metadata của TanStack Query Mutation cho auto-invalidation */
declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      invalidates?: QueryKey[];
    };
  }
}

// QueryClient (TanStack Query) dùng chung cho cả ứng dụng.
// Cấu hình:
// - staleTime 30 giây: không tải lại danh sách mỗi lần chuyển qua lại
// - retry 1: request lỗi thì thử lại 1 lần rồi mới báo lỗi
// - refetchOnWindowFocus false: quay lại tab trình duyệt không tự tải lại
// - mutation thành công có khai báo meta.invalidates thì tự tải lại các query đó, không cần lặp lại ở từng màn hình
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
