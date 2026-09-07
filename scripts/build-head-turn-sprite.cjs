const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const WORK_DIR = process.argv[2] || path.join(process.cwd(), 'head-turn-demo', '.work')
const OUTPUT_DIR = process.argv[3] || path.join(process.cwd(), 'head-turn-demo')
const IS_4K = process.argv[4] === '4k'
const FRAME_WIDTH = IS_4K ? 3840 : 1920
const FRAME_HEIGHT = IS_4K ? 2160 : 1080
const COLUMNS = IS_4K ? 4 : 7
const SOURCE_FRAMES = IS_4K
  ? [45, 4, 7, 11, 14, 18, 21, 25, 29, 35, 40, 43]
  : Array.from({ length: 49 }, (_, index) => index)
const ROWS = Math.ceil(SOURCE_FRAMES.length / COLUMNS)
const FRONT_SOURCE_FRAME = IS_4K ? 52 : 41

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const colorDistance = (data, offset, background) => {
  const dr = data[offset] - background[0]
  const dg = data[offset + 1] - background[1]
  const db = data[offset + 2] - background[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

const median = values => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function removeFlatBackground(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const cornerSamples = [[], [], []]
  const patch = 14
  const corners = [[0, 0], [width - patch, 0], [0, height - patch], [width - patch, height - patch]]
  for (const [originX, originY] of corners) {
    for (let y = originY; y < originY + patch; y += 1) {
      for (let x = originX; x < originX + patch; x += 1) {
        const offset = (y * width + x) * channels
        cornerSamples[0].push(data[offset])
        cornerSamples[1].push(data[offset + 1])
        cornerSamples[2].push(data[offset + 2])
      }
    }
  }
  const background = cornerSamples.map(median)

  const foregroundEvidence = new Uint8Array(width * height)
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x
      const offset = index * channels
      const distance = colorDistance(data, offset, background)
      if (distance > 14) foregroundEvidence[index] = 1
    }
  }

  const integralWidth = width + 1
  const integral = new Uint32Array((width + 1) * (height + 1))
  for (let y = 1; y <= height; y += 1) {
    let rowSum = 0
    for (let x = 1; x <= width; x += 1) {
      rowSum += foregroundEvidence[(y - 1) * width + x - 1]
      integral[y * integralWidth + x] = integral[(y - 1) * integralWidth + x] + rowSum
    }
  }
  const hasEvidenceNearby = (x, y, radius = 1) => {
    const x1 = Math.max(0, x - radius)
    const y1 = Math.max(0, y - radius)
    const x2 = Math.min(width - 1, x + radius)
    const y2 = Math.min(height - 1, y + radius)
    const sum = integral[(y2 + 1) * integralWidth + x2 + 1]
      - integral[y1 * integralWidth + x2 + 1]
      - integral[(y2 + 1) * integralWidth + x1]
      + integral[y1 * integralWidth + x1]
    return sum > 0
  }

  const protectedMask = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      if (hasEvidenceNearby(x, y)) protectedMask[index] = 1
    }
  }

  const backgroundMask = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  const seed = index => {
    if (!protectedMask[index] && !backgroundMask[index]) {
      backgroundMask[index] = 1
      queue[tail++] = index
    }
  }
  for (let x = 0; x < width; x += 1) {
    seed(x)
    seed((height - 1) * width + x)
  }
  for (let y = 0; y < height; y += 1) {
    seed(y * width)
    seed(y * width + width - 1)
  }
  while (head < tail) {
    const index = queue[head++]
    const x = index % width
    if (x > 0) seed(index - 1)
    if (x < width - 1) seed(index + 1)
    if (index >= width) seed(index - width)
    if (index < width * (height - 1)) seed(index + width)
  }

  // Compression noise can create tiny protected islands in a flat backdrop.
  // Keep only the largest connected foreground component (the character).
  const componentLabels = new Int32Array(width * height)
  const componentQueue = new Int32Array(width * height)
  let componentId = 0
  let largestComponent = 0
  let largestSize = 0
  for (let start = 0; start < backgroundMask.length; start += 1) {
    if (backgroundMask[start] || componentLabels[start]) continue
    componentId += 1
    let componentHead = 0
    let componentTail = 0
    componentQueue[componentTail++] = start
    componentLabels[start] = componentId
    while (componentHead < componentTail) {
      const index = componentQueue[componentHead++]
      const x = index % width
      const visit = neighbor => {
        if (!backgroundMask[neighbor] && !componentLabels[neighbor]) {
          componentLabels[neighbor] = componentId
          componentQueue[componentTail++] = neighbor
        }
      }
      if (x > 0) visit(index - 1)
      if (x < width - 1) visit(index + 1)
      if (index >= width) visit(index - width)
      if (index < width * (height - 1)) visit(index + width)
    }
    if (componentTail > largestSize) {
      largestSize = componentTail
      largestComponent = componentId
    }
  }

  const finalBackground = new Uint8Array(width * height)
  for (let index = 0; index < finalBackground.length; index += 1) {
    if (componentLabels[index] !== largestComponent) finalBackground[index] = 1
  }

  const finalBgIntegral = new Uint32Array((width + 1) * (height + 1))
  for (let y = 1; y <= height; y += 1) {
    let rowSum = 0
    for (let x = 1; x <= width; x += 1) {
      rowSum += finalBackground[(y - 1) * width + x - 1]
      finalBgIntegral[y * integralWidth + x] = finalBgIntegral[(y - 1) * integralWidth + x] + rowSum
    }
  }
  const hasBackgroundNearby = (x, y, radius = 2) => {
    const x1 = Math.max(0, x - radius)
    const y1 = Math.max(0, y - radius)
    const x2 = Math.min(width - 1, x + radius)
    const y2 = Math.min(height - 1, y + radius)
    const sum = finalBgIntegral[(y2 + 1) * integralWidth + x2 + 1]
      - finalBgIntegral[y1 * integralWidth + x2 + 1]
      - finalBgIntegral[(y2 + 1) * integralWidth + x1]
      + finalBgIntegral[y1 * integralWidth + x1]
    return sum > 0
  }

  const hardAlpha = Buffer.alloc(width * height)
  let transparent = 0
  let opaque = 0
  for (let index = 0; index < finalBackground.length; index += 1) {
    if (finalBackground[index]) {
      hardAlpha[index] = 0
      transparent += 1
    } else {
      const x = index % width
      const y = Math.floor(index / width)
      if (hasBackgroundNearby(x, y)) {
        const distance = colorDistance(data, index * channels, background)
        // Only a narrow antialiased fringe is allowed. The earlier wide ramp
        // retained too much of the flat backdrop and appeared as a soft halo.
        const linear = Math.max(0, Math.min(1, (distance - 2) / 24))
        const smooth = linear * linear * (3 - 2 * linear)
        hardAlpha[index] = Math.round(smooth * 255)
      } else {
        hardAlpha[index] = 255
      }
      opaque += 1
    }
  }
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * channels
    const alpha = hardAlpha[index] / 255
    data[offset + 3] = hardAlpha[index]

    // Reverse the original flat-background blend on partially transparent
    // pixels. This removes gray/green spill without changing opaque white and
    // gray areas inside the character.
    if (alpha > 0.04 && alpha < 0.995) {
      for (let channel = 0; channel < 3; channel += 1) {
        const recovered = background[channel] + (data[offset + channel] - background[channel]) / alpha
        data[offset + channel] = Math.max(0, Math.min(255, Math.round(recovered)))
      }
    }
  }

  let enhanced = sharp(data, { raw: { width, height, channels } })
    .resize(FRAME_WIDTH, FRAME_HEIGHT, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
  if (!IS_4K) {
    enhanced = enhanced.sharpen({ sigma: 0.78, m1: 0.55, m2: 1.25, x1: 2.2, y2: 10, y3: 18 })
  }
  const png = await enhanced
    .png({ compressionLevel: 7 })
    .toBuffer()
  return { png, background, transparent, opaque }
}

async function main() {
  const processed = []
  const reports = []
  for (let index = 0; index < SOURCE_FRAMES.length; index += 1) {
    const sourceFrame = SOURCE_FRAMES[index]
    const file = path.join(WORK_DIR, 'frames', `frame-${String(sourceFrame).padStart(3, '0')}.png`)
    const result = await removeFlatBackground(file)
    processed.push(result.png)
    reports.push({
      frame: index,
      sourceFrame,
      background: result.background,
      transparentPercent: Number((result.transparent / (FRAME_WIDTH * FRAME_HEIGHT) * 100).toFixed(2)),
      opaquePercent: Number((result.opaque / (FRAME_WIDTH * FRAME_HEIGHT) * 100).toFixed(2)),
    })
  }

  const spriteWidth = FRAME_WIDTH * COLUMNS
  const spriteHeight = FRAME_HEIGHT * ROWS
  const composites = processed.map((input, index) => ({
    input,
    left: (index % COLUMNS) * FRAME_WIDTH,
    top: Math.floor(index / COLUMNS) * FRAME_HEIGHT,
  }))
  await sharp({ create: { width: spriteWidth, height: spriteHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites)
    .webp({ quality: 96, alphaQuality: 100, smartSubsample: true, effort: 6 })
    .toFile(path.join(OUTPUT_DIR, 'sprite.webp'))

  const frontIndex = SOURCE_FRAMES.indexOf(FRONT_SOURCE_FRAME)
  const frontPng = frontIndex >= 0
    ? processed[frontIndex]
    : (await removeFlatBackground(path.join(WORK_DIR, 'frames', `frame-${String(FRONT_SOURCE_FRAME).padStart(3, '0')}.png`))).png
  await sharp(frontPng)
    .webp({ quality: 96, alphaQuality: 100, smartSubsample: true, effort: 6 })
    .toFile(path.join(OUTPUT_DIR, 'frame_front.webp'))

  fs.copyFileSync(path.join(WORK_DIR, 'contact-sheet.png'), path.join(OUTPUT_DIR, 'contact-sheet.png'))

  const previewFrames = IS_4K ? [3, 4, 6, 7, 9, 10, 0, 1] : [9, 13, 17, 23, 28, 34, 36, 5]
  const previewWidth = 480
  const previewHeight = 270
  const checker = await sharp({
    create: { width: previewWidth, height: previewHeight, channels: 3, background: '#777b80' },
  }).composite(Array.from({ length: 15 * 9 }, (_, i) => {
    const x = (i % 15) * 32
    const y = Math.floor(i / 15) * 32
    return ((i % 15) + Math.floor(i / 15)) % 2 ? null : {
      input: Buffer.from(`<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="#f4f5f6"/></svg>`),
      left: x,
      top: y,
    }
  }).filter(Boolean)).png().toBuffer()

  const previewColumns = 3
  const previewRows = 3
  const previewComposites = []
  const previewInputs = [...previewFrames.map(index => processed[index]), frontPng]
  for (let index = 0; index < previewInputs.length; index += 1) {
    const left = (index % previewColumns) * previewWidth
    const top = Math.floor(index / previewColumns) * previewHeight
    const previewFrame = await sharp(previewInputs[index])
      .resize(previewWidth, previewHeight, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer()
    previewComposites.push({ input: checker, left, top })
    previewComposites.push({ input: previewFrame, left, top })
  }
  await sharp({
    create: { width: previewWidth * previewColumns, height: previewHeight * previewRows, channels: 3, background: '#fff' },
  }).composite(previewComposites).png().toFile(path.join(OUTPUT_DIR, 'alpha-preview.png'))

  fs.writeFileSync(path.join(OUTPUT_DIR, 'matte-report.json'), JSON.stringify({
    algorithm: 'native-resolution edge-connected matte, largest-subject isolation, narrow 2px antialiasing, background-color unmix, and 1080p edge-aware enhancement',
    frameSize: [FRAME_WIDTH, FRAME_HEIGHT],
    spriteGrid: [COLUMNS, ROWS],
    frontFrame: FRONT_SOURCE_FRAME,
    sourceFrames: SOURCE_FRAMES,
    reports,
  }, null, 2))

  console.log(JSON.stringify({
    sprite: path.join(OUTPUT_DIR, 'sprite.webp'),
    frameFront: path.join(OUTPUT_DIR, 'frame_front.webp'),
    alphaPreview: path.join(OUTPUT_DIR, 'alpha-preview.png'),
    frontFrame: FRONT_SOURCE_FRAME,
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
