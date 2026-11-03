import { useQuery } from '@tanstack/vue-query'
import { fetchStats, ApiError } from '../api/client'
import { isAuthenticated, notifyUnauthorized } from '../auth/session'
import { autoRefresh, pollSeconds } from './polling'

export function useStatsQuery() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      try {
        return await fetchStats()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) notifyUnauthorized()
        throw error
      }
    },
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 2_000,
    refetchInterval: () =>
      isAuthenticated.value && autoRefresh.value ? pollSeconds.value * 1000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}
