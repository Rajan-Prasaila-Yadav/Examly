// apps/web/src/lib/query/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds fresh
        gcTime: 5 * 60 * 1000, // 5 minutes cache retention
        refetchOnWindowFocus: false, // Prevent unnecessary network churn
        refetchOnReconnect: true,
        retry: 1, // Only retry once on failure
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export const queryClient = createQueryClient();
