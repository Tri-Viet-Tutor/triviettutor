import { QueryClient } from "@tanstack/react-query";

/**
 * QueryClient (TanStack Query) dùng chung cho cả ứng dụng.
 *
 * Cấu hình:
 *  - staleTime 30 giây: không tải lại danh sách mỗi lần chuyển qua lại
 *  - retry 1: request lỗi thì thử lại 1 lần rồi mới báo lỗi
 *  - refetchOnWindowFocus false: quay lại tab trình duyệt không tự tải lại
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
