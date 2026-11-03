import { ref, watch } from 'vue'

const AUTO_KEY = 'moss_tts_auto_refresh'
const INTERVAL_KEY = 'moss_tts_poll_seconds'

function readBoolean(key: string, fallback: boolean): boolean {
  const value = localStorage.getItem(key)
  if (value === null) return fallback
  return value === '1'
}

export const autoRefresh = ref(readBoolean(AUTO_KEY, true))
export const pollSeconds = ref(Number(localStorage.getItem(INTERVAL_KEY)) || 10)

watch(autoRefresh, (value) => localStorage.setItem(AUTO_KEY, value ? '1' : '0'))
watch(pollSeconds, (value) => localStorage.setItem(INTERVAL_KEY, String(value)))

export function setAutoRefresh(value: boolean): void {
  autoRefresh.value = value
}

export function setPollSeconds(value: number): void {
  if ([5, 10, 30].includes(value)) pollSeconds.value = value
}
