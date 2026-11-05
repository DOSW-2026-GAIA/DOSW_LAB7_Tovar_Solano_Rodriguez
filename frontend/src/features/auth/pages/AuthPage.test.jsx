import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthContext } from '../context/useAuth'
import AuthPage from './AuthPage'

function renderPage() {
  render(
    <AuthContext.Provider value={{ login: vi.fn(), register: vi.fn(), notice: '' }}>
      <AuthPage />
    </AuthContext.Provider>,
  )
}

describe('AuthPage', () => {
  it('starts on the sign in form', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('switches between sign in and register', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Register' }))
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })
})
