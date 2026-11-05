import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '../../../api/http'
import { AuthContext } from '../context/useAuth'
import LoginForm from './LoginForm'

function renderForm(auth) {
  const value = { login: vi.fn().mockResolvedValue(undefined), notice: '', ...auth }
  render(
    <AuthContext.Provider value={value}>
      <LoginForm onSwitchToRegister={vi.fn()} />
    </AuthContext.Provider>,
  )
  return value
}

describe('LoginForm', () => {
  it('signs in with the typed email and password', async () => {
    const user = userEvent.setup()
    const auth = renderForm()

    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Password'), 'ContrasenaDemo123!')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(auth.login).toHaveBeenCalledWith('ana@example.com', 'ContrasenaDemo123!')
  })

  it('shows an error when the credentials are invalid', async () => {
    const user = userEvent.setup()
    renderForm({ login: vi.fn().mockRejectedValue(new ApiError('Invalid email or password', 401)) })

    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Password'), 'otraClave123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })

  it('shows the session notice', () => {
    renderForm({ notice: 'Your session expired. Please sign in again.' })

    expect(screen.getByText('Your session expired. Please sign in again.')).toBeInTheDocument()
  })
})
