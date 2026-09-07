const sharp = require('sharp')

const REFERENCE = process.argv[2]
const TARGET = process.argv[3]
const WIDTH = 160
const HEIGHT = 90

const gradient = pixels => {
  const output = new Float32Array(WIDTH * HEIGHT)
  for (let y = 1; y < HEIGHT - 1; y += 1) {
    for (let x = 1; x < WIDTH - 1; x += 1) {
      const index = y * WIDTH + x
      const gx = pixels[index + 1] - pixels[index - 1]
      const gy = pixels[index + WIDTH] - pixels[index - WIDTH]
      output[index] = Math.min(255, Math.hypot(gx, gy))
    }
  }
  return output
}

const sample = (data, x, y) => {
  if (x < 0 || y < 0 || x >= WIDTH - 1 || y >= HEIGHT - 1) return 0
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const dx = x - x0
  const dy = y - y0
  const top = data[y0 * WIDTH + x0] * (1 - dx) + data[y0 * WIDTH + x0 + 1] * dx
  const bottom = data[(y0 + 1) * WIDTH + x0] * (1 - dx) + data[(y0 + 1) * WIDTH + x0 + 1] * dx
  return top * (1 - dy) + bottom * dy
}

async function load(file) {
  const { data } = await sharp(file).resize(WIDTH, HEIGHT, { fit: 'fill' }).grayscale().raw().toBuffer({ resolveWithObject: true })
  return gradient(data)
}

const score = (reference, target, scale, tx, ty) => {
  let error = 0
  let weight = 0
  for (let y = 2; y < HEIGHT - 2; y += 1) {
    for (let x = 2; x < WIDTH - 2; x += 1) {
      const targetValue = target[y * WIDTH + x]
      const refValue = sample(reference, (x - tx) / scale, (y - ty) / scale)
      const localWeight = Math.min(1, Math.max(targetValue, refValue) / 22)
      if (localWeight < 0.08) continue
      const difference = targetValue - refValue
      error += difference * difference * localWeight
      weight += localWeight
    }
  }
  return error / Math.max(1, weight)
}

async function main() {
  const [reference, target] = await Promise.all([load(REFERENCE), load(TARGET)])
  let best = { score: Number.POSITIVE_INFINITY, scale: 1, tx: 0, ty: 0 }
  for (let scale = 0.84; scale <= 1.18; scale += 0.02) {
    for (let tx = -24; tx <= 24; tx += 2) {
      for (let ty = -14; ty <= 14; ty += 2) {
        const candidate = score(reference, target, scale, tx, ty)
        if (candidate < best.score) best = { score: candidate, scale, tx, ty }
      }
    }
  }
  const coarse = best
  for (let scale = coarse.scale - 0.025; scale <= coarse.scale + 0.025; scale += 0.005) {
    for (let tx = coarse.tx - 3; tx <= coarse.tx + 3; tx += 0.5) {
      for (let ty = coarse.ty - 3; ty <= coarse.ty + 3; ty += 0.5) {
        const candidate = score(reference, target, scale, tx, ty)
        if (candidate < best.score) best = { score: candidate, scale, tx, ty }
      }
    }
  }
  console.log(JSON.stringify({
    ...best,
    analysisSize: [WIDTH, HEIGHT],
    targetSize: [1280, 720],
    targetTransform: {
      scale: best.scale,
      translateX: best.tx * 8,
      translateY: best.ty * 8,
    },
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
