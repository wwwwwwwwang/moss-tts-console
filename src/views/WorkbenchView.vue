<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  AlertTriangle,
  AudioLines,
  CheckCircle2,
  Eraser,
  Info,
  Loader2,
  Sparkles,
  UploadCloud,
  Volume2,
} from 'lucide-vue-next'
import { useAppContext } from '../composables/appContext'
import { performSynthesis, releaseAudio, synthesisBusy } from '../audio/synthesis'
import { setStudioResult, studio, synthesizeStudio } from '../stores/studio'
import AudioResult from '../components/AudioResult.vue'
import AudioPlayer from '../components/AudioPlayer.vue'
import UploadDrawer from '../components/UploadDrawer.vue'
import type { AudioResult as AudioResultData } from '../types'
import { formatBytes } from '../utils/format'
import { MAX_INPUT_CHARS, validateSynthesisText } from '../utils/validation'

const { statsQuery } = useAppContext()
const { data, refetch } = statsQuery
const message = useMessage()

const voices = computed(() => data.value?.voices || [])
const inputError = ref('')
const fallbackNotice = ref(false)
const uploadOpen = ref(false)
const auditioning = ref(false)
const auditionResult = ref<AudioResultData | null>(null)
const auditionError = ref('')

const overLimit = computed(() => studio.text.length > MAX_INPUT_CHARS)
const canSynthesize = computed(
  () =>
    Boolean(studio.voice) &&
    Boolean(studio.text.trim()) &&
    !overLimit.value &&
    !studio.isSynthesizing &&
    !synthesisBusy.value,
)

watch(
  voices,
  (list) => {
    if (!list.length) {
      studio.voice = ''
      return
    }
    if (studio.voice && !list.includes(studio.voice)) {
      fallbackNotice.value = true
      studio.voice = list[0]
      return
    }
    if (!studio.voice) studio.voice = list[0]
    else fallbackNotice.value = false
  },
  { immediate: true },
)

watch(
  () => studio.text,
  () => {
    inputError.value = ''
  },
)

function clearText(): void {
  studio.text = ''
}

function sample(kind: 'narrator' | 'astrbot' | 'overlimit'): void {
  if (kind === 'narrator') {
    studio.text =
      '清晨的阳光穿过薄雾，洒在安静的湖面上。远处传来鸟鸣，空气里带着青草与露水的气息。'
  } else if (kind === 'astrbot') {
    studio.text = 'AstrBot 消息播报：今日服务运行正常，没有发现异常告警。'
  } else {
    const unit = '这是一段用于检验八百字最大输入边界提示与防静默截断机制的测试文本。'
    studio.text = unit.repeat(31).slice(0, MAX_INPUT_CHARS + 5)
  }
}

async function generate(): Promise<void> {
  const validation = validateSynthesisText(studio.text)
  inputError.value = validation
  if (validation || !canSynthesize.value) return
  await synthesizeStudio()
}

async function audition(): Promise<void> {
  if (!studio.voice || auditioning.value || synthesisBusy.value) return
  auditionError.value = ''
  auditioning.value = true
  try {
    const result = await performSynthesis('你好，这是当前音色的试听。', studio.voice)
    releaseAudio(auditionResult.value)
    auditionResult.value = result
  } catch (error) {
    auditionError.value = error instanceof Error ? error.message : '试听失败'
  } finally {
    auditioning.value = false
  }
}

function replay(): void {
  void generate()
}

async function onUploaded(voice: string): Promise<void> {
  uploadOpen.value = false
  await refetch()
  studio.voice = voice
  fallbackNotice.value = false
  message.success(`音色 ${voice} 已上传`)
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    if (document.activeElement?.tagName === 'TEXTAREA') {
      event.preventDefault()
      void generate()
    }
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  releaseAudio(auditionResult.value)
})
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
      <section class="card-base space-y-3 p-4 sm:p-5 lg:col-span-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-[16px] font-medium text-txt-main">合成文本输入</h2>
            <p class="mt-0.5 text-xs text-txt-sec">支持多行换行与中英混合，单次上限 800 字符</p>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-xs text-txt-muted">预设示例</span>
            <button
              type="button"
              class="rounded border border-line bg-subtle px-2 py-1 text-xs transition-colors hover:bg-brand-light hover:text-brand"
              @click="sample('narrator')"
            >
              纪录片旁白
            </button>
            <button
              type="button"
              class="rounded border border-line bg-subtle px-2 py-1 text-xs transition-colors hover:bg-brand-light hover:text-brand"
              @click="sample('astrbot')"
            >
              AstrBot 播报
            </button>
            <button
              type="button"
              class="rounded border border-line bg-subtle px-2 py-1 text-xs transition-colors hover:bg-red-50 hover:text-state-err"
              @click="sample('overlimit')"
            >
              805 字测试
            </button>
          </div>
        </div>

        <div>
          <label for="studio-text" class="sr-only">合成工作台文本输入</label>
          <textarea
            id="studio-text"
            v-model="studio.text"
            rows="8"
            placeholder="请输入需要转换为语音的文本内容..."
            class="w-full resize-y rounded-lg border border-line bg-subtle p-3.5 text-sm leading-relaxed text-txt-main input-focus"
            :class="{ 'border-state-err': overLimit }"
            :aria-invalid="overLimit"
            aria-describedby="studio-limit-alert studio-char-counter"
          />
        </div>

        <div
          v-if="overLimit || inputError"
          id="studio-limit-alert"
          class="flex items-start gap-2 rounded-lg border border-red-200 bg-state-errBg p-3 text-xs text-state-err"
          role="alert"
        >
          <AlertTriangle :size="16" class="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <span class="font-medium">文本无法提交：</span>
            {{ inputError || `当前已输入 ${studio.text.length} 字，超过最大 ${MAX_INPUT_CHARS} 字限制，请精简文本后再提交。` }}
          </span>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 font-medium text-txt-sec transition-colors hover:bg-subtle hover:text-txt-main"
            @click="clearText"
          >
            <Eraser :size="14" aria-hidden="true" />
            清空文本
          </button>
          <div class="flex items-center gap-3 tabular-nums">
            <span class="text-txt-muted">
              快捷键 <kbd class="rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-[11px]">Ctrl + Enter</kbd>
            </span>
            <span id="studio-char-counter" class="font-mono font-medium" :class="overLimit ? 'text-state-err' : 'text-txt-sec'">
              {{ studio.text.length }} / {{ MAX_INPUT_CHARS }}
            </span>
          </div>
        </div>
      </section>

      <aside class="card-base space-y-4 p-4 sm:p-5">
        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label for="studio-voice" class="text-[15px] font-medium text-txt-main">音色选择</label>
            <button class="text-xs font-medium text-brand hover:underline" @click="uploadOpen = true">+ 上传新音色</button>
          </div>
          <select
            id="studio-voice"
            v-model="studio.voice"
            class="field input-focus font-mono"
            :disabled="!voices.length"
          >
            <option v-if="!voices.length" value="">暂无可用音色</option>
            <option v-for="voice in voices" :key="voice" :value="voice">{{ voice }}</option>
          </select>
          <div
            v-if="fallbackNotice"
            class="mt-2 rounded-lg border border-amber-200 bg-state-warnBg p-2.5 text-xs text-state-warn"
            role="status"
          >
            原选中音色已不可用，已自动切换至首个可用音色。
          </div>
          <p v-if="!voices.length" class="mt-2 text-xs text-state-warn">
            尚未上传参考音色，
            <RouterLink to="/voices" class="font-medium text-brand hover:underline">前往音色库</RouterLink>
            添加后可开始合成。
          </p>
        </div>

        <div class="space-y-2 rounded-lg border border-line bg-subtle p-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-txt-main">音色快速试听</span>
            <span class="font-mono text-[11px] text-txt-muted">POST /v1/audio/speech</span>
          </div>
          <p class="text-xs text-txt-sec">使用固定短句合成，确认当前音色的人声质感。</p>
          <button
            type="button"
            class="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface text-xs font-medium text-txt-main transition-colors hover:border-brand/40 hover:bg-brand-light hover:text-brand focus-ring disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!studio.voice || auditioning || synthesisBusy"
            @click="audition"
          >
            <Loader2 v-if="auditioning" :size="14" class="animate-spin" aria-hidden="true" />
            <Volume2 v-else :size="14" aria-hidden="true" />
            {{ auditioning ? '正在生成试听...' : '试听当前音色' }}
          </button>
          <p v-if="auditionError" class="text-xs text-state-err" role="alert">{{ auditionError }}</p>
          <AudioPlayer v-if="auditionResult" :result="auditionResult" />
        </div>

        <div class="space-y-1 rounded-lg border border-line bg-subtle p-3 text-xs text-txt-sec">
          <div class="flex items-center justify-between font-medium text-txt-main">
            <span>输出规格</span>
            <span class="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px]">audio/wav</span>
          </div>
          <p class="leading-relaxed">
            当前后端使用 <code class="font-mono">moss-tts-nano</code> 默认推理管线，不展示未实现的伪调速或采样率参数。
          </p>
        </div>

        <button type="button" class="btn-primary w-full" :disabled="!canSynthesize" @click="generate">
          <Loader2 v-if="studio.isSynthesizing" :size="16" class="animate-spin" aria-hidden="true" />
          <AudioLines v-else :size="16" aria-hidden="true" />
          {{ studio.isSynthesizing ? '正在合成语音...' : '生成语音' }}
        </button>
      </aside>
    </div>

    <section class="card-base p-4 sm:p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-[16px] font-medium text-txt-main">合成结果与播放器</h2>
          <p class="mt-0.5 text-xs text-txt-sec">
            生成后由你决定是否播放；替换结果或退出登录时自动释放音频缓存。
          </p>
        </div>
        <span
          v-if="studio.result"
          class="inline-flex items-center gap-1 rounded border border-line bg-subtle px-2 py-0.5 text-xs text-txt-sec"
        >
          <CheckCircle2 :size="13" class="text-state-ok" aria-hidden="true" />
          已生成
        </span>
      </div>

      <div v-if="studio.error" class="rounded-lg border border-red-200 bg-state-errBg p-3 text-xs text-state-err" role="alert">
        <span class="font-medium">合成失败：</span>
        {{ studio.error }}
      </div>
      <AudioResult v-else-if="studio.result" :result="studio.result" @replay="replay" />
      <div
        v-else
        class="flex flex-col items-center justify-center rounded-lg border border-dashed border-line py-10 text-center"
      >
        <Sparkles :size="24" class="text-txt-muted" aria-hidden="true" />
        <p class="mt-2 text-xs text-txt-sec">输入文本并生成后，播放器会显示在这里</p>
        <p class="mt-1 text-[11px] text-txt-muted">
          当前音色：{{ studio.voice || '未选择' }}
        </p>
      </div>
    </section>

    <div class="flex items-center gap-1.5 text-xs text-txt-muted">
      <Info :size="14" aria-hidden="true" />
      <span>合成任务受模型单实例锁限制，请勿重复提交；生成结果不会自动播放。</span>
    </div>

    <UploadDrawer :visible="uploadOpen" @close="uploadOpen = false" @success="onUploaded" />
  </div>
</template>
