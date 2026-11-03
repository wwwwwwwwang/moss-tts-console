import { chromium } from 'playwright-core'
import fs from 'node:fs/promises'
import path from 'node:path'

const token = process.env.MOSS_TOKEN
const baseUrl = process.env.MOSS_BASE_URL || 'https://8000-agq2cyjkhz37eaqo2u3k7cy5xq.instabox.tech/admin'
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const outputDir = path.resolve('.local/ui')

if (!token) {
  console.error('MOSS_TOKEN is required')
  process.exit(2)
}

await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ executablePath: chromePath, headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const errors = []
const failedRequests = []

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})
page.on('pageerror', (error) => errors.push(error.message))
page.on('requestfailed', (request) => {
  failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`)
})

const summary = {}
let createdVoice = ''
let invalidContext

function makeWav(seconds = 3, sampleRate = 24000) {
  const samples = Math.floor(seconds * sampleRate)
  const buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + samples * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples * 2, 40)
  return buffer
}

try {
  invalidContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const invalidPage = await invalidContext.newPage()
  await invalidPage.goto(baseUrl, { waitUntil: 'networkidle' })
  await invalidPage.fill('#token-input', 'invalid_smoke_token')
  await invalidPage.getByRole('button', { name: /验证并进入控制台/ }).click()
  await invalidPage.waitForSelector('text=API Token 无效', { timeout: 15_000 })
  await invalidPage.screenshot({ path: path.join(outputDir, '00-invalid-token.png'), fullPage: true })
  summary.invalidToken = 'rejected'
  await invalidContext.close()
  invalidContext = undefined

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForSelector('#token-input')
  await page.screenshot({ path: path.join(outputDir, '01-login.png'), fullPage: true })

  await page.fill('#token-input', token)
  await page.getByRole('button', { name: /验证并进入控制台/ }).click()
  await page.waitForSelector('text=快速合成测试', { timeout: 30_000 })
  await page.screenshot({ path: path.join(outputDir, '02-overview.png'), fullPage: true })
  summary.overview = {
    status: await page.locator('header [role="status"]').first().innerText(),
    voices: await page.locator('nav a').filter({ hasText: '音色库' }).locator('span').last().innerText(),
  }

  await page.getByRole('link', { name: /合成工作台/ }).click()
  await page.waitForSelector('#studio-text')
  const speechResponse = page.waitForResponse(
    (response) => response.url().includes('/v1/audio/speech') && response.request().method() === 'POST',
    { timeout: 180_000 },
  )
  await page.getByRole('button', { name: '生成语音', exact: true }).click()
  const response = await speechResponse
  await page.waitForSelector('text=已生成', { timeout: 180_000 })
  await page.screenshot({ path: path.join(outputDir, '03-workbench.png'), fullPage: true })
  summary.synthesis = {
    status: response.status(),
    contentType: response.headers()['content-type'],
  }

  await page.goto(baseUrl.replace(/\/$/, '') + '#/voices', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=上传参考音色')
  const voicesBefore = await page.locator('article').count()
  await page.screenshot({ path: path.join(outputDir, '04-voices.png'), fullPage: true })
  createdVoice = `ui_smoke_${Date.now()}`
  await page.getByRole('button', { name: '上传参考音色' }).click()
  await page.waitForSelector('#voice-name')
  await page.fill('#voice-name', createdVoice)
  await page.locator('input[type="file"]').setInputFiles({
    name: `${createdVoice}.wav`,
    mimeType: 'audio/wav',
    buffer: makeWav(),
  })
  await page.getByRole('button', { name: '开始上传' }).click()
  await page.waitForSelector(`text=${createdVoice} 已上传`, { timeout: 90_000 })
  await page.locator('article').filter({ hasText: createdVoice }).waitFor({ timeout: 15_000 })
  const voicesAfterUpload = await page.locator('article').count()
  await page.screenshot({ path: path.join(outputDir, '04b-upload-success.png'), fullPage: true })

  const createdCard = page.locator('article').filter({ hasText: createdVoice })
  await createdCard.getByRole('button', { name: '删除' }).click()
  await page.getByRole('alertdialog').waitFor()
  await page.getByRole('button', { name: '确认删除' }).click()
  await page.waitForSelector(`text=${createdVoice} 已删除`, { timeout: 30_000 })
  await page.waitForFunction(
    (name) => !Array.from(document.querySelectorAll('article')).some((card) => card.textContent?.includes(name)),
    createdVoice,
    { timeout: 15_000 },
  )
  const voicesAfterDelete = await page.locator('article').count()
  summary.voices = {
    before: voicesBefore,
    afterUpload: voicesAfterUpload,
    afterDelete: voicesAfterDelete,
    uploadAndDelete: 'ok',
  }
  createdVoice = ''

  await page.goto(baseUrl.replace(/\/$/, '') + '#/records', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=最近合成请求')
  await page.screenshot({ path: path.join(outputDir, '05-records.png'), fullPage: true })

  await page.goto(baseUrl.replace(/\/$/, '') + '#/settings', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=自动刷新与轮询')
  await page.screenshot({ path: path.join(outputDir, '06-settings.png'), fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseUrl.replace(/\/$/, '') + '#/', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=快速合成测试')
  await page.getByRole('button', { name: '打开导航菜单' }).click()
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(outputDir, '07-mobile-menu.png'), fullPage: true })
  summary.mobile = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  }))

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.getByRole('button', { name: '关闭导航菜单' }).click()
  await page.goto(baseUrl.replace(/\/$/, '') + '#/', { waitUntil: 'networkidle' })
  await page.waitForSelector('text=快速合成测试')
  await page.screenshot({ path: path.join(outputDir, '08-tablet.png'), fullPage: true })
  summary.tablet = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  }))

  summary.consoleErrors = errors
  summary.failedRequests = failedRequests
  console.log(JSON.stringify(summary, null, 2))
} catch (error) {
  await page.screenshot({ path: path.join(outputDir, 'failure.png'), fullPage: true }).catch(() => {})
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error),
        consoleErrors: errors,
        failedRequests,
        pageText: await page.locator('body').innerText().catch(() => ''),
      },
      null,
      2,
    ),
  )
  process.exitCode = 1
} finally {
  if (createdVoice) {
    const cleanupToken = process.env.MOSS_TOKEN
    if (cleanupToken) {
      await fetch(`${baseUrl.split('/admin')[0]}/admin/voices/${encodeURIComponent(createdVoice)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${cleanupToken}` },
      }).catch(() => {})
    }
  }
  if (invalidContext) await invalidContext.close().catch(() => {})
  await browser.close()
}
