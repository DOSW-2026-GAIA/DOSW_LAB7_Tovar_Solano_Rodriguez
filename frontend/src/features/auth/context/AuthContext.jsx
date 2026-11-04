import { useCallback, useMemo, useState } from 'react'
import * as authApi from '../../../api/authApi'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [notice, setNotice] = useState('')

  const login = useCallback(async (email, password) => {
    const { accessToken } = await authApi.login({ email: email.trim(), password })
    const user = await authApi.getProfile(accessToken)
    setNotice('')
    setSession({ token: accessToken, user })
  }, [])

  const register = useCallback(
    async (name, email, password) => {
      await authApi.register({ name: name.trim(), email: email.trim(), password })
      await login(email, password)
    },
    [login],
  )

  const logout = useCallback(() => {
    setSession(null)
  }, [])

  const expireSession = useCallback(() => {
    setSession(null)
    setNotice('Your session expired. Please sign in again.')
  }, [])

  const value = useMemo(
    () => ({
      token: session?.token ?? null,
      user: session?.user ?? null,
      notice,
      login,
      register,
      logout,
      expireSession,
    }),
    [session, notice, login, register, logout, expireSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
