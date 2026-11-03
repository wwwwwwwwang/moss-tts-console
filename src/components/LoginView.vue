<script setup lang="ts">
import { ref } from 'vue'
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-vue-next'
import { fetchStats, ApiError } from '../api/client'
import { authFailureReason, setAuthToken } from '../auth/session'

const token = ref('')
const remember = ref(false)
const visible = ref(false)
const loading = ref(false)
const error = ref('')

async function submit(): Promise<void> {
  error.value = ''
  const value = token.value.trim()
  if (!value) {
    error.value = '请输入 API Token'
    return
  }
  loading.value = true
  try {
    await fetchStats(value)
    setAuthToken(value, remember.value)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      error.value = 'API Token 无效，请检查后重试'
    } else {
      error.value = err instanceof Error ? err.message : '无法验证 Token'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-page p-4">
    <div class="w-full max-w-[420px]">
      <div class="card-base p-6 sm:p-7">
        <div class="mb-5 flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-mono text-base font-semibold text-white"
            aria-hidden="true"
          >
            M
          </div>
          <div>
            <h1 class="text-[20px] font-medium leading-tight text-txt-main">MOSS TTS 控制台</h1>
            <p class="mt-0.5 text-xs text-txt-sec">单实例语音合成管理面板 · OpenAI 兼容接口</p>
          </div>
        </div>

        <div
          v-if="authFailureReason"
          class="mb-4 rounded-lg border border-red-200 bg-state-errBg p-3 text-xs leading-relaxed text-state-err"
          role="alert"
        >
          <div class="font-medium">登录状态已失效</div>
          <div class="mt-0.5 text-red-700/90">{{ authFailureReason }} 请重新输入 API Token。</div>
        </div>

        <form novalidate @submit.prevent="submit">
          <div class="mb-4">
            <label for="token-input" class="mb-1.5 block text-sm font-medium text-txt-main">
              API Token
            </label>
            <div class="relative">
              <KeyRound
                :size="16"
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted"
                aria-hidden="true"
              />
              <input
                id="token-input"
                v-model="token"
                :type="visible ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="输入服务端配置的 Bearer Token"
                class="field input-focus pl-9 pr-10 font-mono"
                :aria-invalid="Boolean(error)"
                aria-describedby="token-help token-error"
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-txt-sec hover:text-txt-main focus-ring"
                :aria-label="visible ? '隐藏 Token' : '显示 Token'"
                @click="visible = !visible"
              >
                <EyeOff v-if="visible" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
            <p id="token-help" class="mt-1.5 text-xs text-txt-sec">
              与服务端 <code class="rounded border border-line bg-subtle px-1 font-mono">TTS_TOKEN</code> 一致。Token
              仅用于当前请求，不会出现在 URL 中。
            </p>
            <p v-if="error" id="token-error" class="mt-1.5 text-xs text-state-err" role="alert">
              {{ error }}
            </p>
          </div>

          <label class="mb-5 flex cursor-pointer select-none items-start gap-2.5">
            <input
              v-model="remember"
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand"
            />
            <span>
              <span class="block text-sm text-txt-main">记住此 Token</span>
              <span class="mt-0.5 block text-xs leading-relaxed text-txt-sec">
                默认只保存在当前标签页的 sessionStorage；勾选后写入 localStorage。
              </span>
            </span>
          </label>

          <button type="submit" class="btn-primary w-full" :disabled="loading">
            <Loader2 v-if="loading" :size="16" class="animate-spin" aria-hidden="true" />
            <span>{{ loading ? '正在验证...' : '验证并进入控制台' }}</span>
          </button>

          <div class="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-txt-muted">
            <span>安全传输：<code class="font-mono">Authorization: Bearer</code></span>
            <span>P0 · v1.0</span>
          </div>
        </form>
      </div>
      <p class="mt-4 text-center text-xs text-txt-muted">MOSS-TTS-Nano · 个人单实例控制台</p>
    </div>
  </div>
</template>
