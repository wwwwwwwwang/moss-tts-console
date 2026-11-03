import type { ApiErrorPayload, StatsResponse, UploadResponse } from '../types'
import { getAuthToken, notifyUnauthorized } from '../auth/session'

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function detailMessage(detail: ApiErrorPayload['detail']): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || '请求参数不合法').join('；')
  }
  return ''
}

export async function parseErrorResponse(response: Response): Promise<string> {
  const fallback = `请求失败（HTTP ${response.status}）`
  try {
    const text = await response.text()
    if (!text) return fallback
    try {
      const data = JSON.parse(text) as ApiErrorPayload
      return detailMessage(data.detail) || fallback
    } catch {
      return text.slice(0, 240)
    }
  } catch {
    return fallback
  }
}

function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra || {})
  const token = getAuthToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: authHeaders(init.headers),
    })
  } catch {
    throw new ApiError('无法连接控制台服务，请检查网络或服务状态')
  }

  if (response.status === 401) {
    notifyUnauthorized()
    throw new ApiError('认证已失效，请重新登录', 401)
  }
  if (!response.ok) {
    throw new ApiError(await parseErrorResponse(response), response.status)
  }
  return (await response.json()) as T
}

export function fetchStats(overrideToken?: string): Promise<StatsResponse> {
  const headers = new Headers()
  const token = overrideToken ?? getAuthToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(`${API_BASE}/admin/stats`, { headers }).then(async (response) => {
    if (response.status === 401) {
      throw new ApiError('API Token 无效', 401)
    }
    if (!response.ok) {
      throw new ApiError(await parseErrorResponse(response), response.status)
    }
    return (await response.json()) as StatsResponse
  })
}

export async function synthesizeSpeech(text: string, voice: string): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}/v1/audio/speech`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        model: 'moss-tts-nano',
        input: text,
        voice,
        response_format: 'wav',
      }),
    })
  } catch {
    throw new ApiError('合成请求失败，请检查网络或服务状态')
  }
  if (response.status === 401) {
    notifyUnauthorized()
    throw new ApiError('认证已失效，请重新登录', 401)
  }
  if (!response.ok) {
    throw new ApiError(await parseErrorResponse(response), response.status)
  }
  return response.blob()
}

export function uploadVoice(
  name: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('name', name)
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/admin/voices`)
    const token = getAuthToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onerror = () => reject(new ApiError('上传失败，请检查网络'))
    xhr.onload = () => {
      if (xhr.status === 401) {
        notifyUnauthorized()
        reject(new ApiError('认证已失效，请重新登录', 401))
        return
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResponse)
        } catch {
          reject(new ApiError('上传成功，但响应格式无法解析'))
        }
        return
      }
      let message = `上传失败（HTTP ${xhr.status}）`
      try {
        const data = JSON.parse(xhr.responseText) as ApiErrorPayload
        message = detailMessage(data.detail) || message
      } catch {
        if (xhr.responseText) message = xhr.responseText.slice(0, 240)
      }
      reject(new ApiError(message, xhr.status))
    }
    xhr.send(form)
  })
}

export function deleteVoice(name: string): Promise<{ ok: boolean }> {
  return apiRequest(`/admin/voices/${encodeURIComponent(name)}`, { method: 'DELETE' })
}
