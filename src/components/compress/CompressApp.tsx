'use client'

// Vortex Compress - Crear y extraer ZIP directamente en el navegador.
// Motor fflate local, 100% sin servidor: tus archivos nunca salen de tu equipo.

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Archive,
  FileArchive,
  FolderOpen,
  PackageOpen,
  Plus,
  Trash2,
  Download,
  Check,
  FileWarning,
  Files,
  Minimize2,
  Maximize2,
} from 'lucide-react'
import { blobFor, buildZip, downloadBlob, fmtBytes, readZip, type ZipEntry } from '@/lib/compress'

const SUPPORT_EMAIL = 'vortexmusic.soporte.app@gmail.com'
const ACCENT = '#f59e0b'
const ACCENT2 = '#fbbf24'

function VortexLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="10" fill="#161616" />
      <circle cx="24" cy="24" r="17" fill="none" stroke={ACCENT} strokeWidth="3.5" />
      <path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke={ACCENT2} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke={ACCENT2} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3" fill={ACCENT2} />
    </svg>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-[#2b2b31] bg-[#141416] px-6 py-4">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-1 text-center">
        <p className="text-[11px] text-[#9b9ba4]">
          Vórtex Compress · Derechos Reservados © 2026 Vortex Company ·{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#fbbf24] hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-[11px] text-[#9b9ba4]">Gratis · Sin anuncios · 100% local en tu navegador</p>
      </div>
    </footer>
  )
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2b2b31] bg-[#1e1e22] px-3 py-2 text-xs font-medium text-[#ececf1] hover:bg-[#26262b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

const btnAccent =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#0f0f10] transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#f59e0b] hover:bg-[#fbbf24]'

type Tab = 'make' | 'extract'

interface AddedFile {
  path: string
  file: File
}

export default function CompressApp() {
  const [tab, setTab] = useState<Tab>('make')

  // ----- crear ZIP -----
  const [files, setFiles] = useState<AddedFile[]>([])
  const [level, setLevel] = useState(6)
  const [zipName, setZipName] = useState('vortex-comprimido')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<{ name: string; size: number; raw: number } | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const dirRef = useRef<HTMLInputElement>(null)

  const totalRaw = useMemo(() => files.reduce((s, f) => s + f.file.size, 0), [files])

  const addFiles = useCallback((fl: FileList | null, prefix = '') => {
    if (!fl) return
    const items: AddedFile[] = []
    for (const f of Array.from(fl)) {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath
      const path = rel && rel.length > 0 ? rel : prefix + f.name
      items.push({ path, file: f })
    }
    setFiles((prev) => {
      const seen = new Set(prev.map((p) => p.path))
      const fresh = items.filter((i) => !seen.has(i.path))
      return [...prev, ...fresh]
    })
    setResult(null)
    setError('')
  }, [])

  const createZip = useCallback(async () => {
    if (!files.length) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const out = await buildZip(files, level, (done, total) => setProgress({ done, total }))
      const name = (zipName.trim() || 'vortex-comprimido') + '.zip'
      downloadBlob(name, new Blob([out.slice().buffer as ArrayBuffer], { type: 'application/zip' }))
      setResult({ name, size: out.length, raw: totalRaw })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude crear el ZIP')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }, [files, level, zipName, totalRaw])

  // ----- extraer ZIP -----
  const [archive, setArchive] = useState<{ name: string; size: number } | null>(null)
  const [entries, setEntries] = useState<ZipEntry[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exBusy, setExBusy] = useState(false)
  const [exMsg, setExMsg] = useState('')
  const zipRef = useRef<HTMLInputElement>(null)

  const openZip = useCallback(async (f: File | null) => {
    if (!f) return
    setExMsg('')
    setEntries([])
    setSelected(new Set())
    setArchive({ name: f.name, size: f.size })
    setExBusy(true)
    try {
      const list = await readZip(f)
      setEntries(list)
      setSelected(new Set(list.map((e) => e.path)))
      if (!list.length) setExMsg('El ZIP no contiene archivos con rutas válidas.')
    } catch {
      setArchive(null)
      setExMsg('No pude leer ese archivo: ¿seguro que es un ZIP válido?')
    } finally {
      setExBusy(false)
    }
  }, [])

  const extract = useCallback(async () => {
    if (!entries.length) return
    setExBusy(true)
    setExMsg('')
    try {
      const chosen = entries.filter((e) => selected.has(e.path))
      for (let i = 0; i < chosen.length; i++) {
        downloadBlob(chosen[i].path.split('/').pop() || chosen[i].path, blobFor(chosen[i]))
        if (i % 5 === 4) await new Promise((r) => setTimeout(r, 120))
      }
      setExMsg(`Listo: ${chosen.length} archivo(s) descargado(s).`)
    } catch {
      setExMsg('Hubo un problema al extraer.')
    } finally {
      setExBusy(false)
    }
  }, [entries, selected])

  const selectedSize = useMemo(
    () => entries.filter((e) => selected.has(e.path)).reduce((s, e) => s + e.data.length, 0),
    [entries, selected]
  )

  const ratio = result && result.raw > 0 ? Math.round((1 - result.size / result.raw) * 100) : null

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#2b2b31] bg-[#141416] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <VortexLogo className="w-9 h-9" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">
              Vórtex Compress <span className="font-normal text-[#9b9ba4]">· ZIPs en tu navegador, sin límites</span>
            </h1>
            <p className="text-[11px] text-[#9b9ba4]">Crea y extrae ZIP con nivel de compresión ajustable · nada se sube a internet</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {/* pestañas */}
        <div className="mb-4 flex gap-1 rounded-xl border border-[#2b2b31] bg-[#17171a] p-1">
          {(
            [
              { id: 'make', label: 'Crear ZIP', icon: FileArchive },
              { id: 'extract', label: 'Extraer ZIP', icon: PackageOpen },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                tab === t.id ? 'bg-[#26262b] text-[#ececf1]' : 'text-[#9b9ba4] hover:text-[#ececf1]'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'make' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
                <Plus className="h-3.5 w-3.5" /> Agregar archivos o carpetas
              </p>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = '' }} />
              <input
                ref={dirRef}
                type="file"
                hidden
                multiple
                // @ts-expect-error atributo no estándar para elegir carpetas completas
                webkitdirectory="true"
                onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = '' }}
              />
              <div className="flex flex-wrap gap-2">
                <button className={btnAccent} onClick={() => fileRef.current?.click()}>
                  <Files className="h-3.5 w-3.5" /> Archivos
                </button>
                <button className={btn} onClick={() => dirRef.current?.click()}>
                  <FolderOpen className="h-3.5 w-3.5" /> Carpeta completa
                </button>
                {files.length > 0 && (
                  <button className={btn} onClick={() => { setFiles([]); setResult(null) }}>
                    <Trash2 className="h-3.5 w-3.5" /> Vaciar lista
                  </button>
                )}
              </div>

              {files.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs text-[#9b9ba4]">
                    {files.length} elemento(s) · {fmtBytes(totalRaw)} en total
                  </p>
                  <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-[#2b2b31] bg-[#0f0f10] p-2">
                    {files.map((f) => (
                      <div key={f.path} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#1e1e22]">
                        <Archive className="h-3.5 w-3.5 shrink-0 text-[#fbbf24]" />
                        <span className="min-w-0 flex-1 truncate text-xs" title={f.path}>{f.path}</span>
                        <span className="shrink-0 text-[11px] text-[#9b9ba4]">{fmtBytes(f.file.size)}</span>
                        <button
                          className="shrink-0 text-[#9b9ba4] hover:text-[#f87171]"
                          title="Quitar"
                          onClick={() => setFiles((prev) => prev.filter((p) => p.path !== f.path))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
                <Minimize2 className="h-3.5 w-3.5" /> Compresión
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs text-[#9b9ba4]">
                  Nivel (0 = guardar, 9 = máximo): <span className="font-mono text-[#ececf1]">{level}</span>
                  <input type="range" min={0} max={9} value={level} onChange={(e) => setLevel(parseInt(e.target.value, 10))} className="mt-1.5 w-full" />
                </label>
                <label className="text-xs text-[#9b9ba4]">
                  Nombre del ZIP
                  <div className="mt-1.5 flex items-center rounded-xl border border-[#2b2b31] bg-[#0f0f10] px-3 py-2">
                    <input
                      value={zipName}
                      onChange={(e) => setZipName(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                      placeholder="vortex-comprimido"
                    />
                    <span className="text-xs text-[#9b9ba4]">.zip</span>
                  </div>
                </label>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button className={btnAccent} onClick={createZip} disabled={!files.length || busy}>
                  <FileArchive className="h-3.5 w-3.5" /> {busy ? 'Comprimiendo…' : 'Crear y descargar ZIP'}
                </button>
                {progress && (
                  <span className="text-xs text-[#9b9ba4]">
                    {progress.done}/{progress.total} leídos
                  </span>
                )}
              </div>
              {result && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#2b2b31] bg-[#0f0f10] px-3 py-2.5 text-xs">
                  <Check className="h-4 w-4 text-[#22c55e]" />
                  <span className="text-[#ececf1]">{result.name}</span>
                  <span className="text-[#9b9ba4]">
                    {fmtBytes(result.raw)} → {fmtBytes(result.size)}
                  </span>
                  {ratio !== null && ratio > 0 && (
                    <span className="font-semibold text-[#22c55e]">−{ratio}%</span>
                  )}
                </div>
              )}
              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#7f1d1d] bg-[#1a1214] px-3 py-2.5 text-xs text-[#f87171]">
                  <FileWarning className="h-4 w-4" /> {error}
                </div>
              )}
              <p className="mt-3 text-[11px] text-[#9b9ba4]">
                Formato ZIP estándar (compatible con Windows, macOS, Linux, Android e iOS). Imágenes y vídeos ya
                comprimidos no se reducen mucho: prueba el nivel 0 para ir más rápido.
              </p>
            </div>
          </div>
        )}

        {tab === 'extract' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
                <PackageOpen className="h-3.5 w-3.5" /> Abrir un ZIP
              </p>
              <input ref={zipRef} type="file" accept=".zip,application/zip" hidden onChange={(e) => { void openZip(e.target.files?.[0] ?? null); e.currentTarget.value = '' }} />
              <button className={btnAccent} onClick={() => zipRef.current?.click()}>
                <FolderOpen className="h-3.5 w-3.5" /> Elegir archivo .zip
              </button>
              {archive && (
                <p className="mt-3 text-xs text-[#9b9ba4]">
                  {archive.name} · {fmtBytes(archive.size)} · {entries.length} archivo(s)
                </p>
              )}
              {exMsg && <p className="mt-3 text-xs text-[#fbbf24]">{exMsg}</p>}
            </div>

            {entries.length > 0 && (
              <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
                    <Files className="h-3.5 w-3.5" /> Contenido · {selected.size}/{entries.length} marcados · {fmtBytes(selectedSize)}
                  </p>
                  <div className="flex gap-2">
                    <button className={btn} onClick={() => setSelected(new Set(entries.map((e) => e.path)))}>
                      <Maximize2 className="h-3.5 w-3.5" /> Todos
                    </button>
                    <button className={btn} onClick={() => setSelected(new Set())}>
                      <Minimize2 className="h-3.5 w-3.5" /> Ninguno
                    </button>
                  </div>
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-[#2b2b31] bg-[#0f0f10] p-2">
                  {entries.map((e) => (
                    <label key={e.path} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#1e1e22]">
                      <input
                        type="checkbox"
                        checked={selected.has(e.path)}
                        onChange={(ev) =>
                          setSelected((prev) => {
                            const next = new Set(prev)
                            if (ev.target.checked) next.add(e.path)
                            else next.delete(e.path)
                            return next
                          })
                        }
                        className="accent-[#f59e0b]"
                      />
                      <span className="min-w-0 flex-1 truncate text-xs" title={e.path}>{e.path}</span>
                      <span className="shrink-0 text-[11px] text-[#9b9ba4]">{fmtBytes(e.data.length)}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button className={btnAccent} onClick={extract} disabled={!selected.size || exBusy}>
                    <Download className="h-3.5 w-3.5" /> {exBusy ? 'Extrayendo…' : `Extraer ${selected.size || ''}`}
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-[#9b9ba4]">
                  Rutas absolutas y entradas con <code className="font-mono">..</code> se descartan por seguridad (zip-slip).
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
                <FileWarning className="h-3.5 w-3.5" /> Sobre RAR y 7z
              </p>
              <p className="text-xs leading-relaxed text-[#9b9ba4]">
                Vórtex Compress trabaja con ZIP, el formato abierto universal. RAR es un formato propietario y 7z usa
                métodos que los navegadores no traen de fábrica: para esos, usa la app de escritorio de confianza.
                Lo que aquí extraes o creas jamás sale de tu equipo.
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
