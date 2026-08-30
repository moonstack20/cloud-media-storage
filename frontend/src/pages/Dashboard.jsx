import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as filesApi from '../api/files'
import * as foldersApi from '../api/folders'
import VersionHistoryModal from '../components/VersionHistoryModal'
import ShareModal from '../components/ShareModal'
import NotificationBell from '../components/NotificationBell'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const currentFolderId = searchParams.get('folder')

  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [starredOnly, setStarredOnly] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [uploadFolderId, setUploadFolderId] = useState(null)
  const [allFolders, setAllFolders] = useState([])
  const [newFolderName, setNewFolderName] = useState('')
  const [historyFile, setHistoryFile] = useState(null)
  const [shareTarget, setShareTarget] = useState(null)
  const fileInputRef = useRef(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [foldersRes, breadcrumbsRes, allFoldersRes] = await Promise.all([
        foldersApi.listFolders(currentFolderId),
        currentFolderId ? foldersApi.getBreadcrumbs(currentFolderId) : Promise.resolve({ data: [] }),
        foldersApi.listFolders(),
      ])
      setFolders(foldersRes.data)
      setBreadcrumbs(breadcrumbsRes.data)
      setAllFolders(allFoldersRes.data)

      const params = {}
      if (query) params.q = query
      if (starredOnly) params.starred = true
      const filesRes = query || starredOnly
        ? await filesApi.searchFiles(params)
        : await filesApi.listFiles()

      const filtered = query || starredOnly
        ? filesRes.data
        : filesRes.data.filter((f) => (f.folder_id || null) === currentFolderId)

      setFiles(filtered)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [currentFolderId, query, starredOnly])

  useEffect(() => {
    const timeout = setTimeout(loadData, 250)
    return () => clearTimeout(timeout)
  }, [loadData])

  const navigateToFolder = (folderId) => {
    if (folderId) setSearchParams({ folder: folderId })
    else setSearchParams({})
  }

  const handleCreateFolder = async (e) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    try {
      await foldersApi.createFolder(newFolderName.trim(), currentFolderId)
      setNewFolderName('')
      setCreatingFolder(false)
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await filesApi.uploadFile(file)
      const destination = uploadFolderId !== null ? uploadFolderId : currentFolderId
      if (destination) {
        await filesApi.moveFile(res.data.id, destination)
      }
      await loadData()
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
      loadData()
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

  const handleDeleteFolder = async (folder) => {
    if (!confirm(`Delete folder "${folder.name}"? Files inside will be moved to root.`)) return
    try {
      await foldersApi.deleteFolder(folder.id)
      loadData()
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
          <Link to="/shared" className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60 hover:text-[#1B2A41] transition-colors">
            Shared with me
          </Link>
          <NotificationBell />
          <Link to="/activity" className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60 hover:text-[#1B2A41] transition-colors">
            Activity
          </Link>
          <Link to="/trash" className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60 hover:text-[#1B2A41] transition-colors">
            Trash
          </Link>
          <button onClick={logout} className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60 hover:text-[#A63D40] transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="px-8 py-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-6 font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60">
          <button onClick={() => navigateToFolder(null)} className="hover:text-[#1B2A41]">
            Root
          </button>
          {breadcrumbs.map((b) => (
            <span key={b.id} className="flex items-center gap-2">
              <span>/</span>
              <button onClick={() => navigateToFolder(b.id)} className="hover:text-[#1B2A41]">
                {b.name}
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-4 items-center mb-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
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
            onClick={() => setCreatingFolder(true)}
            className="font-mono text-xs uppercase tracking-wide px-4 py-2.5 rounded-sm border border-[#1B2A41]/20 bg-[#F7F4EA] text-[#1B2A41]/70 hover:border-[#B08D57] transition-colors whitespace-nowrap"
          >
            + Folder
          </button>

          <select
            value={uploadFolderId || ''}
            onChange={(e) => setUploadFolderId(e.target.value || null)}
            className="font-mono text-xs uppercase tracking-wide px-3 py-2.5 rounded-sm border border-[#1B2A41]/20 bg-[#F7F4EA] text-[#1B2A41]/70 outline-none"
          >
            <option value="">Upload to: current folder</option>
            {allFolders.map((f) => (
              <option key={f.id} value={f.id}>Upload to: {f.name}</option>
            ))}
          </select>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-[#1B2A41] text-[#EAE3D0] font-medium px-5 py-2.5 rounded-sm hover:bg-[#243a58] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {uploading ? 'Uploading…' : '+ Upload file'}
          </button>
          <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" />
        </div>

        {creatingFolder && (
          <form onSubmit={handleCreateFolder} className="flex gap-3 mb-6 items-center">
            <input
              autoFocus
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="bg-[#F7F4EA] border border-[#B08D57] rounded-sm px-4 py-2 text-[#1B2A41] outline-none"
            />
            <button type="submit" className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]">Create</button>
            <button type="button" onClick={() => setCreatingFolder(false)} className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/50">Cancel</button>
          </form>
        )}

        {loading ? (
          <p className="font-mono text-sm text-[#1B2A41]/50 text-center py-16">Loading archive…</p>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm p-16 text-center">
            <p className="font-[var(--font-display)] text-xl text-[#1B2A41]/70 mb-2">
              {query || starredOnly ? 'Nothing matches.' : 'This folder is empty.'}
            </p>
            <p className="text-sm text-[#1B2A41]/50">
              {query || starredOnly ? 'Try a different search.' : 'Upload a file or create a folder to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => navigateToFolder(folder.id)}
                className="bg-[#F7F4EA] border border-[#B08D57]/40 rounded-sm p-4 cursor-pointer hover:shadow-[3px_3px_0_0_rgba(176,141,87,0.15)] transition-shadow flex justify-between items-center"
              >
                <p className="font-medium text-[#1B2A41] truncate flex items-center gap-2">
                  <span className="text-[#B08D57]">▸</span> {folder.name}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder) }}
                  className="font-mono text-[11px] uppercase text-[#A63D40]/60 hover:text-[#A63D40]"
                >
                  Delete
                </button>
              </div>
            ))}

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
                <div className="flex gap-3 font-mono text-[11px] uppercase tracking-wide flex-wrap">
                  <button onClick={() => handleDownload(file)} className="text-[#1B2A41]/70 hover:text-[#1B2A41]">
                    Download
                  </button>
                  <button onClick={() => setHistoryFile(file)} className="text-[#B08D57] hover:text-[#8f7143]">
                    History
                  </button>
                  <button onClick={() => setShareTarget({ type: 'file', id: file.id, name: file.file_name })} className="text-[#1B2A41]/70 hover:text-[#1B2A41]">
                    Share
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
          onRestored={loadData}
        />
      )}

      {shareTarget && (
        <ShareModal
          resource={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  )
}
