export const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function authHeaders(token, headers = {}) {
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers
}

export async function handleResponse(response) {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body = await response.json()
      if (body.message) {
        message = body.message
      }
    } catch {
      // The response had no JSON body; keep the default message.
    }
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) {
    return null
  }
  return response.json()
}
