import { useState } from 'react'
import { useAuth } from '../../auth/context/useAuth'
import TaskForm from '../components/TaskForm'
import TaskList from '../components/TaskList'
import { useTasks } from '../hooks/useTasks'

const NEXT_STATUS = {
  PENDING: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
  COMPLETED: 'PENDING',
}

export default function TasksPage() {
  const { user, logout } = useAuth()
  const { tasks, loading, error, addTask, editTask, removeTask } = useTasks()
  const [editingTask, setEditingTask] = useState(null)

  async function handleSubmit(payload) {
    if (editingTask) {
      await editTask(editingTask.id, payload)
      setEditingTask(null)
    } else {
      await addTask(payload)
    }
  }

  function handleChangeStatus(task) {
    editTask(task.id, {
      title: task.title,
      description: task.description ?? '',
      status: NEXT_STATUS[task.status],
      priority: task.priority,
      dueDate: task.dueDate,
    })
  }

  return (
    <main className="tasks-page">
      <header className="page-header">
        <h1>ToDo Tasks</h1>
        <div className="session">
          <span>{user.name}</span>
          <button type="button" onClick={logout}>Sign out</button>
        </div>
      </header>

      <TaskForm
        key={editingTask ? editingTask.id : 'new'}
        initialTask={editingTask}
        onSubmit={handleSubmit}
        onCancel={() => setEditingTask(null)}
      />

      {loading && <p>Loading tasks...</p>}
      {error && <p role="alert" className="error">{error}</p>}

      <TaskList
        tasks={tasks}
        onEdit={setEditingTask}
        onDelete={removeTask}
        onChangeStatus={handleChangeStatus}
      />
    </main>
  )
}
