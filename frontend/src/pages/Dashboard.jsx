import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-[#EAE3D0] p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-[#B08D57] uppercase mb-1">Vault</p>
          <h1 className="font-[var(--font-display)] text-3xl text-[#1B2A41]">
            Welcome, {user?.full_name || user?.email}
          </h1>
        </div>
        <button
          onClick={logout}
          className="font-mono text-xs uppercase tracking-wide text-[#1B2A41]/60 hover:text-[#A63D40] transition-colors"
        >
          Sign out
        </button>
      </div>
      <div className="bg-[#F7F4EA] border border-[#1B2A41]/15 rounded-sm p-8 text-[#1B2A41]/60">
        File browser coming in Day 9's frontend slice.
      </div>
    </div>
  )
}
