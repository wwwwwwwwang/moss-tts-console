<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { Pause, Play, Volume2 } from 'lucide-vue-next'
import type { AudioResult } from '../types'
import { formatPlaybackTime } from '../utils/format'

const props = defineProps<{ result: AudioResult }>()
const audio = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const current = ref(0)
const duration = ref(0)

const globalPlayers = ((window as unknown as { __mossAudioPlayers?: Set<() => void> })
  .__mossAudioPlayers ||= new Set<() => void>())

function pauseOthers(): void {
  for (const pause of globalPlayers) {
    if (pause !== pauseSelf) pause()
  }
}

function pauseSelf(): void {
  audio.value?.pause()
}

function reset(): void {
  playing.value = false
  current.value = 0
  duration.value = 0
}

watch(
  () => props.result.url,
  () => {
    reset()
  },
)

async function toggle(): Promise<void> {
  const element = audio.value
  if (!element) return
  if (element.paused) {
    pauseOthers()
    try {
      await element.play()
    } catch {
      playing.value = false
    }
  } else {
    element.pause()
  }
}

function syncMetadata(): void {
  if (audio.value && Number.isFinite(audio.value.duration)) {
    duration.value = audio.value.duration
  }
}

function syncTime(): void {
  if (audio.value) current.value = audio.value.currentTime
}

function seek(event: Event): void {
  const target = event.target as HTMLInputElement
  if (!audio.value) return
  audio.value.currentTime = Number(target.value)
  current.value = audio.value.currentTime
}

function onPlay(): void {
  playing.value = true
  globalPlayers.add(pauseSelf)
}

function onPause(): void {
  playing.value = false
}

function onEnded(): void {
  playing.value = false
  current.value = duration.value
}

function download(): void {
  const link = document.createElement('a')
  link.href = props.result.url
  link.download = `moss-tts-${new Date(props.result.createdAt).toISOString().slice(0, 19).replace(/[:T]/g, '-')}.wav`
  link.click()
}

onBeforeUnmount(() => {
  globalPlayers.delete(pauseSelf)
  audio.value?.pause()
})
</script>

<template>
  <div class="rounded-lg border border-line bg-subtle p-3">
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover focus-ring"
        :aria-label="playing ? '暂停音频' : '播放音频'"
        @click="toggle"
      >
        <Pause v-if="playing" :size="16" fill="currentColor" />
        <Play v-else :size="16" fill="currentColor" />
      </button>
      <div class="min-w-0 flex-1">
        <div class="mb-1 flex items-center justify-between gap-3 text-[11px] tabular-nums text-txt-sec">
          <span class="flex items-center gap-1.5">
            <Volume2 :size="13" aria-hidden="true" />
            合成音频
          </span>
          <span>{{ formatPlaybackTime(current) }} / {{ formatPlaybackTime(duration) }}</span>
        </div>
        <input
          type="range"
          min="0"
          :max="duration || 0"
          step="0.01"
          :value="current"
          aria-label="音频播放进度"
          class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-brand"
          @input="seek"
        />
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-txt-main transition-colors hover:bg-brand-light hover:text-brand focus-ring"
        @click="download"
      >
        下载
      </button>
    </div>
    <audio
      ref="audio"
      :src="result.url"
      preload="metadata"
      class="hidden"
      @loadedmetadata="syncMetadata"
      @timeupdate="syncTime"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
    />
  </div>
</template>
