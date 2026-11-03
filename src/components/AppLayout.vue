<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import {
  AudioLines,
  History,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  Sun,
  X,
} from 'lucide-vue-next'
import StatusPill from './StatusPill.vue'
import { useAppContext } from '../composables/appContext'
import { formatClock, formatUptime } from '../utils/format'
import { clearAuth } from '../auth/session'
import { releaseAllAudio } from '../audio/synthesis'
import { studio } from '../stores/studio'

const route = useRoute()
const queryClient = useQueryClient()
const { statsQuery } = useAppContext()
const { data, error, isFetching, refetch, dataUpdatedAt } = statsQuery

const mobileOpen = ref(false)
const title = computed(() => String(route.meta.title || '控制台'))
const voices = computed(() => data.value?.voices || [])
const recent = computed(() => data.value?.recent || [])

const serviceStatus = computed<'ok' | 'loading' | 'error' | 'offline'>(() => {
  if (error.value && !data.value) return 'offline'
  if (!data.value) return 'loading'
  return data.value.status
})

const errorMessage = computed(() => {
  if (!error.value) return ''
  return error.value instanceof Error ? error.value.message : '无法读取服务状态'
})

const lastSync = computed(() => (dataUpdatedAt.value ? formatClock(dataUpdatedAt.value / 1000) : '—'))

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)

async function logout(): Promise<void> {
  clearAuth()
  releaseAllAudio()
  studio.result = null
  await queryClient.cancelQueries()
  queryClient.clear()
}

function navClass(active: boolean): string {
  return active
    ? 'bg-brand-light text-brand'
    : 'text-txt-sec hover:bg-subtle hover:text-txt-main'
}

const navItems = [
  { name: 'overview', label: '概览', icon: LayoutDashboard },
  { name: 'workbench', label: '合成工作台', icon: AudioLines },
  { name: 'voices', label: '音色库', icon: Library },
  { name: 'records', label: '请求记录', icon: History },
  { name: 'settings', label: '系统设置', icon: Settings },
]
</script>

<template>
  <div class="flex min-h-screen bg-page">
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
      aria-hidden="true"
      @click="mobileOpen = false"
    />

    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-[200px] shrink-0 -translate-x-full flex-col justify-between border-r border-line bg-surface transition-transform duration-150 lg:static lg:translate-x-0"
      aria-label="主导航"
      :class="{ 'translate-x-0': mobileOpen }"
    >
      <div>
        <div class="flex h-14 items-center justify-between border-b border-line px-4">
          <div class="flex items-center gap-2.5">
            <div
              class="flex h-7 w-7 items-center justify-center rounded-[7px] bg-brand font-mono text-sm font-semibold text-white"
              aria-hidden="true"
            >
              M
            </div>
            <div>
              <div class="text-sm font-medium leading-none text-txt-main">MOSS TTS</div>
              <div class="mt-1 whitespace-nowrap font-mono text-[11px] text-txt-muted">nano · console 1.0</div>
            </div>
          </div>
          <button
            class="p-1 text-txt-sec hover:text-txt-main lg:hidden"
            aria-label="关闭导航菜单"
            @click="mobileOpen = false"
          >
            <X :size="20" />
          </button>
        </div>

        <nav class="space-y-1 p-2.5">
          <RouterLink
            v-for="item in navItems"
            :key="item.name"
            :to="item.name === 'overview' ? '/' : `/${item.name}`"
            class="flex h-9 w-full items-center justify-between rounded-lg px-3 text-sm font-medium transition-colors focus-ring"
            :class="navClass(route.name === item.name)"
          >
            <span class="flex items-center gap-2.5">
              <component :is="item.icon" :size="18" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </span>
            <span
              v-if="item.name === 'voices'"
              class="rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-xs tabular-nums"
            >
              {{ voices.length }}
            </span>
            <span
              v-if="item.name === 'records'"
              class="rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-xs tabular-nums"
            >
              {{ recent.length }}
            </span>
          </RouterLink>
        </nav>
      </div>

      <div class="space-y-2 border-t border-line p-3">
        <div class="rounded-lg border border-line bg-subtle px-2 py-1.5 text-xs">
          <div class="flex items-center justify-between text-txt-muted">
            <span>AstrBot 接口</span>
            <span class="font-mono text-[11px] text-state-ok">兼容</span>
          </div>
          <div class="mt-0.5 truncate font-mono text-[11px] text-txt-sec">/v1/audio/speech</div>
        </div>
        <div class="flex items-center justify-between px-1 text-[11px] text-txt-muted">
          <span>{{ data?.model || 'moss-tts-nano' }}</span>
          <span class="font-mono tabular-nums">{{ lastSync }}</span>
        </div>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4 sm:px-6"
      >
        <div class="flex items-center gap-3">
          <button
            class="-ml-1.5 rounded-lg p-1.5 text-txt-sec hover:bg-subtle hover:text-txt-main focus-ring lg:hidden"
            aria-label="打开导航菜单"
            @click="mobileOpen = true"
          >
            <Menu :size="20" />
          </button>
          <h1 class="text-[20px] font-medium leading-none text-txt-main">{{ title }}</h1>
        </div>

        <div class="flex items-center gap-2.5 sm:gap-3">
          <StatusPill :status="serviceStatus" />

          <button
            class="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs text-txt-sec transition-colors hover:bg-subtle hover:text-txt-main focus-ring"
            title="立即刷新服务状态"
            aria-label="立即刷新服务状态"
            @click="refetch()"
          >
            <RefreshCw :size="15" :class="{ 'animate-spin': isFetching }" aria-hidden="true" />
            <span class="hidden tabular-nums sm:inline">
              {{ data ? `运行 ${formatUptime(data.uptime_seconds)}` : '刷新状态' }}
            </span>
          </button>

          <span
            class="hidden items-center gap-1 rounded-md border border-line bg-subtle px-2 py-1 text-xs text-txt-muted md:inline-flex"
            title="深色主题规划于后续版本"
          >
            <Sun :size="14" aria-hidden="true" />
            浅色
          </span>

          <button
            class="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-txt-sec transition-colors hover:border-red-200 hover:bg-red-50 hover:text-state-err focus-ring"
            @click="logout"
          >
            <LogOut :size="15" aria-hidden="true" />
            <span class="hidden sm:inline">退出登录</span>
          </button>
        </div>
      </header>

      <div class="mx-auto w-full max-w-[1440px] px-4 pt-4 sm:px-6">
        <div
          v-if="serviceStatus === 'loading' && !data"
          class="rounded-lg border border-amber-200 bg-state-warnBg px-3.5 py-2.5 text-xs text-state-warn"
          role="status"
        >
          正在加载模型与服务状态，首次冷启动可能需要 20–40 秒。
        </div>
        <div
          v-else-if="serviceStatus === 'error'"
          class="rounded-lg border border-red-200 bg-state-errBg px-3.5 py-2.5 text-xs text-state-err"
          role="alert"
        >
          <span class="font-medium">模型加载失败：</span>
          <span>{{ data?.error || '请查看服务日志' }}</span>
        </div>
        <div
          v-else-if="serviceStatus === 'offline'"
          class="rounded-lg border border-red-200 bg-state-errBg px-3.5 py-2.5 text-xs text-state-err"
          role="alert"
        >
          <span class="font-medium">控制台连接失败：</span>
          <span>{{ errorMessage }}</span>
        </div>
        <div
          v-else-if="error && data"
          class="rounded-lg border border-amber-200 bg-state-warnBg px-3.5 py-2.5 text-xs text-state-warn"
          role="status"
        >
          状态刷新失败，当前显示上次成功数据。{{ errorMessage }}
        </div>
      </div>

      <main class="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 120ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
