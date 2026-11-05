import { useState } from 'react'
import { useAuth } from '../context/useAuth'

export default function LoginForm({ onSwitchToRegister }) {
  const { login, notice } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.status === 401 ? 'Invalid email or password' : err.message)
      setSubmitting(false)
    }
  }

  return (
    <form className="task-form auth-form" onSubmit={handleSubmit}>
      <h2>Sign in</h2>
      {notice && <p className="notice">{notice}</p>}

      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        type="email"
        autoComplete="email"
        value={email}
        required
        onChange={(event) => setEmail(event.target.value)}
      />

      <label htmlFor="login-password">Password</label>
      <input
        id="login-password"
        type="password"
        autoComplete="current-password"
        value={password}
        required
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && <p role="alert" className="error">{error}</p>}

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
      <p className="auth-switch">
        Don&apos;t have an account?{' '}
        <button type="button" className="link-button" onClick={onSwitchToRegister}>
          Register
        </button>
      </p>
    </form>
  )
}
