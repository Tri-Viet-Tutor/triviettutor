import { type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Global provider tree.
 * Add new providers here (Theme, Toast, etc.) without touching main.tsx.
 *
 * Current providers:
 *  - QueryClientProvider  — TanStack Query cache
 *  - ReactQueryDevtools   — visible only in development
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
