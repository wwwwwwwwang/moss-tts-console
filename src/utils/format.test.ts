import { describe, expect, it } from 'vitest'
import {
  cacheRate,
  formatBytes,
  formatPlaybackTime,
  formatUptime,
} from './format'

describe('format helpers', () => {
  it('formats byte sizes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MB')
  })

  it('formats uptime', () => {
    expect(formatUptime(45)).toBe('45秒')
    expect(formatUptime(125)).toBe('2分 5秒')
    expect(formatUptime(3725)).toBe('1小时 2分')
  })

  it('formats playback time', () => {
    expect(formatPlaybackTime(0)).toBe('00:00')
    expect(formatPlaybackTime(65.9)).toBe('01:05')
    expect(formatPlaybackTime(Number.NaN)).toBe('00:00')
  })

  it('calculates cache rate without dividing by zero', () => {
    expect(cacheRate(0, 0)).toBe(0)
    expect(cacheRate(9, 48)).toBe(18.8)
  })
})
