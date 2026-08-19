const API_BASE_URL = "/client-api";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiError(data?.detail || 'Error al comunicarse con el servidor', res.status)
  }
  return data as T
}

export interface LoginResponse {
  access_token: string
}

export interface RegisterResponse {
  name: string
  email: string
}

export interface Certificate {
  id: number
  request_id: string
  status: string
  signed_certificate: string | null
}

export function login(email: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function register(name: string, email: string, password: string) {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export function getCertificates(token: string) {
  return request<Certificate[]>('/certificates/me', {}, token)
}

export function getCertificateStatus(certId: number, token: string) {
  return request<Certificate>(`/certificates/${certId}/status`, {}, token)
}

export function signCertificate(csr: string, token: string) {
  return request<Certificate>(
    '/certificates/sign',
    { method: 'POST', body: JSON.stringify({ csr }) },
    token
  )
}
