import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Octicon } from '../components/ui/Octicon'

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSuccess(true)
    setTimeout(() => {
      navigate('/login')
    }, 1500)
  }

  const features = [
    {
      title: 'Access to GitHub Copilot',
      description: 'Increase your productivity and accelerate software development.',
    },
    {
      title: 'Unlimited repositories',
      description: 'Collaborate securely on public and private projects.',
    },
    {
      title: 'Integrated code reviews',
      description: 'Boost code quality with built-in review tools.',
    },
    {
      title: 'Automated workflows',
      description: 'Save time with CI/CD integrations and GitHub Actions.',
    },
    {
      title: 'Community support',
      description: 'Connect with developers worldwide for instant feedback and insights.',
    },
  ]

  return (
    <div className="min-h-screen bg-canvas-default text-fg-default flex flex-col justify-between py-6 px-4">
      <header className="max-w-[1020px] w-full mx-auto flex items-center justify-between pb-8">
        <Link to="/" className="text-fg-default hover:text-accent-fg transition-colors">
          <Octicon name="mark-github" size={36} />
        </Link>
        <div className="text-xs text-fg-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-fg hover:underline font-medium ml-1">
            Sign in &rarr;
          </Link>
        </div>
      </header>

      <main className="max-w-[1020px] w-full mx-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-fg-default mb-2">
              Create your free account
            </h1>
            <p className="text-sm text-fg-muted">
              Explore Gitcraft’s core features for individuals and organizations.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="mt-1 text-success-fg shrink-0">
                  <Octicon name="check" size={16} />
                </div>
                <div className="text-xs">
                  <h3 className="font-semibold text-fg-default">{f.title}</h3>
                  <p className="text-fg-muted">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-[420px] mx-auto md:ml-auto">
          {isSuccess ? (
            <div className="p-6 bg-canvas-subtle border border-success-fg/40 rounded-[var(--radius-card)] text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-success-fg/15 text-success-fg flex items-center justify-center mx-auto">
                <Octicon name="check" size={20} />
              </div>
              <h2 className="text-base font-bold text-fg-default">
                Account created successfully!
              </h2>
              <p className="text-xs text-fg-muted">
                Redirecting you to sign in...
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-canvas-subtle border border-border-default rounded-[var(--radius-card)] p-6 space-y-4 shadow-sm"
            >
              <h2 className="text-base font-semibold text-fg-default pb-1">
                Enter your details
              </h2>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup_email"
                  className="block text-xs font-medium text-fg-default"
                >
                  Email
                </label>
                <input
                  id="signup_email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-1.5 text-xs bg-canvas-default text-fg-default placeholder:text-fg-subtle border border-border-default rounded-[var(--radius-control)] focus:outline-none focus:border-accent-fg focus:ring-1 focus:ring-accent-fg transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup_password"
                  className="block text-xs font-medium text-fg-default"
                >
                  Password
                </label>
                <input
                  id="signup_password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full px-3 py-1.5 text-xs bg-canvas-default text-fg-default placeholder:text-fg-subtle border border-border-default rounded-[var(--radius-control)] focus:outline-none focus:border-accent-fg focus:ring-1 focus:ring-accent-fg transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup_username"
                  className="block text-xs font-medium text-fg-default"
                >
                  Username
                </label>
                <input
                  id="signup_username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="w-full px-3 py-1.5 text-xs bg-canvas-default text-fg-default placeholder:text-fg-subtle border border-border-default rounded-[var(--radius-control)] focus:outline-none focus:border-accent-fg focus:ring-1 focus:ring-accent-fg transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 rounded-[var(--radius-control)] text-xs font-medium bg-accent-fg hover:bg-accent-hover text-accent-text active:scale-[0.97] transition-all cursor-pointer shadow-sm mt-2"
              >
                Create account
              </button>

              <p className="text-[11px] text-fg-muted leading-tight pt-2">
                By creating an account, you agree to the{' '}
                <a href="#" className="text-accent-fg hover:underline">
                  Terms of Service
                </a>.
              </p>
            </form>
          )}
        </div>
      </main>

      <footer className="pt-8 text-center border-t border-border-default max-w-[1020px] w-full mx-auto">
        <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-fg-muted">
          <a href="#" className="hover:text-accent-fg hover:underline">Terms</a>
          <a href="#" className="hover:text-accent-fg hover:underline">Privacy</a>
          <a href="#" className="hover:text-accent-fg hover:underline">Security</a>
          <a href="#" className="hover:text-accent-fg hover:underline">Contact Support</a>
        </nav>
      </footer>
    </div>
  )
}
