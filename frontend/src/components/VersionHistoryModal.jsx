import { useState, useEffect, useRef } from 'react'
import * as filesApi from '../api/files'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function VersionHistoryModal({ file, onClose, onRestored }) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const loadVersions = async () => {
    setLoading(true)
    try {
      const res = await filesApi.listVersions(file.id)
      setVersions(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVersions()
  }, [file.id])

  const handleNewVersion = async (e) => {
    const newFile = e.target.files[0]
    if (!newFile) return
    setUploading(true)
    try {
      await filesApi.uploadNewVersion(file.id, newFile)
      await loadVersions()
      onRestored?.()
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRestore = async (versionId) => {
    if (!confirm('Restore this version? The current version will be saved to history.')) return
    try {
      await filesApi.restoreVersion(file.id, versionId)
      await loadVersions()
      onRestored?.()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDownloadVersion = async (versionId) => {
    try {
      const res = await filesApi.downloadVersion(file.id, versionId)
      window.open(res.data.download_url, '_blank')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#1B2A41]/40 flex items-center justify-center z-50 px-6">
      <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-start p-6 border-b border-[#1B2A41]/10">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-[#B08D57] uppercase mb-1">Version history</p>
            <h2 className="font-[var(--font-display)] text-xl text-[#1B2A41] truncate max-w-xs">{file.file_name}</h2>
          </div>
          <button onClick={onClose} className="text-[#1B2A41]/50 hover:text-[#1B2A41] text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full bg-[#1B2A41] text-[#EAE3D0] font-medium py-2.5 rounded-sm hover:bg-[#243a58] transition-colors disabled:opacity-50 mb-6"
          >
            {uploading ? 'Uploading…' : '+ Upload new version'}
          </button>
          <input ref={fileInputRef} type="file" onChange={handleNewVersion} className="hidden" />

          {loading ? (
            <p className="font-mono text-sm text-[#1B2A41]/50 text-center py-8">Loading versions…</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-[#1B2A41]/50 text-center py-8">
              No previous versions yet. Upload a new version to start tracking history.
            </p>
          ) : (
            <div className="space-y-3">
              {versions.map((v) => (
                <div key={v.id} className="flex justify-between items-center border border-[#1B2A41]/10 rounded-sm px-4 py-3">
                  <div>
                    <p className="font-mono text-xs text-[#1B2A41]/60 uppercase tracking-wide">
                      Version {v.version_number}
                    </p>
                    <p className="text-sm text-[#1B2A41]/70">{formatDate(v.created_at)}</p>
                  </div>
                  <div className="flex gap-3 font-mono text-[11px] uppercase tracking-wide">
                    <button
                      onClick={() => handleDownloadVersion(v.id)}
                      className="text-[#1B2A41]/70 hover:text-[#1B2A41]"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleRestore(v.id)}
                      className="text-[#B08D57] hover:text-[#8f7143]"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
