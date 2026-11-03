<script setup lang="ts">
import { AlertTriangle, Loader2 } from 'lucide-vue-next'

defineProps<{
  visible: boolean
  title: string
  message: string
  confirmText?: string
  loading?: boolean
}>()

defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40" aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        class="card-base relative w-full max-w-[400px] space-y-4 p-5"
      >
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-state-errBg text-state-err">
            <AlertTriangle :size="19" aria-hidden="true" />
          </div>
          <div>
            <h3 id="confirm-title" class="text-[16px] font-medium text-txt-main">{{ title }}</h3>
            <p id="confirm-message" class="mt-1 text-xs leading-relaxed text-txt-sec">{{ message }}</p>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2.5 border-t border-line pt-3">
          <button type="button" class="btn-secondary h-9 text-xs" :disabled="loading" @click="$emit('cancel')">
            取消
          </button>
          <button
            type="button"
            class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-state-err px-4 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            :disabled="loading"
            @click="$emit('confirm')"
          >
            <Loader2 v-if="loading" :size="14" class="animate-spin" aria-hidden="true" />
            {{ confirmText || '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
