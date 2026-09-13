import { QueryClient } from "@tanstack/react-query";

/**
 * Shared TanStack Query client instance.
 *
 * Configuration:
 *  - staleTime: 30s — avoids re-fetching on every focus for list views
 *  - retry: 1 — retry failed requests once before showing an error
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
