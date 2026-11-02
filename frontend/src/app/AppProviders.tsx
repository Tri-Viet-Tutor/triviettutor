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

      {/* Devtools (nút tròn logo TanStack) chỉ hiện khi bật VITE_QUERY_DEVTOOLS=true trong frontend/.env khi phát triển */}
      {import.meta.env.DEV && import.meta.env.VITE_QUERY_DEVTOOLS === "true" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
