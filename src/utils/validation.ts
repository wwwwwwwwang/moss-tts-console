export const MAX_INPUT_CHARS = 800
export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024
export const VOICE_NAME_RE = /^[A-Za-z0-9_-]{1,32}$/

export function validateSynthesisText(text: string): string {
  if (!text.trim()) return '请输入需要合成的文本'
  if (text.length > MAX_INPUT_CHARS) {
    return `当前已输入 ${text.length} 字，超过 ${MAX_INPUT_CHARS} 字上限，请精简后再提交`
  }
  return ''
}

export function validateVoiceName(name: string): string {
  if (!name.trim()) return '请输入音色名称'
  if (!VOICE_NAME_RE.test(name.trim())) {
    return '音色名只能包含字母、数字、下划线或连字符，长度 1–32'
  }
  return ''
}

export function validateAudioFile(file: File | null): string {
  if (!file) return '请选择参考音频文件'
  if (!file.size) return '音频文件为空'
  if (file.size > MAX_UPLOAD_BYTES) {
    return `文件大小 ${(file.size / 1024 / 1024).toFixed(1)} MB，超过 30 MB 上限`
  }
  return ''
}
