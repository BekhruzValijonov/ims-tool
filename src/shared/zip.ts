/**
 * Архив ZIP без сжатия.
 *
 * Нужен ровно для одного: книга Excel — это zip с несколькими файлами XML.
 * Брать ради этого библиотеку значило бы тащить в сборку архиватор целиком,
 * поэтому здесь записаны только заголовки формата, а данные кладутся как есть.
 * Отчёт в сотню строк — это десяток килобайт XML, сжимать там нечего.
 */

export interface ZipEntry {
  readonly name: string
  readonly data: Uint8Array
}

const TABLE = buildCrcTable()

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
}

export function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (const byte of data) crc = TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

/** Собирает архив: локальные заголовки, центральный каталог и его хвост. */
export function zip(entries: readonly ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const locals: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const sum = crc32(entry.data)

    const local = new Uint8Array(30 + name.length + entry.data.length)
    const head = new DataView(local.buffer)
    head.setUint32(0, 0x04034B50, true)
    head.setUint16(4, 20, true) // версия, нужная для распаковки
    head.setUint16(6, 0x0800, true) // имена в UTF-8
    head.setUint16(8, 0, true) // без сжатия
    head.setUint32(14, sum, true)
    head.setUint32(18, entry.data.length, true)
    head.setUint32(22, entry.data.length, true)
    head.setUint16(26, name.length, true)
    local.set(name, 30)
    local.set(entry.data, 30 + name.length)
    locals.push(local)

    const record = new Uint8Array(46 + name.length)
    const meta = new DataView(record.buffer)
    meta.setUint32(0, 0x02014B50, true)
    meta.setUint16(4, 20, true)
    meta.setUint16(6, 20, true)
    meta.setUint16(8, 0x0800, true)
    meta.setUint16(10, 0, true)
    meta.setUint32(16, sum, true)
    meta.setUint32(20, entry.data.length, true)
    meta.setUint32(24, entry.data.length, true)
    meta.setUint16(28, name.length, true)
    meta.setUint32(42, offset, true)
    record.set(name, 46)
    central.push(record)

    offset += local.length
  }

  const directorySize = central.reduce((sum, record) => sum + record.length, 0)
  const tail = new Uint8Array(22)
  const end = new DataView(tail.buffer)
  end.setUint32(0, 0x06054B50, true)
  end.setUint16(8, entries.length, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, directorySize, true)
  end.setUint32(16, offset, true)

  const parts = [...locals, ...central, tail]
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const archive = new Uint8Array(total)
  let cursor = 0
  for (const part of parts) {
    archive.set(part, cursor)
    cursor += part.length
  }
  return archive
}
