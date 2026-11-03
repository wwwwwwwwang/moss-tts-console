import { inject, provide, type InjectionKey } from 'vue'
import type { useStatsQuery } from '../composables/useStatsQuery'

type StatsQuery = ReturnType<typeof useStatsQuery>

export interface AppContext {
  statsQuery: StatsQuery
}

const appContextKey: InjectionKey<AppContext> = Symbol('moss-app-context')

export function provideAppContext(context: AppContext): void {
  provide(appContextKey, context)
}

export function useAppContext(): AppContext {
  const context = inject(appContextKey)
  if (!context) throw new Error('App context is not available')
  return context
}
