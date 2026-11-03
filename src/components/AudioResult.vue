<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import AudioPlayer from './AudioPlayer.vue'
import type { AudioResult } from '../types'
import { formatBytes } from '../utils/format'

defineProps<{
  result: AudioResult
  replayLabel?: string
}>()

defineEmits<{ replay: [] }>()
</script>

<template>
  <div class="space-y-3">
    <AudioPlayer :result="result" />
    <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-txt-sec">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
        <span>音色 <code class="font-mono text-txt-main">{{ result.voice }}</code></span>
        <span>{{ formatBytes(result.bytes) }}</span>
        <span>{{ result.seconds.toFixed(2) }} 秒</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 font-medium text-txt-main hover:bg-brand-light hover:text-brand focus-ring"
          @click="$emit('replay')"
        >
          <RefreshCw :size="14" aria-hidden="true" />
          {{ replayLabel || '重新生成' }}
        </button>
      </div>
    </div>
    <p class="line-clamp-2 text-[11px] leading-relaxed text-txt-muted" :title="result.text">
      {{ result.text }}
    </p>
  </div>
</template>
