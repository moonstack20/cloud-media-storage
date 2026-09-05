import { useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

export default function PublicAccess() {
  const { token } = useParams()
  const [password, setPassword] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)

  const attemptAccess = async (pwd) => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(
        (import.meta.env.VITE_API_URL) + '/public-links/access/' + token,
        { password: pwd || null }
      )
      setResult(res.data)
      setNeedsPassword(false)
    } catch (err) {
      const detail = err.response && err.response.data ? err.response.data.detail : ''
      if (detail === 'Incorrect password') {
        setNeedsPassword(true)
        setError(pwd ? 'Incorrect password. Try again.' : '')
      } else {
        setError(detail || 'This link is invalid or has expired.')
      }
    } finally {
      setLoading(false)
    }
  }

  useState(() => {
    attemptAccess(null)
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    attemptAccess(password)
  }

  return (
    <div className="min-h-screen bg-[#EAE3D0] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs tracking-[0.2em] text-[#B08D57] uppercase mb-2 text-center">Vault</p>

        {loading && !result && (
          <p className="font-mono text-sm text-[#1B2A41]/50 text-center">Loading...</p>
        )}

        {needsPassword && (
          <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm p-8">
            <h1 className="font-[var(--font-display)] text-2xl text-[#1B2A41] mb-4">Password required</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b-2 border-[#1B2A41]/20 focus:border-[#B08D57] outline-none py-2 text-[#1B2A41]"
                placeholder="Enter password"
              />
              {error && <p className="text-[#A63D40] text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full bg-[#1B2A41] text-[#EAE3D0] font-medium py-2.5 rounded-sm hover:bg-[#243a58] transition-colors"
              >
                Unlock
              </button>
            </form>
          </div>
        )}

        {!needsPassword && error && (
          <div className="bg-[#F7F4EA] border border-[#A63D40]/30 rounded-sm p-8 text-center">
            <p className="text-[#A63D40]">{error}</p>
          </div>
        )}

        {result && result.resource_type === 'file' && (
          <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm p-8 text-center">
            <h1 className="font-[var(--font-display)] text-2xl text-[#1B2A41] mb-4">{result.file_name}</h1>
            <a
              href={result.download_url}
              className="inline-block bg-[#1B2A41] text-[#EAE3D0] font-medium px-6 py-2.5 rounded-sm hover:bg-[#243a58] transition-colors"
            >
              Download file
            </a>
          </div>
        )}

        {result && result.resource_type === 'folder' && (
          <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm p-8">
            <h1 className="font-[var(--font-display)] text-2xl text-[#1B2A41] mb-4">{result.folder_name}</h1>
            {result.files.length === 0 ? (
              <p className="text-[#1B2A41]/50 text-sm">This folder is empty.</p>
            ) : (
              <ul className="space-y-2">
                {result.files.map((f) => (
                  <li key={f.id} className="text-[#1B2A41] text-sm">{f.file_name}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
