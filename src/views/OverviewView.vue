<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  AlertCircle,
  ArrowRight,
  AudioLines,
  CheckCircle2,
  Database,
  Info,
  Loader2,
  Plus,
  UploadCloud,
  Volume2,
} from 'lucide-vue-next'
import { useAppContext } from '../composables/appContext'
import { performSynthesis, releaseAudio, synthesisBusy } from '../audio/synthesis'
import { setStudioResult, studio } from '../stores/studio'
import AudioResult from '../components/AudioResult.vue'
import UploadDrawer from '../components/UploadDrawer.vue'
import type { AudioResult as AudioResultData } from '../types'
import { cacheRate, formatBytes, formatClock, formatUptime } from '../utils/format'
import { MAX_INPUT_CHARS, validateSynthesisText } from '../utils/validation'

const { statsQuery } = useAppContext()
const { data, isPending, isError, refetch } = statsQuery
const router = useRouter()
const message = useMessage()

const quickText = ref('你好，欢迎使用 MOSS TTS 个人语音控制台。当前服务运行平稳，支持零样本参考音色克隆。')
const quickVoice = ref('')
const quickResult = ref<AudioResultData | null>(null)
const quickError = ref('')
const quickLoading = ref(false)
const uploadOpen = ref(false)

const voices = computed(() => data.value?.voices || [])
const recent = computed(() => data.value?.recent || [])
const charError = computed(() => {
  if (quickText.value.length > MAX_INPUT_CHARS) {
    return `已超过 ${MAX_INPUT_CHARS} 字上限，请删减后再生成`
  }
  return ''
})
const canQuickSynthesize = computed(
  () =>
    Boolean(quickVoice.value) &&
    Boolean(quickText.value.trim()) &&
    !charError.value &&
    !quickLoading.value &&
    !synthesisBusy.value,
)
const hitRate = computed(() =>
  cacheRate(data.value?.stats.cache_hits || 0, data.value?.stats.requests || 0),
)
const realtimeCount = computed(() => {
  if (!data.value) return 0
  return Math.max(0, data.value.stats.requests - data.value.stats.cache_hits)
})

watch(
  voices,
  (list) => {
    if (!list.length) {
      quickVoice.value = ''
      return
    }
    if (!list.includes(quickVoice.value)) {
      quickVoice.value = list[0]
    }
    if (!list.includes(studio.voice)) studio.voice = list[0]
  },
  { immediate: true },
)

async function synthesizeQuick(): Promise<void> {
  const validation = validateSynthesisText(quickText.value)
  quickError.value = validation
  if (validation || !quickVoice.value) return
  quickLoading.value = true
  try {
    const result = await performSynthesis(quickText.value.trim(), quickVoice.value)
    if (quickResult.value) releaseAudio(quickResult.value)
    quickResult.value = result
    setStudioResult(result)
    setTimeout(() => refetch(), 250)
  } catch (error) {
    quickError.value = error instanceof Error ? error.message : '合成失败'
  } finally {
    quickLoading.value = false
  }
}

function selectVoice(name: string): void {
  quickVoice.value = name
  studio.voice = name
}

function useForStudio(): void {
  studio.text = quickText.value
  studio.voice = quickVoice.value
  router.push('/workbench')
}

function clearText(): void {
  quickText.value = ''
}

async function onUploaded(voice: string): Promise<void> {
  uploadOpen.value = false
  await refetch()
  quickVoice.value = voice
  studio.voice = voice
  message.success(`音色 ${voice} 已上传`)
}

onBeforeUnmount(() => {
  releaseAudio(quickResult.value)
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-txt-sec">
      <div class="flex items-center gap-1.5">
        <Info :size="15" class="text-txt-muted" aria-hidden="true" />
        <span>统计为服务进程启动以来的累计值，重启后归零，并非今日数据。</span>
      </div>
      <span v-if="data" class="font-mono tabular-nums text-txt-muted">
        已运行 {{ formatUptime(data.uptime_seconds) }}
      </span>
    </div>

    <div v-if="isPending" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="index in 4" :key="index" class="card-base h-[118px] animate-pulse p-4">
        <div class="h-3 w-20 rounded bg-line" />
        <div class="mt-4 h-6 w-28 rounded bg-line" />
        <div class="mt-3 h-3 w-32 rounded bg-line" />
      </div>
    </div>

    <div
      v-else-if="isError && !data"
      class="card-base flex flex-col items-center justify-center px-6 py-12 text-center"
    >
      <AlertCircle :size="28" class="text-state-err" aria-hidden="true" />
      <h2 class="mt-3 text-base font-medium text-txt-main">无法读取服务状态</h2>
      <p class="mt-1 text-xs text-txt-sec">请检查服务是否启动，或确认 API Token 是否正确。</p>
      <button class="btn-secondary mt-4" @click="refetch()">重新连接</button>
    </div>

    <template v-else-if="data">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <div class="card-base flex flex-col justify-between p-4 sm:p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-txt-sec">模型状态</span>
            <span
              class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
              :class="
                data.status === 'ok'
                  ? 'bg-state-okBg text-state-ok'
                  : data.status === 'loading'
                    ? 'bg-state-warnBg text-state-warn'
                    : 'bg-state-errBg text-state-err'
              "
            >
              <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {{ data.status === 'ok' ? '运行正常' : data.status === 'loading' ? '加载中' : '加载失败' }}
            </span>
          </div>
          <div class="mt-3">
            <div class="truncate font-mono text-lg font-semibold text-txt-main">{{ data.model }}</div>
            <div class="mt-1 flex items-center justify-between text-xs tabular-nums text-txt-sec">
              <span>加载耗时</span>
              <span class="font-mono font-medium text-txt-main">
                {{ data.load_seconds != null ? `${data.load_seconds.toFixed(2)}s` : '—' }}
              </span>
            </div>
          </div>
        </div>

        <div class="card-base flex flex-col justify-between p-4 sm:p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-txt-sec">累计请求数</span>
            <span class="font-mono text-xs text-txt-muted">进程累计</span>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-semibold tabular-nums text-txt-main">{{ data.stats.requests }}</div>
            <div class="mt-1 flex items-center justify-between text-xs tabular-nums text-txt-sec">
              <span>异常请求</span>
              <span class="font-mono font-medium text-txt-main">{{ data.stats.errors }} 次</span>
            </div>
          </div>
        </div>

        <div class="card-base flex flex-col justify-between p-4 sm:p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-txt-sec">音频缓存命中</span>
            <span class="rounded bg-brand-light px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-brand">
              {{ hitRate }}%
            </span>
          </div>
          <div class="mt-3">
            <div class="flex items-baseline gap-1.5 tabular-nums">
              <span class="text-2xl font-semibold text-txt-main">{{ data.stats.cache_hits }}</span>
              <span class="text-xs text-txt-sec">次命中</span>
            </div>
            <div class="mt-1 flex items-center justify-between text-xs tabular-nums text-txt-sec">
              <span>实时模型推理</span>
              <span class="font-mono font-medium text-txt-main">{{ realtimeCount }} 次</span>
            </div>
          </div>
        </div>

        <div class="card-base flex flex-col justify-between p-4 sm:p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-txt-sec">可用参考音色</span>
            <RouterLink to="/voices" class="text-xs font-medium text-brand hover:underline">管理音色 →</RouterLink>
          </div>
          <div class="mt-3">
            <div class="flex items-baseline gap-1.5 tabular-nums">
              <span class="text-2xl font-semibold text-txt-main">{{ voices.length }}</span>
              <span class="text-xs text-txt-sec">个音色就绪</span>
            </div>
            <div class="mt-1 truncate font-mono text-xs text-txt-sec">
              {{ voices.length ? voices.slice(0, 3).join(', ') : '尚未上传音色' }}
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section class="card-base flex flex-col justify-between p-4 sm:p-5 lg:col-span-2">
          <div>
            <div class="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 class="text-[16px] font-medium text-txt-main">快速合成测试</h2>
                <p class="mt-0.5 text-xs text-txt-sec">选择音色并输入短文本，验证当前模型输出效果</p>
              </div>
              <RouterLink to="/workbench" class="shrink-0 text-xs font-medium text-brand hover:underline">
                完整工作台 →
              </RouterLink>
            </div>

            <label for="quick-text" class="sr-only">快速合成文本</label>
            <textarea
              id="quick-text"
              v-model="quickText"
              rows="3"
              placeholder="输入要合成的内容（最多 800 字符）..."
              class="w-full resize-y rounded-lg border border-line bg-subtle p-3 text-sm leading-relaxed text-txt-main input-focus"
              :aria-invalid="Boolean(charError)"
            />
            <div class="mt-1.5 flex items-center justify-between gap-3 text-xs">
              <span v-if="charError" class="text-state-err" role="alert">{{ charError }}</span>
              <div class="ml-auto flex items-center gap-3 tabular-nums text-txt-muted">
                <button type="button" class="text-txt-sec hover:text-txt-main" @click="clearText">清空文本</button>
                <span :class="{ 'text-state-err': charError }">{{ quickText.length }} / {{ MAX_INPUT_CHARS }}</span>
              </div>
            </div>

            <div class="mt-3 flex flex-col items-stretch justify-between gap-3 border-t border-line pt-3 sm:flex-row sm:items-center">
              <div class="flex min-w-0 flex-1 items-center gap-2">
                <label for="quick-voice" class="shrink-0 text-xs font-medium text-txt-sec">参考音色</label>
                <select
                  id="quick-voice"
                  v-model="quickVoice"
                  class="field input-focus min-w-0 flex-1 font-mono text-[13px]"
                  :disabled="!voices.length"
                >
                  <option v-if="!voices.length" value="">暂无音色，请先上传</option>
                  <option v-for="voice in voices" :key="voice" :value="voice">{{ voice }}</option>
                </select>
              </div>
              <button
                type="button"
                class="btn-primary shrink-0 px-5"
                :disabled="!canQuickSynthesize"
                @click="synthesizeQuick"
              >
                <Loader2 v-if="quickLoading" :size="16" class="animate-spin" aria-hidden="true" />
                <AudioLines v-else :size="16" aria-hidden="true" />
                {{ quickLoading ? '正在合成...' : '立即合成' }}
              </button>
            </div>
          </div>

          <div class="mt-4 border-t border-line pt-3">
            <div
              v-if="quickError"
              class="rounded-lg border border-red-200 bg-state-errBg p-3 text-xs text-state-err"
              role="alert"
            >
              {{ quickError }}
            </div>
            <AudioResult
              v-else-if="quickResult"
              :result="quickResult"
              replay-label="重新合成"
              @replay="synthesizeQuick"
            />
            <div v-else class="flex items-center justify-between gap-3 text-xs text-txt-muted">
              <span>生成结果将在这里显示，不会自动播放</span>
              <button class="text-brand hover:underline" @click="useForStudio">去工作台编辑 →</button>
            </div>
          </div>
        </section>

        <section class="card-base flex flex-col justify-between p-4 sm:p-5">
          <div>
            <div class="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 class="text-[16px] font-medium text-txt-main">常用音色</h2>
                <p class="mt-0.5 text-xs text-txt-sec">点击带入快速合成</p>
              </div>
              <RouterLink to="/voices" class="shrink-0 text-xs font-medium text-brand hover:underline">管理</RouterLink>
            </div>

            <div v-if="!voices.length" class="rounded-lg border border-dashed border-line px-3 py-8 text-center">
              <Volume2 :size="22" class="mx-auto text-txt-muted" aria-hidden="true" />
              <p class="mt-2 text-xs text-txt-sec">还没有可用音色</p>
              <button class="mt-2 text-xs font-medium text-brand hover:underline" @click="uploadOpen = true">
                上传第一个音色
              </button>
            </div>

            <div v-else class="space-y-2">
              <button
                v-for="voice in voices.slice(0, 5)"
                :key="voice"
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus-ring"
                :class="
                  quickVoice === voice
                    ? 'border-brand/40 bg-brand-light text-brand'
                    : 'border-line bg-surface text-txt-main hover:bg-subtle'
                "
                @click="selectVoice(voice)"
              >
                <span class="truncate font-mono text-[13px]">{{ voice }}</span>
                <CheckCircle2 v-if="quickVoice === voice" :size="15" aria-label="当前选中" />
                <ArrowRight v-else :size="14" class="text-txt-muted" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-txt-sec">
            <span>需要添加新的参考人声？</span>
            <button class="inline-flex items-center gap-1 font-medium text-brand hover:underline" @click="uploadOpen = true">
              <Plus :size="14" aria-hidden="true" />
              上传音色
            </button>
          </div>
        </section>
      </div>

      <section class="card-base p-4 sm:p-5">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h2 class="text-[16px] font-medium text-txt-main">最近合成记录</h2>
            <p class="mt-0.5 text-xs text-txt-sec">最近 5 条请求的耗时与缓存状态</p>
          </div>
          <RouterLink to="/records" class="text-xs font-medium text-brand hover:underline">
            查看全部 ({{ recent.length }}) →
          </RouterLink>
        </div>

        <div v-if="!recent.length" class="rounded-lg border border-dashed border-line py-8 text-center text-xs text-txt-sec">
          <Database :size="22" class="mx-auto mb-2 text-txt-muted" aria-hidden="true" />
          当前进程暂无合成请求记录
        </div>

        <div v-else class="hidden overflow-x-auto md:block">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="border-b border-line text-xs font-medium text-txt-sec">
                <th class="py-2.5 pr-4">时间</th>
                <th class="px-4 py-2.5">文本摘要</th>
                <th class="px-4 py-2.5">音色</th>
                <th class="px-4 py-2.5 text-right">耗时</th>
                <th class="pl-4 py-2.5 text-right">状态</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line text-sm">
              <tr v-for="row in recent.slice(0, 5)" :key="`${row.ts}-${row.voice}`">
                <td class="whitespace-nowrap py-2.5 pr-4 font-mono text-xs text-txt-sec">{{ formatClock(row.ts) }}</td>
                <td class="max-w-[360px] truncate px-4 py-2.5 text-txt-main" :title="row.text">{{ row.text }}</td>
                <td class="px-4 py-2.5 font-mono text-xs text-txt-sec">{{ row.voice }}</td>
                <td class="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-txt-main">
                  {{ row.seconds.toFixed(2) }}s
                </td>
                <td class="py-2.5 pl-4 text-right">
                  <span
                    class="rounded px-1.5 py-0.5 text-xs"
                    :class="row.cached ? 'bg-state-infoBg text-state-info' : 'bg-state-okBg text-state-ok'"
                  >
                    {{ row.cached ? '缓存' : '推理' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="recent.length" class="space-y-2.5 md:hidden">
          <div v-for="row in recent.slice(0, 5)" :key="`${row.ts}-${row.voice}-m`" class="rounded-lg border border-line p-3">
            <div class="flex items-center justify-between gap-3 text-xs text-txt-sec">
              <span class="font-mono">{{ formatClock(row.ts) }}</span>
              <span class="font-mono" :class="row.cached ? 'text-state-info' : 'text-state-ok'">
                {{ row.cached ? '缓存' : `${row.seconds.toFixed(2)}s` }}
              </span>
            </div>
            <p class="mt-1.5 line-clamp-2 text-sm text-txt-main">{{ row.text }}</p>
            <div class="mt-1 font-mono text-[11px] text-txt-muted">
              {{ row.voice }} · {{ formatBytes(row.bytes) }}
            </div>
          </div>
        </div>
      </section>
    </template>

    <UploadDrawer :visible="uploadOpen" @close="uploadOpen = false" @success="onUploaded" />
  </div>
</template>
