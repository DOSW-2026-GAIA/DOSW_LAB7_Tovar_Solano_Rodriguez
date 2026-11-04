import { useCallback, useEffect, useState } from 'react'
import * as taskApi from '../../../api/taskApi'
import { useAuth } from '../../auth/context/useAuth'

export function useTasks() {
  const { token, expireSession } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const handleError = useCallback(
    (err) => {
      if (err.status === 401) {
        expireSession()
      } else {
        setError(err.message)
      }
    },
    [expireSession],
  )

  const loadTasks = useCallback(async () => {
    try {
      const data = await taskApi.getTasks(token)
      setTasks(data)
      setError(null)
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }, [token, handleError])

  const addTask = useCallback(
    async (task) => {
      try {
        await taskApi.createTask(token, task)
        await loadTasks()
      } catch (err) {
        handleError(err)
      }
    },
    [token, loadTasks, handleError],
  )

  const editTask = useCallback(
    async (id, task) => {
      try {
        await taskApi.updateTask(token, id, task)
        await loadTasks()
      } catch (err) {
        handleError(err)
      }
    },
    [token, loadTasks, handleError],
  )

  const removeTask = useCallback(
    async (id) => {
      try {
        await taskApi.deleteTask(token, id)
        await loadTasks()
      } catch (err) {
        handleError(err)
      }
    },
    [token, loadTasks, handleError],
  )

  useEffect(() => {
    let active = true
    taskApi
      .getTasks(token)
      .then((data) => {
        if (active) {
          setTasks(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (active) {
          handleError(err)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [token, handleError])

  return { tasks, loading, error, loadTasks, addTask, editTask, removeTask }
}
