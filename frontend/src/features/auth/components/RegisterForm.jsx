import { useState } from 'react'
import { useAuth } from '../context/useAuth'

const MIN_PASSWORD_LENGTH = 8

export default function RegisterForm({ onSwitchToLogin }) {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must have at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await register(name, email, password)
    } catch (err) {
      setError(err.status === 409 ? 'An account with this email already exists' : err.message)
      setSubmitting(false)
    }
  }

  return (
    <form className="task-form auth-form" onSubmit={handleSubmit}>
      <h2>Create account</h2>

      <label htmlFor="register-name">Name</label>
      <input
        id="register-name"
        type="text"
        autoComplete="name"
        value={name}
        maxLength={100}
        required
        onChange={(event) => setName(event.target.value)}
      />

      <label htmlFor="register-email">Email</label>
      <input
        id="register-email"
        type="email"
        autoComplete="email"
        value={email}
        required
        onChange={(event) => setEmail(event.target.value)}
      />

      <label htmlFor="register-password">Password</label>
      <input
        id="register-password"
        type="password"
        autoComplete="new-password"
        value={password}
        maxLength={72}
        required
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && <p role="alert" className="error">{error}</p>}

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Register'}
        </button>
      </div>
      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="link-button" onClick={onSwitchToLogin}>
          Sign in
        </button>
      </p>
    </form>
  )
}
