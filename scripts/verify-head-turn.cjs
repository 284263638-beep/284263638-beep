const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const sharp = require('sharp')

const PAGE_URL = process.argv[2] || 'http://127.0.0.1:4173/head-turn-demo/'
const OUTPUT_DIR = process.argv[3] || path.join(process.cwd(), 'head-turn-demo', 'qa')

const cases = [
  { name: 'up', angle: -90, frame: 11 },
  { name: 'upper-right', angle: -60, frame: 14 },
  { name: 'right', angle: 0, frame: 21 },
  { name: 'lower-right', angle: 60, frame: 29 },
  { name: 'down', angle: 90, frame: 35 },
  { name: 'lower-left', angle: 120, frame: 40 },
  { name: 'left', angle: 180, frame: 45 },
  { name: 'upper-left', angle: -120, frame: 7 },
  { name: 'center', angle: null, frame: 52 },
]

const labelSvg = (text, width) => Buffer.from(`
  <svg width="${width}" height="32" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111"/>
    <text x="10" y="21" fill="#fff" font-family="Arial, sans-serif" font-size="14">${text}</text>
  </svg>
`)

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const consoleErrors = []
  const pageErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => pageErrors.push(error.message))

  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const intro = document.querySelector('#intro')
    return intro && intro.readyState >= 2 && intro.currentTime >= 3.95 && intro.currentTime < 6
  }, null, { timeout: 12000 })
  const introStart = await page.evaluate(() => {
    const intro = document.querySelector('#intro')
    return { currentTime: intro.currentTime, width: intro.videoWidth, height: intro.videoHeight }
  })
  await page.waitForFunction(() => window.__HEAD_TURN__ && !window.__HEAD_TURN__.getState().intro, null, { timeout: 12000 })
  const introEnd = await page.evaluate(() => document.querySelector('#intro').currentTime)
  const introPlayback = {
    startObserved: introStart.currentTime,
    endObserved: introEnd,
    sourceSize: { width: introStart.width, height: introStart.height },
    passed: introStart.currentTime >= 3.95
      && introStart.currentTime < 6
      && introEnd >= 5.9
      && introStart.width === 3840
      && introStart.height === 2160,
  }
  const spriteResponse = await page.request.get(new URL('./sprite.webp', PAGE_URL).href)
  const frontResponse = await page.request.get(new URL('./frame_front.webp', PAGE_URL).href)
  const introResponse = await page.request.get(new URL('./intro-source-4k.mp4', PAGE_URL).href)
  const frameResponse = await page.request.get(new URL('./frames/frame-021.jpg', PAGE_URL).href)
  if (!spriteResponse.ok() || !frontResponse.ok() || !introResponse.ok() || !frameResponse.ok()) throw new Error('Asset request failed')

  const visibleText = await page.evaluate(() => document.body.innerText.trim())
  const pivotForMotion = await page.evaluate(() => window.__HEAD_TURN__.getPivot())
  await page.mouse.move(pivotForMotion.x, pivotForMotion.y - 260)
  await page.waitForFunction(() => document.querySelector('#character')?.dataset.frame === '11')
  await page.mouse.move(pivotForMotion.x + 260, pivotForMotion.y)
  const smoothnessSamples = []
  for (let index = 0; index < 80; index += 1) {
    await page.waitForTimeout(10)
    smoothnessSamples.push(await page.evaluate(() => window.__HEAD_TURN__.getState()))
  }
  const uniqueTransitionFrames = [...new Set(smoothnessSamples.map(sample => sample.frame))]
  const hasTransparency = await page.evaluate(() => {
    const canvas = document.querySelector('#character')
    return !canvas || canvas.dataset.opaque !== 'true' || getComputedStyle(canvas).opacity !== '1'
  })
  const smoothness = {
    sampleCount: smoothnessSamples.length,
    uniqueTransitionFrames,
    displayedFrameDelta: smoothnessSamples.at(-1).displayedFrames - smoothnessSamples[0].displayedFrames,
    skippedRequestDelta: smoothnessSamples.at(-1).skippedRequests - smoothnessSamples[0].skippedRequests,
    framePoolSize: await page.evaluate(() => window.__HEAD_TURN__.FRAME_NUMBERS.length),
    hasTransparency,
    passed: uniqueTransitionFrames.length >= 5
      && smoothnessSamples.at(-1).displayedFrames - smoothnessSamples[0].displayedFrames >= 5
      && !hasTransparency,
  }

  const results = []
  const captureWidth = 360
  const captureHeight = 203
  const tileHeight = captureHeight + 32
  const montageComposites = []

  for (let index = 0; index < cases.length; index += 1) {
    const testCase = cases[index]
    const pivot = await page.evaluate(() => window.__HEAD_TURN__.getPivot())
    const responseStarted = Date.now()
    if (testCase.angle === null) {
      await page.mouse.move(pivot.x, pivot.y)
    } else {
      const radians = testCase.angle * Math.PI / 180
      const radius = 260
      await page.mouse.move(pivot.x + Math.cos(radians) * radius, pivot.y + Math.sin(radians) * radius)
    }
    await page.waitForFunction(([frame, direction]) => {
      const character = document.querySelector('#character')
      return Number(character?.dataset.frame) === frame && character?.dataset.direction === direction
    }, [testCase.frame, testCase.name], { timeout: 2500 })
    const responseMs = Date.now() - responseStarted
    await page.waitForTimeout(320)
    const state = await page.evaluate(() => window.__HEAD_TURN__.getState())
    const passed = state.frame === testCase.frame && state.direction === testCase.name
    results.push({ ...testCase, responseMs, actual: state, passed })

    const screenshotPath = path.join(OUTPUT_DIR, `${String(index + 1).padStart(2, '0')}-${testCase.name}.png`)
    await page.locator('#stage').screenshot({ path: screenshotPath })
    const thumb = await sharp(screenshotPath).resize(captureWidth, captureHeight, { fit: 'fill' }).png().toBuffer()
    const left = (index % 3) * captureWidth
    const top = Math.floor(index / 3) * tileHeight
    montageComposites.push({ input: thumb, left, top })
    montageComposites.push({ input: labelSvg(`${testCase.name} · expected ${testCase.frame} · actual ${state.frame}`, captureWidth), left, top: top + captureHeight })
  }

  const montagePath = path.join(OUTPUT_DIR, 'browser-direction-check.png')
  await sharp({
    create: { width: captureWidth * 3, height: tileHeight * 3, channels: 3, background: '#eee' },
  }).composite(montageComposites).png().toFile(montagePath)

  const report = {
    url: PAGE_URL,
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    assets: { sprite: spriteResponse.status(), frameFront: frontResponse.status(), intro: introResponse.status(), fullFrame: frameResponse.status() },
    visibleText,
    introPlayback,
    smoothness,
    consoleErrors,
    pageErrors,
    results,
    passed: results.every(result => result.passed)
      && introPlayback.passed
      && smoothness.passed
      && visibleText === ''
      && consoleErrors.length === 0
      && pageErrors.length === 0,
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'browser-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ ...report, montagePath }, null, 2))
  await browser.close()
  if (!report.passed) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
