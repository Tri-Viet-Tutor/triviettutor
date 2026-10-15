import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/services/queryClient";
import type { AppProvidersProps } from "@/interfaces/app";

// Cung cấp TanStack Query cho toàn bộ ứng dụng
export function AppProviders({ children }: AppProvidersProps) {
  return (
    // Cho phép các component con sử dụng React Query
    <QueryClientProvider client={queryClient}>
      {children}

      {/* Chỉ hiển thị Devtools trong môi trường development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
