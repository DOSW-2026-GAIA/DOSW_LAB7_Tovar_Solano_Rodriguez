import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '../../../api/http'
import { AuthContext } from '../context/useAuth'
import RegisterForm from './RegisterForm'

function renderForm(register = vi.fn().mockResolvedValue(undefined)) {
  render(
    <AuthContext.Provider value={{ register }}>
      <RegisterForm onSwitchToLogin={vi.fn()} />
    </AuthContext.Provider>,
  )
  return register
}

async function fillForm(user, password) {
  await user.type(screen.getByLabelText('Name'), 'Ana Perez')
  await user.type(screen.getByLabelText('Email'), 'ana@example.com')
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Register' }))
}

describe('RegisterForm', () => {
  it('registers with name, email and password', async () => {
    const user = userEvent.setup()
    const register = renderForm()

    await fillForm(user, 'ContrasenaDemo123!')

    expect(register).toHaveBeenCalledWith('Ana Perez', 'ana@example.com', 'ContrasenaDemo123!')
  })

  it('does not call the API when the password is too short', async () => {
    const user = userEvent.setup()
    const register = renderForm()

    await fillForm(user, 'corta')

    expect(screen.getByRole('alert')).toHaveTextContent('at least 8 characters')
    expect(register).not.toHaveBeenCalled()
  })

  it('shows a message when the email is already registered', async () => {
    const user = userEvent.setup()
    renderForm(vi.fn().mockRejectedValue(new ApiError('conflict', 409)))

    await fillForm(user, 'ContrasenaDemo123!')

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists')
  })
})
