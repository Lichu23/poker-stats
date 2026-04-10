'use client'

import { useRef, useState, useCallback, useTransition, useEffect } from 'react'
import { uploadHandHistory, getUploadStatus } from '@/app/actions/upload'

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'

interface StatusState {
  status: UploadStatus
  uploadId: string | null
  handsParsed: number
  error: string | null
  filename: string | null
}

export default function UploadZone() {
  const [state, setState] = useState<StatusState>({
    status: 'idle', uploadId: null, handsParsed: 0, error: null, filename: null,
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll for status while processing
  useEffect(() => {
    if (state.status !== 'processing' || !state.uploadId) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }

    pollRef.current = setInterval(async () => {
      const result = await getUploadStatus(state.uploadId!)
      if (!result) return

      if (result.status === 'completed') {
        setState(s => ({ ...s, status: 'completed', handsParsed: result.handsParsed, error: result.errorMessage }))
        clearInterval(pollRef.current!)
      } else if (result.status === 'failed') {
        setState(s => ({ ...s, status: 'failed', error: result.errorMessage }))
        clearInterval(pollRef.current!)
      }
    }, 2000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [state.status, state.uploadId])

  const submit = useCallback((file: File) => {
    if (!file) return
    setState({ status: 'uploading', uploadId: null, handsParsed: 0, error: null, filename: file.name })

    startTransition(async () => {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadHandHistory(fd)

      if ('error' in result) {
        setState(s => ({ ...s, status: 'failed', error: result.error }))
      } else {
        setState(s => ({ ...s, status: 'processing', uploadId: result.uploadId }))
      }
    })
  }, [])

  const handleFiles = useCallback((files: FileList | null) => {
    const file = files?.[0]
    if (file) submit(file)
  }, [submit])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)

  const reset = () => {
    setState({ status: 'idle', uploadId: null, handsParsed: 0, error: null, filename: null })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Completed ────────────────────────────────────────────────────────────────
  if (state.status === 'completed') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-3xl">
          ✓
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg">{state.handsParsed.toLocaleString()} hands imported</p>
          {state.error && (
            <p className="text-zinc-400 text-sm mt-1">{state.error}</p>
          )}
          <p className="text-zinc-500 text-sm mt-1">{state.filename}</p>
        </div>
        <button
          onClick={reset}
          className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-5 py-3 text-sm font-medium text-white transition"
        >
          Upload another file
        </button>
      </div>
    )
  }

  // ── Failed ───────────────────────────────────────────────────────────────────
  if (state.status === 'failed') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-3xl">
          ✕
        </div>
        <div className="text-center">
          <p className="text-white font-semibold">Upload failed</p>
          <p className="text-red-400 text-sm mt-1">{state.error ?? 'Something went wrong'}</p>
        </div>
        <button
          onClick={reset}
          className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-5 py-3 text-sm font-medium text-white transition"
        >
          Try again
        </button>
      </div>
    )
  }

  // ── Uploading / Processing ───────────────────────────────────────────────────
  if (state.status === 'uploading' || state.status === 'processing') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
        <div className="text-center">
          <p className="text-white font-semibold">
            {state.status === 'uploading' ? 'Uploading…' : 'Parsing hands…'}
          </p>
          {state.filename && (
            <p className="text-zinc-400 text-sm mt-1 truncate max-w-xs">{state.filename}</p>
          )}
          {state.status === 'processing' && (
            <p className="text-zinc-500 text-xs mt-2">This may take a moment for large files</p>
          )}
        </div>
      </div>
    )
  }

  // ── Idle: drop zone ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'w-full rounded-2xl border-2 border-dashed px-6 py-12 flex flex-col items-center gap-3 transition',
          isDragging
            ? 'border-green-500 bg-green-500/10'
            : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
        ].join(' ')}
      >
        <span className="text-4xl">📂</span>
        <p className="text-white font-semibold text-base">Drop your hand history here</p>
        <p className="text-zinc-400 text-sm">or tap to browse</p>
        <p className="text-zinc-500 text-xs mt-1">.txt file · max 50 MB</p>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
        <p className="text-xs text-zinc-500 leading-relaxed">
          Export from PokerStars: <span className="text-zinc-300">More → Hand History → Export</span>
        </p>
      </div>
    </div>
  )
}
