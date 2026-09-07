const sharp = require('sharp')

async function main() {
  const { data, info } = await sharp(process.argv[2]).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const points = process.argv.slice(3).map(value => value.split(',').map(Number))
  const pixel = (x, y) => {
    const offset = (y * info.width + x) * info.channels
    return Array.from(data.subarray(offset, offset + 3))
  }
  console.log({ width: info.width, height: info.height })
  for (const [x, y] of points) console.log(`${x},${y}`, pixel(x, y))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
