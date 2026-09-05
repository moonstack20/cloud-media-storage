import { useState, useEffect } from 'react'
import * as publicLinksApi from '../api/publicLinks'

export default function PublicLinkModal({ resource, onClose }) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [password, setPassword] = useState('')
  const [expiresInHours, setExpiresInHours] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  const loadLinks = async () => {
    setLoading(true)
    try {
      const res = await publicLinksApi.listPublicLinks(resource.type, resource.id)
      setLinks(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLinks()
  }, [resource.id])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await publicLinksApi.createPublicLink(resource.type, resource.id, {
        password: password || null,
        expiresInHours: expiresInHours ? parseInt(expiresInHours, 10) : null,
      })
      setPassword('')
      setExpiresInHours('')
      await loadLinks()
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (linkId) => {
    try {
      await publicLinksApi.revokePublicLink(linkId)
      setLinks((prev) => prev.filter((l) => l.id !== linkId))
    } catch (err) {
      console.error(err)
    }
  }

  const handleCopy = (token, id) => {
    const url = window.location.origin + '/public/' + token
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="fixed inset-0 bg-[#1B2A41]/40 flex items-center justify-center z-50 px-6">
      <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm shadow-xl max-w-md w-full">
        <div className="flex justify-between items-start p-6 border-b border-[#1B2A41]/10">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-[#B08D57] uppercase mb-1">Public link</p>
            <h2 className="font-[var(--font-display)] text-xl text-[#1B2A41] truncate max-w-xs">{resource.name}</h2>
          </div>
          <button onClick={onClose} className="text-[#1B2A41]/50 hover:text-[#1B2A41] text-xl leading-none">x</button>
        </div>

        <div className="p-6">
          <form onSubmit={handleCreate} className="space-y-3 mb-6">
            <input
              type="text"
              placeholder="Password (optional)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b-2 border-[#1B2A41]/20 focus:border-[#B08D57] outline-none py-2 text-[#1B2A41] text-sm transition-colors"
            />
            <input
              type="number"
              placeholder="Expires in hours (optional)"
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(e.target.value)}
              className="w-full bg-transparent border-b-2 border-[#1B2A41]/20 focus:border-[#B08D57] outline-none py-2 text-[#1B2A41] text-sm transition-colors"
            />
            <button
              type="submit"
              disabled={creating}
              className="w-full bg-[#1B2A41] text-[#EAE3D0] font-medium py-2.5 rounded-sm hover:bg-[#243a58] transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create public link'}
            </button>
          </form>

          {loading ? (
            <p className="font-mono text-sm text-[#1B2A41]/50 text-center py-4">Loading...</p>
          ) : links.length === 0 ? (
            <p className="text-sm text-[#1B2A41]/50">No public links yet.</p>
          ) : (
            <div className="space-y-3">
              {links.map((l) => (
                <div key={l.id} className="border border-[#1B2A41]/10 rounded-sm p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-mono text-[11px] text-[#1B2A41]/60 uppercase">
                      {l.has_password ? 'Password protected' : 'Open link'}
                      {l.expires_at ? ' - expires' : ' - no expiry'}
                    </p>
                    <button
                      onClick={() => handleRevoke(l.id)}
                      className="font-mono text-[11px] uppercase text-[#A63D40]/70 hover:text-[#A63D40]"
                    >
                      Revoke
                    </button>
                  </div>
                  <button
                    onClick={() => handleCopy(l.token, l.id)}
                    className="font-mono text-[11px] text-[#B08D57] hover:underline"
                  >
                    {copiedId === l.id ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
