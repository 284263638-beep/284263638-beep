const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const inputDir = process.argv[2]
const outputDir = process.argv[3]

if (!inputDir || !outputDir) throw new Error('Usage: node export-head-turn-full-frames.cjs <png-dir> <jpg-dir>')

async function main() {
  fs.mkdirSync(outputDir, { recursive: true })
  const frames = fs.readdirSync(inputDir).filter(name => /^frame-\d{3}\.png$/i.test(name)).sort()
  if (frames.length !== 61) throw new Error(`Expected 61 frames, found ${frames.length}`)
  for (const frame of frames) {
    const output = path.join(outputDir, frame.replace(/\.png$/i, '.jpg'))
    await sharp(path.join(inputDir, frame))
      .jpeg({ quality: 95, chromaSubsampling: '4:4:4', optimiseCoding: true })
      .toFile(output)
  }
  await sharp(path.join(inputDir, 'frame-052.png'))
    .removeAlpha()
    .webp({ quality: 95, smartSubsample: true })
    .toFile(path.join(path.dirname(outputDir), 'frame_front.webp'))
  const calibratedFrames = [45, 4, 7, 11, 14, 18, 21, 25, 29, 35, 40, 43]
  await sharp({
    create: {
      width: 3840 * 4,
      height: 2160 * 3,
      channels: 3,
      background: '#e3e5e6',
    },
  }).composite(calibratedFrames.map((frame, index) => ({
    input: path.join(inputDir, `frame-${String(frame).padStart(3, '0')}.png`),
    left: (index % 4) * 3840,
    top: Math.floor(index / 4) * 2160,
  }))).removeAlpha().webp({ quality: 91, smartSubsample: true }).toFile(path.join(path.dirname(outputDir), 'sprite.webp'))
  const totalBytes = fs.readdirSync(outputDir)
    .reduce((sum, name) => sum + fs.statSync(path.join(outputDir, name)).size, 0)
  console.log(JSON.stringify({ frames: frames.length, width: 3840, height: 2160, totalBytes }))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
