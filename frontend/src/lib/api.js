import axios from 'axios'

export const TOKEN_KEY = 'siasat_token'
export const USER_KEY = 'siasat_user'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const requestUrl = error?.config?.url || ''
    const isLoginEndpoint = requestUrl.includes('/auth/login')

    if (status === 401 && !isLoginEndpoint) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      window.dispatchEvent(
        new CustomEvent('siasat:unauthorized', {
          detail: { message: 'Sesi Anda telah berakhir' },
        })
      )
    }

    return Promise.reject(error)
  }
)

export function unwrapData(response) {
  if (response?.data && Object.prototype.hasOwnProperty.call(response.data, 'data')) {
    return response.data.data
  }
  return response?.data
}

export function unwrapList(response) {
  const payload = unwrapData(response)
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

export default api
