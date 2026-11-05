import AuthPage from './features/auth/pages/AuthPage'
import { useAuth } from './features/auth/context/useAuth'
import TasksPage from './features/tasks/pages/TasksPage'

export default function App() {
  const { user } = useAuth()

  return user ? <TasksPage /> : <AuthPage />
}
