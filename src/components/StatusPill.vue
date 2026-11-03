<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: 'ok' | 'loading' | 'error' | 'offline'
}>()

const config = computed(() => {
  switch (props.status) {
    case 'ok':
      return { text: '运行正常', classes: 'bg-state-okBg text-state-ok border-green-200', dot: 'bg-state-ok' }
    case 'loading':
      return { text: '模型加载中', classes: 'bg-state-warnBg text-state-warn border-amber-200', dot: 'bg-state-warn' }
    case 'error':
      return { text: '模型异常', classes: 'bg-state-errBg text-state-err border-red-200', dot: 'bg-state-err' }
    default:
      return { text: '连接失败', classes: 'bg-state-errBg text-state-err border-red-200', dot: 'bg-state-err' }
  }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
    :class="config.classes"
    role="status"
  >
    <span class="h-2 w-2 rounded-full" :class="config.dot" aria-hidden="true" />
    <span>{{ config.text }}</span>
  </span>
</template>
