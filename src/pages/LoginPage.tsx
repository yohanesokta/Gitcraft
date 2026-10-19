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
    <div className="min-h-screen bg-canvas-default text-fg-default flex flex-col justify-between py-8 px-4">
      <div className="w-full max-w-[340px] mx-auto space-y-4">
        <div className="text-center pt-4">
          <Link to="/" className="inline-block text-fg-default hover:text-accent-fg transition-colors">
            <Octicon name="mark-github" size={48} />
          </Link>
          <h1 className="text-2xl font-light text-fg-default mt-6 tracking-tight">
            Sign in to Gitcraft
          </h1>
        </div>

        {errorMessage && (
          <div className="p-3 bg-danger-fg/10 border border-danger-fg/30 rounded-[var(--radius-control)] text-xs text-danger-fg text-center">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-canvas-subtle border border-border-default rounded-[var(--radius-card)] p-5 space-y-4"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="login_field"
              className="block text-xs font-medium text-fg-default"
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
              className="w-full px-3 py-1.5 text-xs bg-canvas-default text-fg-default border border-border-default rounded-[var(--radius-control)] focus:outline-none focus:border-accent-fg focus:ring-1 focus:ring-accent-fg transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password_field"
                className="block text-xs font-medium text-fg-default"
              >
                Password
              </label>
              <Link
                to="#"
                className="text-xs text-accent-fg hover:underline"
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
              className="w-full px-3 py-1.5 text-xs bg-canvas-default text-fg-default border border-border-default rounded-[var(--radius-control)] focus:outline-none focus:border-accent-fg focus:ring-1 focus:ring-accent-fg transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-1.5 px-3 rounded-[var(--radius-control)] text-xs font-medium bg-accent-fg hover:bg-accent-hover disabled:opacity-50 text-accent-text active:scale-[0.97] transition-all cursor-pointer shadow-sm"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="border border-border-default rounded-[var(--radius-card)] p-4 text-center text-xs text-fg-default bg-canvas-subtle">
          New to Gitcraft?{' '}
          <Link to="/signup" className="text-accent-fg hover:underline font-medium">
            Create an account
          </Link>
        </div>
      </div>

      <footer className="pt-12 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-fg-muted">
          <a href="#" className="hover:text-accent-fg hover:underline">Terms</a>
          <a href="#" className="hover:text-accent-fg hover:underline">Privacy</a>
          <a href="#" className="hover:text-accent-fg hover:underline">Docs</a>
          <a href="#" className="hover:text-accent-fg hover:underline">Contact Support</a>
        </nav>
      </footer>
    </div>
  )
}
