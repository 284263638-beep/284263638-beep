const path = require('node:path')
const sharp = require('sharp')

const root = path.join(process.cwd(), 'head-turn-demo')
const width = 1080
const headerHeight = 42

const header = (text, customWidth = width) => Buffer.from(`
  <svg width="${customWidth}" height="${headerHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111"/>
    <text x="18" y="27" fill="#fff" font-family="Arial, sans-serif" font-size="16">${text}</text>
  </svg>
`)

async function main() {
  const source = await sharp(path.join(root, 'contact-sheet.png')).resize({ width }).png().toBuffer({ resolveWithObject: true })
  const implementation = await sharp(path.join(root, 'qa', 'browser-direction-check.png')).resize({ width }).png().toBuffer({ resolveWithObject: true })
  const totalHeight = headerHeight + source.info.height + headerHeight + implementation.info.height
  await sharp({ create: { width, height: totalHeight, channels: 3, background: '#fff' } })
    .composite([
      { input: header('SOURCE VIDEO · 49-FRAME CONTACT SHEET'), left: 0, top: 0 },
      { input: source.data, left: 0, top: headerHeight },
      { input: header('BROWSER IMPLEMENTATION · CALIBRATED POINTER DIRECTIONS'), left: 0, top: headerHeight + source.info.height },
      { input: implementation.data, left: 0, top: headerHeight * 2 + source.info.height },
    ])
    .png()
    .toFile(path.join(root, 'qa', 'qa-comparison.png'))

  const sourceFramePath = path.join(root, '.work', 'frames', 'frame-009.png')
  const browserFramePath = path.join(root, 'qa', '01-up.png')
  const sourceFull = await sharp(sourceFramePath).resize(640, 360).png().toBuffer()
  const browserFull = await sharp(browserFramePath).resize(640, 360).png().toBuffer()
  const crop = { left: 560, top: 20, width: 560, height: 460 }
  const sourceClose = await sharp(sourceFramePath).extract(crop).resize(640, 526).png().toBuffer()
  const browserClose = await sharp(browserFramePath).extract(crop).resize(640, 526).png().toBuffer()
  await sharp({ create: { width: 1280, height: 360 + 526 + headerHeight * 2, channels: 3, background: '#fff' } })
    .composite([
      { input: header('SOURCE FRAME 009 · NATIVE 1280 × 720', 640), left: 0, top: 0 },
      { input: header('BROWSER FRAME 009 · 1:1 CSS PIXELS', 640), left: 640, top: 0 },
      { input: sourceFull, left: 0, top: headerHeight },
      { input: browserFull, left: 640, top: headerHeight },
      { input: header('SOURCE EDGE DETAIL', 640), left: 0, top: headerHeight + 360 },
      { input: header('BROWSER EDGE DETAIL AFTER DECONTAMINATION', 640), left: 640, top: headerHeight + 360 },
      { input: sourceClose, left: 0, top: headerHeight * 2 + 360 },
      { input: browserClose, left: 640, top: headerHeight * 2 + 360 },
    ])
    .png()
    .toFile(path.join(root, 'qa', 'qa-sharpness-comparison.png'))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
