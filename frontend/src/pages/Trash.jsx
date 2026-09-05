import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as filesApi from '../api/files'
import * as foldersApi from '../api/folders'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Trash() {
  const { user, logout } = useAuth()
  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)

  const loadTrash = async () => {
    setLoading(true)
    try {
      const [filesRes, foldersRes] = await Promise.all([
        filesApi.listTrash(),
        foldersApi.listFolderTrash(),
      ])
      setFiles(filesRes.data)
      setFolders(foldersRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrash()
  }, [])

  const handleRestoreFile = async (file) => {
    try {
      await filesApi.restoreFile(file.id)
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch (err) {
      console.error(err)
    }
  }

  const handlePermanentDeleteFile = async (file) => {
    if (!confirm(`Permanently delete "${file.file_name}"? This cannot be undone.`)) return
    try {
      await filesApi.permanentDelete(file.id)
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleRestoreFolder = async (folder) => {
    try {
      await foldersApi.restoreFolder(folder.id)
      setFolders((prev) => prev.filter((f) => f.id !== folder.id))
    } catch (err) {
      console.error(err)
    }
  }

  const handlePermanentDeleteFolder = async (folder) => {
    if (!confirm(`Permanently delete folder "${folder.name}"? This cannot be undone.`)) return
    try {
      await foldersApi.permanentDeleteFolder(folder.id)
      setFolders((prev) => prev.filter((f) => f.id !== folder.id))
    } catch (err) {
      console.error(err)
    }
  }

  const isEmpty = files.length === 0 && folders.length === 0

  return (
    <div className="min-h-screen bg-[#EAE3D0]">
      <header className="border-b border-[#1B2A41]/15 bg-[#F7F4EA] px-8 py-5 flex justify-between items-center">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-[#B08D57] uppercase mb-1">Vault</p>
          <h1 className="font-[var(--font-display)] text-2xl text-[#1B2A41]">Trash</h1>
        </div>
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60 hover:text-[#1B2A41] transition-colors"
          >
            Back to Archive
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
        <p className="text-sm text-[#1B2A41]/60 mb-6">
          Items here can be restored or permanently deleted.
        </p>

        {loading ? (
          <p className="font-mono text-sm text-[#1B2A41]/50 text-center py-16">Loading trash...</p>
        ) : isEmpty ? (
          <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm p-16 text-center">
            <p className="font-[var(--font-display)] text-xl text-[#1B2A41]/70 mb-2">
              Trash is empty.
            </p>
            <p className="text-sm text-[#1B2A41]/50">
              Deleted files and folders will appear here before being permanently removed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="bg-[#F7F4EA] border border-[#B08D57]/40 rounded-sm p-4"
              >
                <p className="font-medium text-[#1B2A41] truncate mb-1">
                  {String.fromCharCode(9656)} {folder.name}
                </p>
                <p className="font-mono text-[11px] text-[#1B2A41]/50 mb-4">
                  Deleted {formatDate(folder.deleted_at)}
                </p>
                <div className="flex gap-3 font-mono text-[11px] uppercase tracking-wide">
                  <button
                    onClick={() => handleRestoreFolder(folder)}
                    className="text-[#1B2A41]/70 hover:text-[#1B2A41]"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handlePermanentDeleteFolder(folder)}
                    className="text-[#A63D40]/70 hover:text-[#A63D40]"
                  >
                    Delete forever
                  </button>
                </div>
              </div>
            ))}

            {files.map((file) => (
              <div
                key={file.id}
                className="bg-[#F7F4EA] border border-[#A63D40]/25 rounded-sm p-4"
              >
                <p className="font-medium text-[#1B2A41] truncate mb-1" title={file.file_name}>
                  {file.file_name}
                </p>
                <p className="font-mono text-[11px] text-[#1B2A41]/50 mb-4">
                  Deleted {formatDate(file.deleted_at)}
                </p>
                <div className="flex gap-3 font-mono text-[11px] uppercase tracking-wide">
                  <button
                    onClick={() => handleRestoreFile(file)}
                    className="text-[#1B2A41]/70 hover:text-[#1B2A41]"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handlePermanentDeleteFile(file)}
                    className="text-[#A63D40]/70 hover:text-[#A63D40]"
                  >
                    Delete forever
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
