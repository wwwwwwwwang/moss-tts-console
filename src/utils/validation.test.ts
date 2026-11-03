import { describe, expect, it } from 'vitest'
import {
  MAX_INPUT_CHARS,
  validateAudioFile,
  validateSynthesisText,
  validateVoiceName,
} from './validation'

describe('synthesis validation', () => {
  it('rejects empty or whitespace text', () => {
    expect(validateSynthesisText('')).toBeTruthy()
    expect(validateSynthesisText('   \n')).toBeTruthy()
  })

  it('accepts text at the limit and rejects over the limit', () => {
    expect(validateSynthesisText('字'.repeat(MAX_INPUT_CHARS))).toBe('')
    expect(validateSynthesisText('字'.repeat(MAX_INPUT_CHARS + 1))).toContain('超过')
  })
})

describe('voice validation', () => {
  it('accepts safe voice names', () => {
    expect(validateVoiceName('ref_voice-01')).toBe('')
  })

  it('rejects unsafe or empty names', () => {
    expect(validateVoiceName('')).toBeTruthy()
    expect(validateVoiceName('../voice')).toBeTruthy()
    expect(validateVoiceName('中文音色')).toBeTruthy()
    expect(validateVoiceName('a'.repeat(33))).toBeTruthy()
  })
})

describe('audio file validation', () => {
  it('rejects missing and empty files', () => {
    expect(validateAudioFile(null)).toBeTruthy()
    expect(validateAudioFile(new File([], 'empty.wav', { type: 'audio/wav' }))).toBeTruthy()
  })

  it('accepts a normal audio file', () => {
    const file = new File([new Uint8Array(128)], 'voice.wav', { type: 'audio/wav' })
    expect(validateAudioFile(file)).toBe('')
  })
})
