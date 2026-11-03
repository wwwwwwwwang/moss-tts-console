import { computed, ref } from 'vue'

const TOKEN_KEY = 'moss_tts_token'
const REMEMBER_KEY = 'moss_tts_remember'

function readInitialToken(): string {
  const remembered = localStorage.getItem(TOKEN_KEY)
  if (remembered) return remembered
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

const token = ref(readInitialToken())
const remember = ref(localStorage.getItem(REMEMBER_KEY) === '1')
const unauthorizedReason = ref('')
let unauthorizedHandler: (() => void) | null = null

export const isAuthenticated = computed(() => Boolean(token.value))
export const tokenValue = computed(() => token.value)
export const rememberToken = computed(() => remember.value)
export const authFailureReason = computed(() => unauthorizedReason.value)

export function maskedToken(): string {
  const value = token.value
  if (!value) return '未登录'
  if (value.length <= 12) return '••••••••'
  return `${value.slice(0, 6)}••••••••${value.slice(-4)}`
}

export function setAuthToken(nextToken: string, shouldRemember: boolean): void {
  const value = nextToken.trim()
  token.value = value
  remember.value = shouldRemember
  unauthorizedReason.value = ''
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
  if (value) {
    if (shouldRemember) {
      localStorage.setItem(TOKEN_KEY, value)
      localStorage.setItem(REMEMBER_KEY, '1')
    } else {
      sessionStorage.setItem(TOKEN_KEY, value)
      localStorage.setItem(REMEMBER_KEY, '0')
    }
  }
}

export function clearAuth(reason = ''): void {
  token.value = ''
  unauthorizedReason.value = reason
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REMEMBER_KEY)
}

export function getAuthToken(): string {
  return token.value
}

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.()
}
