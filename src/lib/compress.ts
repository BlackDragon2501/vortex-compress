// Vortex Compress - Crear y extraer archivos ZIP con fflate.
// Todo corre en el navegador con Web Workers internos de fflate; sin backend.

import { zip, unzip, type Zippable } from 'fflate'

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** descarga un blob con nombre y limpia el objeto URL */
export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** entrada lista de un ZIP */
export interface ZipEntry {
  /** ruta relativa dentro del ZIP (sin slashe inicial ni '..') */
  path: string
  data: Uint8Array
}

/** seguridad zip-slip: descarta rutas absolutas o con salto de directorio */
function sanitizePath(p: string): string | null {
  const clean = p.replace(/\\/g, '/')
  if (!clean || clean.startsWith('/') || clean.endsWith('/')) return null
  const parts = clean.split('/')
  if (parts.some((s) => s === '..' || s === '')) return null
  return parts.join('/')
}

/** crea un ZIP a partir de archivos con rutas relativas (p. ej. carpeta/archivo.txt) */
export async function buildZip(
  files: { path: string; file: File }[],
  level: number,
  onProgress?: (done: number, total: number) => void
): Promise<Uint8Array> {
  const tree: Zippable = {}
  let done = 0
  for (const { path, file } of files) {
    const safe = sanitizePath(path)
    if (!safe) continue
    tree[safe] = [new Uint8Array(await file.arrayBuffer()), { level: Math.max(0, Math.min(9, level | 0)) }]
    done++
    onProgress?.(done, files.length)
  }
  return new Promise((resolve, reject) => {
    zip(tree, { level: Math.max(0, Math.min(9, level | 0)) }, (err, out) => {
      if (err) reject(err)
      else resolve(out)
    })
  })
}

/** lee todas las entradas de un ZIP (con rutas saneadas) */
export async function readZip(file: File): Promise<ZipEntry[]> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const out = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(buf, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
  const entries: ZipEntry[] = []
  for (const [raw, data] of Object.entries(out)) {
    const safe = sanitizePath(raw)
    if (safe) entries.push({ path: safe, data })
  }
  entries.sort((a, b) => a.path.localeCompare(b.path))
  return entries
}

/** convierte Uint8Array a Blob con tipo según extensión */
export function blobFor(entry: ZipEntry): Blob {
  const name = entry.path.toLowerCase()
  const types: Record<string, string> = {
    txt: 'text/plain', md: 'text/markdown', json: 'application/json', csv: 'text/csv',
    html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', bmp: 'image/bmp', ico: 'image/x-icon',
    pdf: 'application/pdf', zip: 'application/zip',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac',
    mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', mov: 'video/quicktime',
  }
  const ext = name.slice(name.lastIndexOf('.') + 1)
  const type = types[ext] ?? 'application/octet-stream'
  return new Blob([entry.data.slice().buffer as ArrayBuffer], { type })
}
