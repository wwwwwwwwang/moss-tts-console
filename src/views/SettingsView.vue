<script setup lang="ts">
import { computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { NSwitch } from 'naive-ui'
import { Database, KeyRound, RefreshCw, Server } from 'lucide-vue-next'
import { useAppContext } from '../composables/appContext'
import { autoRefresh, pollSeconds, setAutoRefresh, setPollSeconds } from '../composables/polling'
import {
  clearAuth,
  maskedToken,
  rememberToken,
} from '../auth/session'
import { releaseAllAudio } from '../audio/synthesis'
import { studio } from '../stores/studio'
import { API_BASE } from '../api/client'

const { statsQuery } = useAppContext()
const { data, refetch } = statsQuery
const queryClient = useQueryClient()
const storageMode = computed(() =>
  rememberToken.value ? 'localStorage（跨会话记住）' : 'sessionStorage（仅当前标签页）',
)

const modelId = computed(() => data.value?.model || 'moss-tts-nano')
const basePath = computed(() => API_BASE || window.location.origin)

async function logout(): Promise<void> {
  clearAuth()
  releaseAllAudio()
  studio.result = null
  await queryClient.cancelQueries()
  queryClient.clear()
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <section class="card-base space-y-4 p-4 sm:p-5">
      <div class="flex items-start gap-2.5">
        <RefreshCw :size="18" class="mt-0.5 text-brand" aria-hidden="true" />
        <div>
          <h2 class="text-[16px] font-medium text-txt-main">自动刷新与轮询</h2>
          <p class="mt-0.5 text-xs text-txt-sec">控制后台读取 GET /admin/stats 的频率与页面刷新行为</p>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4 border-t border-line pt-3">
        <div>
          <div class="text-sm font-medium text-txt-main">启用自动刷新</div>
          <div class="mt-0.5 text-xs leading-relaxed text-txt-sec">
            默认开启；标签页隐藏时暂停，恢复可见时立即刷新
          </div>
        </div>
        <NSwitch
          :value="autoRefresh"
          aria-label="启用自动刷新"
          @update:value="setAutoRefresh"
        />
      </div>

      <div class="border-t border-line pt-3">
        <span class="mb-2 block text-sm font-medium text-txt-main">刷新频率</span>
        <div class="grid grid-cols-3 gap-2.5">
          <button
            v-for="seconds in [5, 10, 30]"
            :key="seconds"
            type="button"
            class="h-9 rounded-lg border text-xs font-medium tabular-nums transition-colors"
            :class="
              pollSeconds === seconds
                ? 'border-brand bg-brand-light text-brand'
                : 'border-line bg-subtle text-txt-sec hover:bg-surface'
            "
            :aria-pressed="pollSeconds === seconds"
            @click="setPollSeconds(seconds)"
          >
            {{ seconds }} 秒{{ seconds === 10 ? '（默认）' : '' }}
          </button>
        </div>
        <p class="mt-2 text-xs text-txt-muted">
          上一次刷新未结束时不会发起重叠请求；刷新状态不会覆盖正在编辑的合成文本。
        </p>
      </div>
    </section>

    <section class="card-base space-y-4 p-4 sm:p-5">
      <div class="flex items-start gap-2.5">
        <KeyRound :size="18" class="mt-0.5 text-brand" aria-hidden="true" />
        <div>
          <h2 class="text-[16px] font-medium text-txt-main">Token 会话管理</h2>
          <p class="mt-0.5 text-xs text-txt-sec">管理当前浏览器保存的 Bearer Token</p>
        </div>
      </div>

      <div class="space-y-2.5 border-t border-line pt-3 text-sm">
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs text-txt-sec">存储位置</span>
          <span class="rounded border border-line bg-subtle px-2 py-0.5 font-mono text-xs text-txt-main">
            {{ storageMode }}
          </span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs text-txt-sec">Token 掩码</span>
          <span class="font-mono text-xs text-txt-main">{{ maskedToken() }}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs text-txt-sec">鉴权方式</span>
          <span class="font-mono text-xs text-txt-sec">Authorization: Bearer &lt;token&gt;</span>
        </div>
      </div>

      <div class="flex items-center justify-between gap-3 border-t border-line pt-3">
        <span class="text-xs leading-relaxed text-txt-sec">
          退出时会清除 Token、查询缓存和全部音频对象 URL。
        </span>
        <button
          type="button"
          class="h-9 shrink-0 rounded-lg border border-red-200 bg-state-errBg px-3.5 text-xs font-medium text-state-err transition-colors hover:bg-red-100"
          @click="logout"
        >
          清除并退出
        </button>
      </div>
    </section>

    <section class="card-base space-y-3 p-4 sm:p-5">
      <div class="flex items-start gap-2.5">
        <Server :size="18" class="mt-0.5 text-brand" aria-hidden="true" />
        <div>
          <h2 class="text-[16px] font-medium text-txt-main">当前配置与接口</h2>
          <p class="mt-0.5 text-xs text-txt-sec">只读信息，不提供网页 Shell 或环境变量编辑</p>
        </div>
      </div>

      <dl class="divide-y divide-line border-t border-line text-xs">
        <div class="flex items-center justify-between gap-4 py-2.5">
          <dt class="shrink-0 text-txt-sec">API 基础路径</dt>
          <dd class="truncate font-mono text-txt-main" :title="basePath">{{ basePath }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2.5">
          <dt class="text-txt-sec">当前模型 ID</dt>
          <dd class="font-mono text-txt-main">{{ modelId }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2.5">
          <dt class="text-txt-sec">统计接口</dt>
          <dd class="font-mono text-txt-main">GET /admin/stats</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2.5">
          <dt class="text-txt-sec">合成接口</dt>
          <dd class="font-mono text-txt-main">POST /v1/audio/speech</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2.5">
          <dt class="text-txt-sec">音色管理</dt>
          <dd class="font-mono text-txt-main">POST / DELETE /admin/voices</dd>
        </div>
      </dl>

      <button type="button" class="btn-secondary text-xs" @click="refetch()">
        <RefreshCw :size="14" aria-hidden="true" />
        重新读取配置状态
      </button>
    </section>

    <section class="card-base flex flex-col justify-between gap-4 p-4 sm:p-5">
      <div class="flex items-start gap-2.5">
        <Database :size="18" class="mt-0.5 text-brand" aria-hidden="true" />
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-[16px] font-medium text-txt-main">关于控制台</h2>
            <span class="rounded bg-brand-light px-2 py-0.5 font-mono text-xs font-medium text-brand">v1.0.0</span>
          </div>
          <p class="mt-1 text-xs leading-relaxed text-txt-sec">
            个人单实例 MOSS-TTS-Nano 管理控制台，使用 Vue 3、TypeScript、Vite、Naive UI 与 TanStack Vue Query
            构建。
          </p>
        </div>
      </div>

      <div class="space-y-1 rounded-lg border border-line bg-subtle p-3 text-xs leading-relaxed text-txt-sec">
        <div class="font-medium text-txt-main">兼容性原则</div>
        <p>不改动模型推理、缓存和 systemd 配置；AstrBot 继续使用原有 OpenAI 兼容接口。</p>
        <p>旧版面板保留为独立回退入口，新版异常时无需重新部署服务端代码。</p>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[11px] text-txt-muted">
        <span>前端重做 · 后端少改 · 模型不动 · AstrBot 零感知</span>
        <span class="font-mono">moss-tts-console</span>
      </div>
    </section>
  </div>
</template>
