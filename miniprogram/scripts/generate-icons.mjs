#!/usr/bin/env node
/**
 * Generate minimal solid-color tab bar PNG icons (no dependencies).
 */
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../assets/icons')

const icons = ['home', 'calendar', 'bookings', 'profile']
const size = 40

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function pngBuffer(r, g, b) {
  const row = Buffer.alloc(1 + size * 3)
  const raw = Buffer.alloc((1 + size * 3) * size)
  for (let y = 0; y < size; y++) {
    const offset = y * (1 + size * 3)
    raw[offset] = 0
    for (let x = 0; x < size; x++) {
      const i = offset + 1 + x * 3
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
    }
  }
  const compressed = zlib.deflateSync(raw)

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const typeBuf = Buffer.from(type)
    const crcData = Buffer.concat([typeBuf, data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(crcData), 0)
    return Buffer.concat([len, typeBuf, data, crc])
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
  }
  return (c ^ 0xffffffff) >>> 0
}

function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const [ir, ig, ib] = hexToRgb('#6B7C75')
  const [ar, ag, ab] = hexToRgb('#0B3D2E')
  for (const name of icons) {
    fs.writeFileSync(path.join(outDir, `${name}.png`), pngBuffer(ir, ig, ib))
    fs.writeFileSync(path.join(outDir, `${name}-active.png`), pngBuffer(ar, ag, ab))
  }
  console.log('Icons written to', outDir)
}

main()
