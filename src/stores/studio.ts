import { reactive } from 'vue'
import type { AudioResult } from '../types'
import { performSynthesis, releaseAudio } from '../audio/synthesis'

interface StudioState {
  text: string
  voice: string
  result: AudioResult | null
  error: string
  isSynthesizing: boolean
}

const initialText =
  '清晨的阳光穿过薄雾，洒在安静的湖面上。在单机沙箱环境中，MOSS-TTS-Nano 模型能够以极低的资源开销，生成自然流畅的中文语音。'

export const studio = reactive<StudioState>({
  text: initialText,
  voice: '',
  result: null,
  error: '',
  isSynthesizing: false,
})

export function setStudioResult(result: AudioResult): void {
  releaseAudio(studio.result)
  studio.result = result
}

export async function synthesizeStudio(): Promise<void> {
  if (studio.isSynthesizing || !studio.text.trim() || !studio.voice) return
  studio.error = ''
  studio.isSynthesizing = true
  try {
    const result = await performSynthesis(studio.text.trim(), studio.voice)
    setStudioResult(result)
  } catch (error) {
    studio.error = error instanceof Error ? error.message : '合成失败'
  } finally {
    studio.isSynthesizing = false
  }
}
