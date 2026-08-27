import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { registerUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await registerUser(email, password, fullName)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create account. Try a different email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#EAE3D0] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="font-mono text-xs tracking-[0.2em] text-[#B08D57] uppercase mb-2">Vault</p>
          <h1 className="font-[var(--font-display)] text-4xl text-[#1B2A41]">Open an account</h1>
        </div>

        <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm shadow-[4px_4px_0_0_rgba(27,42,65,0.08)] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-mono text-[11px] tracking-wide text-[#1B2A41]/60 uppercase mb-1.5">
                Full name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-transparent border-b-2 border-[#1B2A41]/20 focus:border-[#B08D57] outline-none py-2 text-[#1B2A41] transition-colors"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] tracking-wide text-[#1B2A41]/60 uppercase mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b-2 border-[#1B2A41]/20 focus:border-[#B08D57] outline-none py-2 text-[#1B2A41] transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] tracking-wide text-[#1B2A41]/60 uppercase mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b-2 border-[#1B2A41]/20 focus:border-[#B08D57] outline-none py-2 text-[#1B2A41] transition-colors"
                placeholder="At least 8 characters"
              />
            </div>

            {error && (
              <p className="text-[#A63D40] text-sm font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B2A41] text-[#EAE3D0] font-medium py-3 rounded-sm hover:bg-[#243a58] transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-[#1B2A41]/70">
          Already have an account?{' '}
          <Link to="/login" className="text-[#B08D57] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
