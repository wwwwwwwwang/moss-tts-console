<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { AlertTriangle, CheckCircle2, FileAudio, Loader2, UploadCloud, X } from 'lucide-vue-next'
import { uploadVoice, ApiError } from '../api/client'
import { validateAudioFile, validateVoiceName } from '../utils/validation'
import { formatBytes } from '../utils/format'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  close: []
  success: [voice: string]
}>()

const name = ref('')
const file = ref<File | null>(null)
const nameError = ref('')
const fileError = ref('')
const backendError = ref('')
const uploadProgress = ref(0)
const uploading = ref(false)
const dragging = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const success = computed(() => uploadProgress.value >= 100 && !uploading.value && !backendError.value)

watch(
  () => props.visible,
  async (open) => {
    if (open) {
      reset()
      await nextTick()
      nameInput.value?.focus()
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
)

function reset(): void {
  name.value = ''
  file.value = null
  nameError.value = ''
  fileError.value = ''
  backendError.value = ''
  uploadProgress.value = 0
  uploading.value = false
}

function close(): void {
  if (uploading.value) return
  emit('close')
}

function validateName(): void {
  const error = validateVoiceName(name.value)
  nameError.value = name.value ? error : ''
}

function setFile(nextFile: File | null): void {
  file.value = nextFile
  fileError.value = validateAudioFile(nextFile)
  backendError.value = ''
}

function onFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  setFile(target.files?.[0] || null)
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  setFile(event.dataTransfer?.files?.[0] || null)
}

async function submit(): Promise<void> {
  nameError.value = validateVoiceName(name.value)
  fileError.value = validateAudioFile(file.value)
  backendError.value = ''
  if (nameError.value || fileError.value || !file.value) return

  uploading.value = true
  uploadProgress.value = 0
  try {
    const result = await uploadVoice(name.value.trim(), file.value, (value) => {
      uploadProgress.value = value
    })
    uploadProgress.value = 100
    emit('success', result.voice)
  } catch (error) {
    backendError.value = error instanceof Error ? error.message : '上传失败'
    if (error instanceof ApiError && error.status === 401) {
      backendError.value = '登录状态已失效，请重新登录后上传'
    }
  } finally {
    uploading.value = false
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.visible) close()
}

window.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex justify-end">
      <div class="absolute inset-0 bg-slate-900/40" aria-hidden="true" @click="close" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
        class="relative flex h-full w-full flex-col overflow-y-auto border-l border-line bg-surface shadow-xl sm:max-w-[440px]"
      >
        <header class="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
          <div>
            <h2 id="upload-title" class="text-[16px] font-medium text-txt-main">上传参考音色</h2>
            <p class="mt-0.5 text-[11px] text-txt-muted">推荐 8–15 秒干净人声</p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-txt-sec hover:bg-subtle hover:text-txt-main focus-ring"
            aria-label="关闭上传抽屉"
            :disabled="uploading"
            @click="close"
          >
            <X :size="20" />
          </button>
        </header>

        <form class="flex flex-1 flex-col justify-between p-5" novalidate @submit.prevent="submit">
          <div class="space-y-4">
            <div>
              <div class="mb-1.5 flex items-center justify-between">
                <label for="voice-name" class="text-sm font-medium text-txt-main">
                  音色名称 <span class="text-state-err">*</span>
                </label>
                <span class="font-mono text-xs tabular-nums text-txt-muted">{{ name.length }} / 32</span>
              </div>
              <input
                id="voice-name"
                ref="nameInput"
                v-model="name"
                type="text"
                maxlength="32"
                placeholder="例如: narrator_calm_01"
                class="field input-focus font-mono"
                :class="{ 'border-state-err': nameError }"
                :aria-invalid="Boolean(nameError)"
                aria-describedby="voice-name-help voice-name-error"
                @blur="validateName"
                @input="nameError = ''"
              />
              <p id="voice-name-help" class="mt-1.5 text-xs text-txt-sec">
                仅允许字母、数字、下划线 <code class="font-mono">_</code> 和连字符
                <code class="font-mono">-</code>，长度 1–32。
              </p>
              <p v-if="nameError" id="voice-name-error" class="mt-1 text-xs text-state-err" role="alert">
                {{ nameError }}
              </p>
            </div>

            <div>
              <span class="mb-1.5 block text-sm font-medium text-txt-main">
                参考音频文件 <span class="text-state-err">*</span>
              </span>
              <button
                type="button"
                class="w-full rounded-[10px] border border-dashed bg-subtle p-5 text-center transition-colors focus-ring"
                :class="dragging ? 'border-brand bg-brand-light' : 'border-slate-300 hover:border-brand'"
                @click="fileInput?.click()"
                @dragover.prevent="dragging = true"
                @dragleave.prevent="dragging = false"
                @drop.prevent="onDrop"
              >
                <CheckCircle2 v-if="file" :size="28" class="mx-auto mb-2 text-state-ok" aria-hidden="true" />
                <UploadCloud v-else :size="28" class="mx-auto mb-2 text-txt-muted" aria-hidden="true" />
                <span class="block break-all text-sm font-medium text-txt-main">
                  {{ file ? file.name : '点击选择或拖入音频文件' }}
                </span>
                <span class="mt-1 block text-xs text-txt-sec">
                  {{ file ? `${formatBytes(file.size)} · 点击可重新选择` : '支持 WAV / MP3 / FLAC / M4A，最大 30 MB' }}
                </span>
              </button>
              <input
                ref="fileInput"
                type="file"
                accept=".wav,.mp3,.flac,.m4a,.ogg,audio/*"
                class="hidden"
                @change="onFileChange"
              />
              <p v-if="fileError" class="mt-1.5 text-xs text-state-err" role="alert">{{ fileError }}</p>
            </div>

            <div class="space-y-1 rounded-lg border border-line bg-subtle p-3 text-xs text-txt-sec">
              <div class="flex items-center gap-1.5 font-medium text-txt-main">
                <FileAudio :size="14" aria-hidden="true" />
                参考音频要求
              </div>
              <p>后端允许时长 2–60 秒，推荐 8–15 秒单人干声、无背景音乐。</p>
              <p>上传后自动转为 24 kHz 单声道 WAV，最终时长以服务端校验为准。</p>
            </div>

            <div v-if="uploading" class="space-y-1.5" aria-live="polite">
              <div class="flex justify-between text-xs text-txt-sec">
                <span>正在上传并转码</span>
                <span class="tabular-nums">{{ uploadProgress }}%</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-line">
                <div class="h-full bg-brand transition-all" :style="{ width: `${uploadProgress}%` }" />
              </div>
            </div>

            <div
              v-if="backendError"
              class="flex items-start gap-2 rounded-lg border border-red-200 bg-state-errBg p-3 text-xs text-state-err"
              role="alert"
            >
              <AlertTriangle :size="16" class="mt-0.5 shrink-0" aria-hidden="true" />
              <span class="break-words">{{ backendError }}</span>
            </div>

            <div
              v-if="success"
              class="flex items-center gap-2 rounded-lg border border-green-200 bg-state-okBg p-3 text-xs text-state-ok"
              role="status"
            >
              <CheckCircle2 :size="16" aria-hidden="true" />
              音色上传完成
            </div>
          </div>

          <div class="mt-5 flex items-center justify-end gap-2.5 border-t border-line pt-4">
            <button type="button" class="btn-secondary" :disabled="uploading" @click="close">取消</button>
            <button type="submit" class="btn-primary" :disabled="uploading">
              <Loader2 v-if="uploading" :size="16" class="animate-spin" aria-hidden="true" />
              <span>{{ uploading ? '处理中...' : '开始上传' }}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>
