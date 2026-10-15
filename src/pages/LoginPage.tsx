import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Octicon } from '../components/ui/Octicon'
import { loginUser } from '../lib/forgejo'

export function LoginPage() {
  const [username, setUsername] = useState('yohanesokta')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const user = await loginUser(username, password)
      navigate(`/${user.login}`)
    } catch (err) {
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Failed to sign in. Please check your credentials.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex flex-col justify-between py-8 px-4">
      <div className="w-full max-w-[340px] mx-auto space-y-4">
        <div className="text-center pt-4">
          <Link to="/" className="inline-block text-[#e6edf3] hover:text-[#58a6ff] transition-colors">
            <Octicon name="mark-github" size={48} />
          </Link>
          <h1 className="text-2xl font-light text-[#e6edf3] mt-6 tracking-tight">
            Sign in to GitHub
          </h1>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#f85149]/15 border border-[#f85149]/40 rounded-md text-xs text-[#f85149] text-center">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-[#161b22] border border-[#30363d] rounded-md p-4 space-y-4"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="login_field"
              className="block text-sm font-normal text-[#e6edf3]"
            >
              Username or email address
            </label>
            <input
              id="login_field"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password_field"
                className="block text-sm font-normal text-[#e6edf3]"
              >
                Password
              </label>
              <Link
                to="#"
                className="text-xs text-[#58a6ff] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password_field"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-[#0d1117] text-[#e6edf3] border border-[#30363d] rounded-md focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-1.5 px-3 rounded-md text-sm font-semibold bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white border border-[#2ea043] transition-colors cursor-pointer shadow-sm"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="border border-[#30363d] rounded-md p-4 text-center text-sm text-[#e6edf3]">
          New to GitHub?{' '}
          <Link to="/signup" className="text-[#58a6ff] hover:underline">
            Create an account
          </Link>
        </div>
      </div>

      <footer className="pt-12 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#58a6ff]">
          <a href="https://docs.github.com" target="_blank" rel="noreferrer" className="hover:underline">Terms</a>
          <a href="https://docs.github.com" target="_blank" rel="noreferrer" className="hover:underline">Privacy</a>
          <a href="https://docs.github.com" target="_blank" rel="noreferrer" className="hover:underline">Docs</a>
          <a href="https://support.github.com" target="_blank" rel="noreferrer" className="hover:underline">Contact GitHub Support</a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:underline">Manage cookies</a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:underline">Do not share my personal information</a>
        </nav>
      </footer>
    </div>
  )
}
