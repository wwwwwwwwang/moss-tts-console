export type ServiceStatus = 'ok' | 'loading' | 'error'

export interface RecentRequest {
  ts: number
  text: string
  voice: string
  chars: number
  seconds: number
  cached: boolean
  bytes: number
}

export interface StatsResponse {
  status: ServiceStatus
  model: string
  model_loaded: boolean
  load_seconds: number | null
  error: string | null
  uptime_seconds: number
  voices: string[]
  stats: {
    requests: number
    cache_hits: number
    errors: number
  }
  recent: RecentRequest[]
}

export interface AudioResult {
  url: string
  blob: Blob
  voice: string
  text: string
  seconds: number
  bytes: number
  createdAt: number
}

export interface UploadResponse {
  ok: boolean
  voice: string
  duration: number
}

export interface ApiErrorPayload {
  detail?: string | Array<{ msg?: string; loc?: Array<string | number> }>
}
