<script setup lang="ts">
import { computed } from 'vue'
import { useMessage } from 'naive-ui'
import { AlertCircle, Database, Info, RefreshCw } from 'lucide-vue-next'
import { useAppContext } from '../composables/appContext'
import { formatBytes, formatDateTime } from '../utils/format'

const { statsQuery } = useAppContext()
const { data, isPending, isFetching, refetch, error } = statsQuery
const message = useMessage()

const records = computed(() => data.value?.recent || [])

async function refresh(): Promise<void> {
  await refetch()
  if (error.value) message.error('刷新失败，请检查服务连接')
  else message.success('请求记录已刷新')
}
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex items-start gap-2.5 rounded-[10px] border border-blue-200 bg-state-infoBg p-3.5 text-xs text-state-info"
      role="note"
    >
      <Info :size="16" class="mt-0.5 shrink-0" aria-hidden="true" />
      <div class="leading-relaxed">
        <span class="font-medium">内存记录说明：</span>
        数据来自 <code class="font-mono">/admin/stats</code> 的
        <code class="font-mono">recent</code> 字段，仅保留本次进程最近 30 条请求，服务重启后清空。文本摘要最多保留前
        120 字。
      </div>
    </div>

    <section class="card-base p-4 sm:p-5">
      <div class="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 class="text-[16px] font-medium text-txt-main">最近合成请求</h2>
          <p class="mt-0.5 text-xs tabular-nums text-txt-sec">
            当前进程已记录 {{ records.length }} / 30 条，按最新时间优先排序
          </p>
        </div>
        <button type="button" class="btn-secondary self-start text-xs sm:self-auto" :disabled="isFetching" @click="refresh">
          <RefreshCw :size="14" :class="{ 'animate-spin': isFetching }" aria-hidden="true" />
          立即同步记录
        </button>
      </div>

      <div v-if="isPending" class="space-y-2" aria-label="正在加载请求记录">
        <div v-for="index in 5" :key="index" class="h-11 animate-pulse rounded-lg bg-subtle" />
      </div>

      <div
        v-else-if="error && !data"
        class="flex flex-col items-center justify-center rounded-lg border border-dashed border-line py-10 text-center"
      >
        <AlertCircle :size="24" class="text-state-err" aria-hidden="true" />
        <p class="mt-2 text-xs text-txt-sec">无法读取请求记录</p>
        <button class="btn-secondary mt-3 h-8 text-xs" @click="refresh">重试</button>
      </div>

      <div
        v-else-if="!records.length"
        class="flex flex-col items-center justify-center rounded-lg border border-dashed border-line py-12 text-center"
      >
        <Database :size="26" class="text-txt-muted" aria-hidden="true" />
        <p class="mt-2 text-sm font-medium text-txt-main">暂无合成记录</p>
        <p class="mt-1 text-xs text-txt-sec">完成一次语音合成后，这里会显示耗时与缓存状态。</p>
      </div>

      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="border-b border-line text-xs font-medium text-txt-sec">
                <th class="whitespace-nowrap py-2.5 pr-4">时间</th>
                <th class="px-4 py-2.5">文本摘要</th>
                <th class="whitespace-nowrap px-4 py-2.5">音色</th>
                <th class="whitespace-nowrap px-4 py-2.5 text-right">字数</th>
                <th class="whitespace-nowrap px-4 py-2.5 text-right">耗时</th>
                <th class="whitespace-nowrap px-4 py-2.5 text-right">音频大小</th>
                <th class="whitespace-nowrap py-2.5 pl-4 text-right">缓存状态</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line text-sm">
              <tr v-for="(row, index) in records" :key="`${row.ts}-${index}`" class="hover:bg-subtle/60">
                <td class="whitespace-nowrap py-2.5 pr-4 font-mono text-xs tabular-nums text-txt-sec">
                  {{ formatDateTime(row.ts) }}
                </td>
                <td class="max-w-[360px] truncate px-4 py-2.5 text-txt-main" :title="row.text">
                  {{ row.text }}
                </td>
                <td class="px-4 py-2.5 font-mono text-xs text-txt-sec">{{ row.voice }}</td>
                <td class="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-txt-sec">{{ row.chars }}</td>
                <td class="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-txt-main">
                  {{ row.seconds.toFixed(2) }}s
                </td>
                <td class="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-txt-sec">
                  {{ formatBytes(row.bytes) }}
                </td>
                <td class="py-2.5 pl-4 text-right">
                  <span
                    class="rounded px-1.5 py-0.5 text-xs"
                    :class="row.cached ? 'bg-state-infoBg text-state-info' : 'bg-state-okBg text-state-ok'"
                  >
                    {{ row.cached ? '缓存命中' : '实时推理' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="space-y-2.5 md:hidden">
          <article v-for="(row, index) in records" :key="`${row.ts}-${index}-m`" class="rounded-lg border border-line p-3">
            <div class="flex items-center justify-between gap-3 text-xs">
              <span class="font-mono tabular-nums text-txt-sec">{{ formatDateTime(row.ts) }}</span>
              <span
                class="rounded px-1.5 py-0.5"
                :class="row.cached ? 'bg-state-infoBg text-state-info' : 'bg-state-okBg text-state-ok'"
              >
                {{ row.cached ? '缓存命中' : '实时推理' }}
              </span>
            </div>
            <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-txt-main">{{ row.text }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-txt-muted">
              <span>{{ row.voice }}</span>
              <span>{{ row.chars }} 字</span>
              <span>{{ row.seconds.toFixed(2) }}s</span>
              <span>{{ formatBytes(row.bytes) }}</span>
            </div>
          </article>
        </div>
      </template>
    </section>
  </div>
</template>
