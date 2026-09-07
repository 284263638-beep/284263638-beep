const { chromium } = require('playwright')

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })
  const page = await browser.newPage()
  await page.goto(process.argv[2] || 'http://127.0.0.1:4173/head-turn-demo/', { waitUntil: 'domcontentloaded' })
  const result = await page.evaluate(async () => {
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'auto'
    video.src = './head-turn-frames-4k.webm'
    document.body.append(video)
    await new Promise(resolve => {
      if (video.readyState >= 2) resolve()
      else video.addEventListener('loadeddata', resolve, { once: true })
    })
    video.pause()
    const targets = [0, .1, .2, .3, .4, .5, 1.2, 2.4, 3.5, 2.8, 1.7, .6]
    const timings = []
    for (const target of targets) {
      const started = performance.now()
      await new Promise(resolve => {
        video.addEventListener('seeked', resolve, { once: true })
        video.currentTime = target
      })
      timings.push(performance.now() - started)
    }
    return { timings, average: timings.reduce((sum, value) => sum + value, 0) / timings.length }
  })
  console.log(JSON.stringify(result, null, 2))
  await browser.close()
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
