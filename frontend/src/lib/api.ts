export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export type ApiError = { message: string; issues?: unknown[] }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('snack-token')
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erreur réseau' })) as ApiError
    if (res.status === 401) {
      localStorage.removeItem('snack-token')
      window.location.reload()
    }
    throw new Error(err.message)
  }
  return res.json()
}

export function money(value: number | string | null | undefined) {
  return `${new Intl.NumberFormat('fr-CM').format(Math.round(Number(value ?? 0)))} XAF`
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}
