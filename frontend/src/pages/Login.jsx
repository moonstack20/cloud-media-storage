import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginUser(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not sign in. Check your details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-5/12 bg-[#1B2A41] relative overflow-hidden flex-col justify-between p-12">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 27px, #EAE3D0 28px), repeating-linear-gradient(90deg, transparent, transparent 27px, #EAE3D0 28px)',
          }}
        />
        <div
          className="absolute right-0 top-0 h-full w-72 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, rgba(234,227,208,0) 0%, rgba(234,227,208,0.05) 20%, rgba(234,227,208,0.15) 40%, rgba(234,227,208,0.35) 60%, rgba(234,227,208,0.7) 80%, rgba(234,227,208,1) 100%)',
          }}
        />
        <div className="relative">
          <p className="font-mono text-xs tracking-[0.3em] text-[#B08D57] uppercase mb-2">Vault</p>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#EAE3D0]/40 uppercase mb-3">
            Secure. Organized. Yours.
          </p>
          <div className="w-10 h-[2px] bg-[#B08D57] mb-8" />
        </div>

        <div className="relative">
          <h1 className="font-[var(--font-display)] text-5xl leading-[1.1] text-[#EAE3D0] mb-6">
            Every file has<br />its place.
          </h1>
          <p className="text-[#EAE3D0]/60 text-sm leading-relaxed max-w-xs mb-8">
            Folders, versions, and shares — kept in order, the way a good archive should be.
          </p>

          <div className="flex flex-col gap-2 mb-10">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-wide text-[#EAE3D0]/50 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B08D57]" />
              System secure
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-wide text-[#EAE3D0]/50 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B08D57]" />
              Cloud storage
            </div>
          </div>

          <div className="max-w-[220px]">
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#EAE3D0]/40 uppercase mb-2">Your files</p>
            <div className="w-full h-px bg-[#EAE3D0]/15 mb-3" />
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-3 font-mono text-[11px] text-[#EAE3D0]/50">
                <span className="text-[#B08D57]">01</span> Documents
              </div>
              <div className="flex items-baseline gap-3 font-mono text-[11px] text-[#EAE3D0]/50">
                <span className="text-[#B08D57]">02</span> Media
              </div>
              <div className="flex items-baseline gap-3 font-mono text-[11px] text-[#EAE3D0]/50">
                <span className="text-[#B08D57]">03</span> Projects
              </div>
              <div className="flex items-baseline gap-3 font-mono text-[11px] text-[#EAE3D0]/50">
                <span className="text-[#B08D57]">04</span> Shared files
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-3 font-mono text-[11px] text-[#EAE3D0]/40 uppercase tracking-wide">
          <span>001</span>
          <div className="w-8 h-px bg-[#EAE3D0]/20" />
          <span>Est. this year</span>
        </div>
      </div>

      <div className="flex-1 bg-[#EAE3D0] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10 lg:hidden">
            <p className="font-mono text-xs tracking-[0.2em] text-[#B08D57] uppercase mb-2">Vault</p>
          </div>
          <div className="mb-10">
            <h1 className="font-[var(--font-display)] text-4xl text-[#1B2A41]">Welcome back</h1>
          </div>

          <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm shadow-[4px_4px_0_0_rgba(27,42,65,0.08)] p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-[#1B2A41]/20 focus:border-[#B08D57] outline-none py-2 text-[#1B2A41] transition-colors"
                  placeholder="••••••••"
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
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="text-center mt-6 text-sm text-[#1B2A41]/70">
            New here?{' '}
            <Link to="/register" className="text-[#B08D57] font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
