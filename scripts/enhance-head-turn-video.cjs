const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { chromium } = require('playwright')

const SOURCE = process.argv[2]
const OUTPUT = process.argv[3] || path.join(process.cwd(), 'head-turn-demo', 'enhanced-1080p.webm')
const FFMPEG = 'C:\\Users\\Lenovo\\AppData\\Local\\ms-playwright\\ffmpeg-1011\\ffmpeg-win64.exe'
const FPS = 30
const TARGET_WIDTH = Number(process.argv[4] || 1920)
const TARGET_HEIGHT = Math.round(TARGET_WIDTH * 9 / 16)
const SHARPEN_STRENGTH = Number(process.argv[5] || 0.34)
const REFERENCE = process.argv[6]
const BASELINE = process.argv[7]
const VIDEO_BITRATE = TARGET_WIDTH >= 3840 ? '26M' : TARGET_WIDTH >= 2560 ? '16M' : '10M'

if (!SOURCE || !fs.existsSync(SOURCE)) throw new Error(`Video source not found: ${SOURCE || '(missing)'}`)
if (!fs.existsSync(FFMPEG)) throw new Error(`FFmpeg not found: ${FFMPEG}`)
if (REFERENCE && !fs.existsSync(REFERENCE)) throw new Error(`Reference image not found: ${REFERENCE}`)
if (REFERENCE && (!BASELINE || !fs.existsSync(BASELINE))) throw new Error(`Baseline frame not found: ${BASELINE || '(missing)'}`)

const waitForDrain = stream => new Promise(resolve => stream.once('drain', resolve))

async function main() {
  const videoBuffer = fs.readFileSync(SOURCE)
  const referenceBuffer = REFERENCE ? fs.readFileSync(REFERENCE) : null
  const baselineBuffer = BASELINE ? fs.readFileSync(BASELINE) : null
  const server = http.createServer((request, response) => {
    if (request.url === '/reference.png' && referenceBuffer) {
      response.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': referenceBuffer.length })
      response.end(referenceBuffer)
      return
    }
    if (request.url === '/baseline.png' && baselineBuffer) {
      response.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': baselineBuffer.length })
      response.end(baselineBuffer)
      return
    }
    if (request.url === '/source.mp4') {
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
    response.end(`<!doctype html><video id="source" src="/source.mp4" muted playsinline preload="auto"></video>${REFERENCE ? '<img id="reference" src="/reference.png"><img id="baseline" src="/baseline.png">' : ''}<canvas id="output" width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}"></canvas>`)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })
  const page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load' })
  await page.waitForFunction(() => {
    const video = document.querySelector('#source')
    const images = [...document.querySelectorAll('img')]
    return video && video.readyState >= 2 && Number.isFinite(video.duration)
      && images.every(image => image.complete && image.naturalWidth > 0)
  })

  const metadata = await page.evaluate(config => {
    const video = document.querySelector('#source')
    const canvas = document.querySelector('#output')
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false })
    if (!gl) throw new Error('WebGL is unavailable')

    const compile = (type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
      return shader
    }
    const program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, `
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = vec2((position.x + 1.0) * 0.5, 1.0 - (position.y + 1.0) * 0.5);
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
      precision highp float;
      uniform sampler2D source;
      uniform sampler2D reference;
      uniform sampler2D baseline;
      uniform vec2 texel;
      uniform float useReference;
      varying vec2 uv;
      void main() {
        vec3 center = texture2D(source, uv).rgb;
        vec3 north = texture2D(source, uv + vec2(0.0, -texel.y)).rgb;
        vec3 south = texture2D(source, uv + vec2(0.0, texel.y)).rgb;
        vec3 west = texture2D(source, uv + vec2(-texel.x, 0.0)).rgb;
        vec3 east = texture2D(source, uv + vec2(texel.x, 0.0)).rgb;
        vec3 nw = texture2D(source, uv + vec2(-texel.x, -texel.y)).rgb;
        vec3 ne = texture2D(source, uv + vec2(texel.x, -texel.y)).rgb;
        vec3 sw = texture2D(source, uv + vec2(-texel.x, texel.y)).rgb;
        vec3 se = texture2D(source, uv + vec2(texel.x, texel.y)).rgb;
        vec3 localMean = (center + north + south + west + east + nw + ne + sw + se) / 9.0;
        vec3 mediumMean = (
          texture2D(source, uv + vec2(0.0, -texel.y * 2.0)).rgb
          + texture2D(source, uv + vec2(0.0, texel.y * 2.0)).rgb
          + texture2D(source, uv + vec2(-texel.x * 2.0, 0.0)).rgb
          + texture2D(source, uv + vec2(texel.x * 2.0, 0.0)).rgb
        ) * 0.25;
        vec3 edge = center - localMean;
        vec3 mediumEdge = center - mediumMean;
        float edgeLuma = dot(abs(edge), vec3(0.2126, 0.7152, 0.0722));
        float mediumLuma = dot(abs(mediumEdge), vec3(0.2126, 0.7152, 0.0722));
        float gate = smoothstep(0.016, 0.085, edgeLuma);
        float mediumGate = smoothstep(0.025, 0.12, mediumLuma);
        vec3 denoised = mix(localMean, center, 0.74 + 0.24 * gate);
        vec3 enhanced = denoised
          + edge * (${config.sharpen.toFixed(4)} * gate)
          + mediumEdge * (0.18 * mediumGate);
        vec3 localMin = min(center, min(min(north, south), min(west, east))) - 0.018;
        vec3 localMax = max(center, max(max(north, south), max(west, east))) + 0.018;
        enhanced = clamp(enhanced, localMin, localMax);
        enhanced = (enhanced - 0.5) * 1.032 + 0.5;
        if (useReference > 0.5) {
          vec3 base = texture2D(baseline, uv).rgb;
          vec2 refUv = (uv - vec2(-0.05, -0.044444)) / 1.145;
          vec3 cleanReference = texture2D(reference, refUv).rgb;
          float motion = distance(center, base);
          motion = max(motion, distance(north, texture2D(baseline, uv + vec2(0.0, -texel.y)).rgb));
          motion = max(motion, distance(south, texture2D(baseline, uv + vec2(0.0, texel.y)).rgb));
          motion = max(motion, distance(west, texture2D(baseline, uv + vec2(-texel.x, 0.0)).rgb));
          motion = max(motion, distance(east, texture2D(baseline, uv + vec2(texel.x, 0.0)).rgb));
          float staticConfidence = 1.0 - smoothstep(0.018, 0.105, motion);
          vec2 headSpace = (uv - vec2(0.615, 0.34)) / vec2(0.26, 0.34);
          float headRegion = 1.0 - smoothstep(0.82, 1.08, length(headSpace));
          // Use the clean source decisively in stable regions. A broad partial
          // blend creates double edges when the generated video geometry is a
          // few pixels away from the still; the head therefore requires an
          // almost exact match before any source pixels are used.
          float stableBody = smoothstep(0.82, 0.94, staticConfidence);
          float stableHead = smoothstep(0.995, 0.999, staticConfidence);
          float referenceWeight = mix(stableBody, stableHead, headRegion);
          enhanced = mix(enhanced, cleanReference, referenceWeight);
        }
        gl_FragColor = vec4(clamp(enhanced, 0.0, 1.0), 1.0);
      }
    `))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.uniform2f(gl.getUniformLocation(program, 'texel'), 1 / video.videoWidth, 1 / video.videoHeight)
    gl.uniform1i(gl.getUniformLocation(program, 'source'), 0)
    gl.uniform1f(gl.getUniformLocation(program, 'useReference'), config.useReference ? 1 : 0)

    if (config.useReference) {
      const createStillTexture = (unit, uniformName, image) => {
        const stillTexture = gl.createTexture()
        gl.activeTexture(unit)
        gl.bindTexture(gl.TEXTURE_2D, stillTexture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
        gl.uniform1i(gl.getUniformLocation(program, uniformName), unit - gl.TEXTURE0)
      }
      createStillTexture(gl.TEXTURE1, 'reference', document.querySelector('#reference'))
      createStillTexture(gl.TEXTURE2, 'baseline', document.querySelector('#baseline'))
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture)
    }

    window.renderEnhancedFrame = async requestedTime => {
      const target = Math.min(Math.max(0, requestedTime), Math.max(0, video.duration - 0.001))
      if (Math.abs(video.currentTime - target) > 0.0005) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error(`Seek timed out at ${target}`)), 5000)
          video.addEventListener('seeked', () => {
            clearTimeout(timer)
            resolve()
          }, { once: true })
          video.currentTime = target
        })
      }
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      gl.finish()
      return canvas.toDataURL('image/jpeg', 0.995)
    }
    return { duration: video.duration, width: video.videoWidth, height: video.videoHeight }
  }, { sharpen: SHARPEN_STRENGTH, useReference: Boolean(REFERENCE) })

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
  const encoder = spawn(FFMPEG, [
    '-hide_banner', '-loglevel', 'warning',
    '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', String(FPS), '-i', 'pipe:0',
    '-an', '-c:v', 'libvpx', '-b:v', VIDEO_BITRATE, '-crf', '6',
    '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p',
    '-y', OUTPUT,
  ], { stdio: ['pipe', 'ignore', 'pipe'] })
  let encoderError = ''
  encoder.stderr.on('data', chunk => { encoderError += chunk.toString() })
  encoder.stdin.on('error', error => { encoderError += `\nstdin: ${error.message}` })

  const frameCount = Math.ceil(metadata.duration * FPS)
  for (let index = 0; index < frameCount; index += 1) {
    const time = Math.min(index / FPS, metadata.duration - 0.001)
    const dataUrl = await page.evaluate(value => window.renderEnhancedFrame(value), time)
    const frame = Buffer.from(dataUrl.split(',')[1], 'base64')
    if (encoder.stdin.destroyed) throw new Error(`Video encoder closed early: ${encoderError}`)
    if (!encoder.stdin.write(frame)) await waitForDrain(encoder.stdin)
    if ((index + 1) % 30 === 0 || index === frameCount - 1) {
      console.log(`enhanced ${index + 1}/${frameCount} frames`)
    }
  }
  encoder.stdin.end()
  const exitCode = await new Promise((resolve, reject) => {
    encoder.once('error', reject)
    encoder.once('close', resolve)
  })
  if (exitCode !== 0) throw new Error(`Video encoder failed (${exitCode}): ${encoderError}`)

  await browser.close()
  await new Promise(resolve => server.close(resolve))
  console.log(JSON.stringify({
    output: OUTPUT,
    source: [metadata.width, metadata.height],
    outputSize: [TARGET_WIDTH, TARGET_HEIGHT],
    sharpenStrength: SHARPEN_STRENGTH,
    referenceGuided: Boolean(REFERENCE),
    duration: metadata.duration,
    fps: FPS,
    frames: frameCount,
    mimeType: 'video/webm;codecs=vp8',
    bytes: fs.statSync(OUTPUT).size,
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
