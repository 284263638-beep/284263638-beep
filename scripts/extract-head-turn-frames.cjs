const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require('playwright')
const sharp = require('sharp')

const SOURCE = process.argv[2]
const OUTPUT = process.argv[3] || path.join(process.cwd(), 'head-turn-demo', '.work')
const SAMPLE_COUNT = Number(process.argv[4] || 49)

if (!SOURCE || !fs.existsSync(SOURCE)) {
  throw new Error(`Video source not found: ${SOURCE || '(missing)'}`)
}

async function main() {
fs.mkdirSync(path.join(OUTPUT, 'frames'), { recursive: true })

const videoBuffer = fs.readFileSync(SOURCE)
const server = http.createServer((request, response) => {
  if (request.url === '/video.mp4') {
    const range = request.headers.range
    if (range) {
      const [startText, endText] = range.replace('bytes=', '').split('-')
      const start = Number(startText)
      const end = endText ? Number(endText) : videoBuffer.length - 1
      response.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${videoBuffer.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': 'video/mp4',
      })
      response.end(videoBuffer.subarray(start, end + 1))
      return
    }
    response.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': videoBuffer.length })
    response.end(videoBuffer)
    return
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  response.end('<!doctype html><video src="/video.mp4" muted playsinline preload="auto"></video>')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--autoplay-policy=no-user-gesture-required'],
})

const page = await browser.newPage()
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' })
await page.waitForFunction(() => {
  const video = document.querySelector('video')
  return video && video.readyState >= 1 && Number.isFinite(video.duration)
})

const metadata = await page.locator('video').evaluate(video => ({
  duration: video.duration,
  width: video.videoWidth,
  height: video.videoHeight,
}))

const samples = []
for (let index = 0; index < SAMPLE_COUNT; index += 1) {
  const time = metadata.duration * index / Math.max(1, SAMPLE_COUNT - 1)
  const dataUrl = await page.locator('video').evaluate(async (video, requestedTime) => {
    const target = Math.min(Math.max(0, requestedTime), Math.max(0, video.duration - 0.001))
    if (Math.abs(video.currentTime - target) > 0.001) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Seek timed out at ${target}`)), 5000)
        video.addEventListener('seeked', () => {
          clearTimeout(timer)
          resolve()
        }, { once: true })
        video.currentTime = target
      })
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    return canvas.toDataURL('image/png')
  }, time)

  const frameName = `frame-${String(index).padStart(3, '0')}.png`
  const framePath = path.join(OUTPUT, 'frames', frameName)
  fs.writeFileSync(framePath, Buffer.from(dataUrl.split(',')[1], 'base64'))
  samples.push({ index, time, file: path.join('frames', frameName) })
}

await browser.close()
await new Promise(resolve => server.close(resolve))

const columns = 7
const thumbWidth = 220
const thumbHeight = Math.round(thumbWidth * metadata.height / metadata.width)
const labelHeight = 28
const gap = 10
const rows = Math.ceil(samples.length / columns)
const sheetWidth = columns * thumbWidth + (columns + 1) * gap
const sheetHeight = rows * (thumbHeight + labelHeight) + (rows + 1) * gap
const labelSvg = (index, time) => Buffer.from(`
  <svg width="${thumbWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111"/>
    <text x="10" y="19" fill="white" font-family="Arial, sans-serif" font-size="14">#${String(index).padStart(2, '0')} · ${time.toFixed(2)}s</text>
  </svg>
`)

const composites = []
for (const sample of samples) {
  const column = sample.index % columns
  const row = Math.floor(sample.index / columns)
  const left = gap + column * (thumbWidth + gap)
  const top = gap + row * (thumbHeight + labelHeight + gap)
  const thumb = await sharp(path.join(OUTPUT, sample.file))
    .resize(thumbWidth, thumbHeight, { fit: 'cover' })
    .png()
    .toBuffer()
  composites.push({ input: thumb, left, top })
  composites.push({ input: labelSvg(sample.index, sample.time), left, top: top + thumbHeight })
}

await sharp({
  create: { width: sheetWidth, height: sheetHeight, channels: 3, background: '#d8d8d8' },
})
  .composite(composites)
  .png()
  .toFile(path.join(OUTPUT, 'contact-sheet.png'))

fs.writeFileSync(path.join(OUTPUT, 'samples.json'), JSON.stringify({ metadata, samples }, null, 2))
console.log(JSON.stringify({ output: OUTPUT, contactSheet: path.join(OUTPUT, 'contact-sheet.png'), metadata, samples: samples.length }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
