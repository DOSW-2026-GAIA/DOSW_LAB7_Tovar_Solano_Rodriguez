import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as authApi from './api/authApi'
import * as taskApi from './api/taskApi'
import { ApiError } from './api/http'
import App from './App'
import { AuthProvider } from './features/auth/context/AuthContext'

vi.mock('./api/authApi', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getProfile: vi.fn(),
}))

vi.mock('./api/taskApi', () => ({
  getTasks: vi.fn(),
  getTask: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}))

const users = {
  'ana@example.com': { token: 'ana-jwt', profile: { id: 1, name: 'Ana Perez', email: 'ana@example.com', role: 'USER' } },
  'luis@example.com': { token: 'luis-jwt', profile: { id: 2, name: 'Luis Gomez', email: 'luis@example.com', role: 'USER' } },
}

const tasksByToken = {
  'ana-jwt': [{ id: 1, title: 'Ana 1', status: 'PENDING', priority: 'HIGH', dueDate: null }],
  'luis-jwt': [{ id: 3, title: 'Luis 1', status: 'PENDING', priority: 'LOW', dueDate: null }],
}

function renderApp() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  )
}

async function signIn(user, email) {
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), 'ContrasenaDemo123!')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    authApi.login.mockImplementation(async ({ email }) => ({
      tokenType: 'Bearer',
      accessToken: users[email].token,
      expiresIn: 1800,
    }))
    authApi.getProfile.mockImplementation(async (token) =>
      Object.values(users).find((entry) => entry.token === token).profile,
    )
    taskApi.getTasks.mockImplementation(async (token) => tasksByToken[token])
  })

  it('shows the login form when there is no session', () => {
    renderApp()

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(taskApi.getTasks).not.toHaveBeenCalled()
  })

  it('keeps the token in memory and not in browser storage', async () => {
    const user = userEvent.setup()
    renderApp()

    await signIn(user, 'ana@example.com')

    expect(await screen.findByText('Ana 1')).toBeInTheDocument()
    expect(taskApi.getTasks).toHaveBeenCalledWith('ana-jwt')
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('PT-16 removes the token and tasks after signing out', async () => {
    const user = userEvent.setup()
    renderApp()

    await signIn(user, 'ana@example.com')
    expect(await screen.findByText('Ana 1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByText('Ana 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Ana Perez')).not.toBeInTheDocument()
  })

  it('PT-17 returns to the login form when the API answers 401', async () => {
    const user = userEvent.setup()
    taskApi.getTasks.mockRejectedValue(new ApiError('Authentication required', 401))
    renderApp()

    await signIn(user, 'ana@example.com')

    expect(await screen.findByText('Your session expired. Please sign in again.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('PT-18 shows only the tasks of the user that signs in next', async () => {
    const user = userEvent.setup()
    renderApp()

    await signIn(user, 'ana@example.com')
    expect(await screen.findByText('Ana 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    await signIn(user, 'luis@example.com')

    expect(await screen.findByText('Luis 1')).toBeInTheDocument()
    expect(screen.getByText('Luis Gomez')).toBeInTheDocument()
    expect(screen.queryByText('Ana 1')).not.toBeInTheDocument()
  })

  it('registers a new account and signs in automatically', async () => {
    const user = userEvent.setup()
    authApi.register.mockResolvedValue({ id: 1, name: 'Ana Perez', email: 'ana@example.com', role: 'USER' })
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Register' }))
    await user.type(screen.getByLabelText('Name'), 'Ana Perez')
    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Password'), 'ContrasenaDemo123!')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByText('Ana 1')).toBeInTheDocument()
    expect(authApi.register).toHaveBeenCalledWith({
      name: 'Ana Perez',
      email: 'ana@example.com',
      password: 'ContrasenaDemo123!',
    })
  })
})
