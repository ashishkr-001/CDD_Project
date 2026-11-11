// Small fetch helper for the host site. Same conventions as the customer site:
// JSON in/out, errors shaped {detail, code, errors?[{field, message}]}.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message)
    this.status = status
    this.fields = fields // { fieldName: message } taken from a 422 "errors" list
  }
}
export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new ApiError(`Cannot reach the server at ${API_BASE}. Is the backend running?`, 0)
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const fields = {}
    if (Array.isArray(data?.errors)) {
      for (const e of data.errors) {
        const key = String(e.field || '').split('.').pop()
        if (key && !fields[key]) fields[key] = e.message
      }
    }
    const message = typeof data?.detail === 'string' ? data.detail : `Request failed (${res.status})`
    throw new ApiError(message, res.status, fields)
  }
  return data
}
