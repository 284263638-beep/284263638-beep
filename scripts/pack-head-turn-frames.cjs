const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const sharp = require('sharp')

const ffmpeg = 'C:\\Users\\Lenovo\\AppData\\Local\\ms-playwright\\ffmpeg-1011\\ffmpeg-win64.exe'
const framesDir = process.argv[2]
const outputPath = process.argv[3]

if (!framesDir || !outputPath) throw new Error('Usage: node pack-head-turn-frames.cjs <frames-dir> <output.webm>')

async function main() {
  const frames = fs.readdirSync(framesDir)
    .filter(name => /^frame-\d{3}\.png$/i.test(name))
    .sort()
  if (frames.length !== 61) throw new Error(`Expected 61 source frames, found ${frames.length}`)

  const process = spawn(ffmpeg, [
    '-hide_banner', '-loglevel', 'warning',
    '-f', 'image2pipe', '-framerate', '10', '-vcodec', 'mjpeg', '-i', 'pipe:0',
    '-c:v', 'libvpx', '-g', '1', '-keyint_min', '1',
    '-deadline', 'realtime', '-cpu-used', '8', '-b:v', '30M',
    '-pix_fmt', 'yuv420p', '-an', '-f', 'webm', 'pipe:1',
  ], { stdio: ['pipe', 'pipe', 'inherit'] })

  const output = fs.createWriteStream(outputPath)
  process.stdout.pipe(output)
  process.stdin.on('error', error => {
    if (error.code !== 'EOF' && error.code !== 'EPIPE') throw error
  })
  for (const frame of frames) {
    const buffer = await sharp(path.join(framesDir, frame))
      .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
      .toBuffer()
    if (!process.stdin.write(buffer)) await new Promise(resolve => process.stdin.once('drain', resolve))
  }
  process.stdin.end()
  await new Promise((resolve, reject) => {
    process.once('error', reject)
    process.once('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))
  })
  if (!output.closed) await new Promise(resolve => output.once('close', resolve))
  console.log(JSON.stringify({ frames: frames.length, output: outputPath, bytes: fs.statSync(outputPath).size }))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
