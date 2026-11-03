<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  AudioLines,
  Copy,
  Loader2,
  Search,
  Trash2,
  UploadCloud,
  Volume2,
  X,
} from 'lucide-vue-next'
import { useAppContext } from '../composables/appContext'
import { deleteVoice, ApiError } from '../api/client'
import { performSynthesis, releaseAudio, synthesisBusy } from '../audio/synthesis'
import { studio } from '../stores/studio'
import AudioResult from '../components/AudioResult.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import UploadDrawer from '../components/UploadDrawer.vue'
import type { AudioResult as AudioResultData } from '../types'

const { statsQuery } = useAppContext()
const { data, refetch } = statsQuery
const message = useMessage()
const router = useRouter()

const search = ref('')
const uploadOpen = ref(false)
const deleteTarget = ref('')
const deleting = ref(false)
const previewingVoice = ref('')
const previewResult = ref<AudioResultData | null>(null)
const previewError = ref('')

const voices = computed(() => data.value?.voices || [])
const filteredVoices = computed(() => {
  const query = search.value.trim().toLowerCase()
  return query ? voices.value.filter((voice) => voice.toLowerCase().includes(query)) : voices.value
})

async function chooseForStudio(voice: string): Promise<void> {
  studio.voice = voice
  await router.push('/workbench')
}

async function copyVoice(voice: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(voice)
    message.success(`已复制 ${voice}`)
  } catch {
    message.error('复制失败，请手动选择音色名')
  }
}

async function preview(voice: string): Promise<void> {
  if (previewingVoice.value || synthesisBusy.value) return
  previewError.value = ''
  previewingVoice.value = voice
  try {
    const result = await performSynthesis('你好，这是音色试听。', voice)
    releaseAudio(previewResult.value)
    previewResult.value = result
  } catch (error) {
    previewError.value = error instanceof Error ? error.message : '试听失败'
  } finally {
    previewingVoice.value = ''
  }
}

function clearPreview(): void {
  releaseAudio(previewResult.value)
  previewResult.value = null
  previewError.value = ''
}

function askDelete(voice: string): void {
  deleteTarget.value = voice
}

async function confirmDelete(): Promise<void> {
  const target = deleteTarget.value
  if (!target) return
  deleting.value = true
  try {
    await deleteVoice(target)
    if (previewResult.value?.voice === target) clearPreview()
    if (studio.voice === target) {
      studio.voice = ''
      if (studio.result?.voice === target) {
        releaseAudio(studio.result)
        studio.result = null
      }
    }
    deleteTarget.value = ''
    await refetch()
    message.success(`音色 ${target} 已删除`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      message.error('登录状态已失效，请重新登录')
    } else {
      message.error(error instanceof Error ? error.message : '删除失败')
    }
  } finally {
    deleting.value = false
  }
}

async function onUploaded(voice: string): Promise<void> {
  uploadOpen.value = false
  await refetch()
  studio.voice = voice
  message.success(`音色 ${voice} 已上传`)
}

onBeforeUnmount(clearPreview)
</script>

<template>
  <div class="space-y-4">
    <section class="card-base flex flex-col items-stretch justify-between gap-3 p-4 sm:flex-row sm:items-center">
      <div class="flex flex-1 items-center gap-3">
        <div class="relative max-w-xs flex-1">
          <Search
            :size="16"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted"
            aria-hidden="true"
          />
          <input
            v-model="search"
            type="search"
            placeholder="按音色名称搜索..."
            aria-label="按音色名称搜索"
            class="field input-focus pl-9 font-mono text-[13px]"
          />
        </div>
        <span class="shrink-0 text-xs tabular-nums text-txt-sec">
          共 {{ filteredVoices.length }} / {{ voices.length }} 个
        </span>
      </div>
      <button type="button" class="btn-primary shrink-0" @click="uploadOpen = true">
        <UploadCloud :size="16" aria-hidden="true" />
        上传参考音色
      </button>
    </section>

    <div
      class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-subtle px-3.5 py-2.5 text-xs text-txt-sec"
    >
      <span>
        当前「试听」会调用 <code class="font-mono text-txt-main">POST /v1/audio/speech</code>
        合成测试短句，并非直接播放参考原音。
      </span>
      <span class="text-txt-muted">原始音频播放与时长元数据留待后续版本</span>
    </div>

    <AudioResult
      v-if="previewResult"
      :result="previewResult"
      replay-label="重新试听"
      @replay="preview(previewingVoice || previewResult?.voice || '')"
    >
    </AudioResult>
    <div v-if="previewResult" class="-mt-2 flex justify-end">
      <button class="inline-flex items-center gap-1 text-xs text-txt-sec hover:text-txt-main" @click="clearPreview">
        <X :size="13" aria-hidden="true" />
        关闭试听结果
      </button>
    </div>
    <div
      v-if="previewError"
      class="rounded-lg border border-red-200 bg-state-errBg px-3.5 py-2.5 text-xs text-state-err"
      role="alert"
    >
      {{ previewError }}
    </div>

    <div v-if="!voices.length" class="card-base flex flex-col items-center justify-center px-6 py-14 text-center">
      <Volume2 :size="28" class="text-txt-muted" aria-hidden="true" />
      <h2 class="mt-3 text-base font-medium text-txt-main">音色库为空</h2>
      <p class="mt-1 max-w-md text-xs leading-relaxed text-txt-sec">
        上传 8–15 秒、单人、无背景音的参考音频即可创建音色。上传后可直接合成试听。
      </p>
      <button class="btn-primary mt-4" @click="uploadOpen = true">
        <UploadCloud :size="16" aria-hidden="true" />
        上传第一个音色
      </button>
    </div>

    <div
      v-else-if="!filteredVoices.length"
      class="card-base px-6 py-10 text-center text-xs text-txt-sec"
    >
      没有匹配“{{ search }}”的音色。
    </div>

    <div v-else class="grid grid-cols-1 gap-3.5 md:grid-cols-2">
      <article
        v-for="voice in filteredVoices"
        :key="voice"
        class="card-base flex flex-col justify-between gap-4 p-4"
      >
        <div>
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="truncate font-mono text-sm font-medium text-txt-main">{{ voice }}</span>
                <span
                  v-if="studio.voice === voice"
                  class="shrink-0 rounded bg-brand-light px-1.5 py-0.5 text-[11px] text-brand"
                >
                  当前音色
                </span>
              </div>
              <p class="mt-1 text-xs text-txt-sec">参考音频 · 合成试听可用</p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded p-1.5 text-txt-muted hover:bg-subtle hover:text-txt-main focus-ring"
              title="复制音色 ID"
              aria-label="复制音色 ID"
              @click="copyVoice(voice)"
            >
              <Copy :size="15" />
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-medium text-txt-main transition-colors hover:border-brand/40 hover:bg-brand-light hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="Boolean(previewingVoice) || synthesisBusy"
              @click="preview(voice)"
            >
              <Loader2 v-if="previewingVoice === voice" :size="14" class="animate-spin" aria-hidden="true" />
              <AudioLines v-else :size="14" aria-hidden="true" />
              {{ previewingVoice === voice ? '生成中' : '合成试听' }}
            </button>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-medium text-txt-main transition-colors hover:bg-subtle"
              @click="chooseForStudio(voice)"
            >
              使用
            </button>
          </div>
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-state-err transition-colors hover:bg-state-errBg focus-ring"
            @click="askDelete(voice)"
          >
            <Trash2 :size="14" aria-hidden="true" />
            删除
          </button>
        </div>
      </article>
    </div>

    <UploadDrawer :visible="uploadOpen" @close="uploadOpen = false" @success="onUploaded" />
    <ConfirmDialog
      :visible="Boolean(deleteTarget)"
      title="确认删除音色"
      :message="`确定永久删除音色 ${deleteTarget} 吗？如果它正在被使用，系统会停止试听并切换至剩余首个音色。`"
      :loading="deleting"
      @cancel="deleteTarget = ''"
      @confirm="confirmDelete"
    />
  </div>
</template>
