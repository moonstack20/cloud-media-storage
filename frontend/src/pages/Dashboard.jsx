import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as filesApi from '../api/files'
import VersionHistoryModal from '../components/VersionHistoryModal'

function formatBytes(bytes) {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [starredOnly, setStarredOnly] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [historyFile, setHistoryFile] = useState(null)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (query) params.q = query
      if (starredOnly) params.starred = true
      const res = query || starredOnly
        ? await filesApi.searchFiles(params)
        : await filesApi.listFiles()
      setFiles(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [query, starredOnly])

  useEffect(() => {
    const timeout = setTimeout(loadFiles, 300)
    return () => clearTimeout(timeout)
  }, [loadFiles])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      await filesApi.uploadFile(file)
      await loadFiles()
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleStar = async (file) => {
    setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, starred: !f.starred } : f))
    try {
      await filesApi.toggleStar(file.id, !file.starred)
    } catch (err) {
      console.error(err)
      loadFiles()
    }
  }

  const handleDownload = async (file) => {
    try {
      const res = await filesApi.downloadFile(file.id)
      window.open(res.data.download_url, '_blank')
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (file) => {
    if (!confirm(`Delete "${file.file_name}"? This cannot be undone.`)) return
    try {
      await filesApi.deleteFile(file.id)
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-[#EAE3D0]">
      <header className="border-b border-[#1B2A41]/15 bg-[#F7F4EA] px-8 py-5 flex justify-between items-center">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-[#B08D57] uppercase mb-1">Vault</p>
          <h1 className="font-[var(--font-display)] text-2xl text-[#1B2A41]">
            {user?.full_name || user?.email}'s Archive
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <Link
            to="/trash"
            className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60 hover:text-[#1B2A41] transition-colors"
          >
            Trash
          </Link>
          <button
            onClick={logout}
            className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60 hover:text-[#A63D40] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="px-8 py-8 max-w-6xl mx-auto">
        <div className="flex gap-4 items-center mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search files by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#F7F4EA] border border-[#1B2A41]/20 rounded-sm px-4 py-2.5 text-[#1B2A41] placeholder:text-[#1B2A41]/40 outline-none focus:border-[#B08D57] transition-colors"
            />
          </div>

          <button
            onClick={() => setStarredOnly((s) => !s)}
            className={`font-mono text-xs uppercase tracking-wide px-4 py-2.5 rounded-sm border transition-colors ${
              starredOnly
                ? 'bg-[#B08D57] border-[#B08D57] text-[#F7F4EA]'
                : 'bg-[#F7F4EA] border-[#1B2A41]/20 text-[#1B2A41]/70 hover:border-[#B08D57]'
            }`}
          >
            ★ Starred
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-[#1B2A41] text-[#EAE3D0] font-medium px-5 py-2.5 rounded-sm hover:bg-[#243a58] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {uploading ? 'Uploading…' : '+ Upload file'}
          </button>
          <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" />
        </div>

        {loading ? (
          <p className="font-mono text-sm text-[#1B2A41]/50 text-center py-16">Loading archive…</p>
        ) : files.length === 0 ? (
          <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm p-16 text-center">
            <p className="font-[var(--font-display)] text-xl text-[#1B2A41]/70 mb-2">
              {query || starredOnly ? 'Nothing matches.' : 'The archive is empty.'}
            </p>
            <p className="text-sm text-[#1B2A41]/50">
              {query || starredOnly ? 'Try a different search.' : 'Upload your first file to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm p-4 hover:shadow-[3px_3px_0_0_rgba(27,42,65,0.08)] transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <p className="font-medium text-[#1B2A41] truncate pr-2" title={file.file_name}>
                    {file.file_name}
                  </p>
                  <button
                    onClick={() => handleStar(file)}
                    className={`shrink-0 text-lg leading-none ${file.starred ? 'text-[#B08D57]' : 'text-[#1B2A41]/25 hover:text-[#B08D57]/60'}`}
                  >
                    ★
                  </button>
                </div>
                <div className="font-mono text-[11px] text-[#1B2A41]/50 mb-4 space-y-0.5">
                  <p>{formatBytes(file.file_size)} · {file.mime_type || 'unknown'}</p>
                  <p>{formatDate(file.created_at)}</p>
                </div>
                <div className="flex gap-3 font-mono text-[11px] uppercase tracking-wide">
                  <button onClick={() => handleDownload(file)} className="text-[#1B2A41]/70 hover:text-[#1B2A41]">
                    Download
                  </button>
                  <button onClick={() => setHistoryFile(file)} className="text-[#B08D57] hover:text-[#8f7143]">
                    History
                  </button>
                  <button onClick={() => handleDelete(file)} className="text-[#A63D40]/70 hover:text-[#A63D40]">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {historyFile && (
        <VersionHistoryModal
          file={historyFile}
          onClose={() => setHistoryFile(null)}
          onRestored={loadFiles}
        />
      )}
    </div>
  )
}
