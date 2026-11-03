import { ref } from 'vue'
import type { AudioResult } from '../types'
import { synthesizeSpeech } from '../api/client'

const activeUrls = new Set<string>()
export const synthesisBusy = ref(false)

export function releaseAudio(result: AudioResult | null | undefined): void {
  if (!result) return
  if (activeUrls.has(result.url)) {
    URL.revokeObjectURL(result.url)
    activeUrls.delete(result.url)
  }
}

export function releaseAllAudio(): void {
  for (const url of activeUrls) URL.revokeObjectURL(url)
  activeUrls.clear()
}

export async function performSynthesis(text: string, voice: string): Promise<AudioResult> {
  if (synthesisBusy.value) throw new Error('已有合成任务正在进行，请稍候')
  synthesisBusy.value = true
  const started = performance.now()
  try {
    const blob = await synthesizeSpeech(text, voice)
    const seconds = (performance.now() - started) / 1000
    const url = URL.createObjectURL(blob)
    activeUrls.add(url)
    return {
      url,
      blob,
      voice,
      text,
      seconds: Math.round(seconds * 100) / 100,
      bytes: blob.size,
      createdAt: Date.now(),
    }
  } finally {
    synthesisBusy.value = false
  }
}
