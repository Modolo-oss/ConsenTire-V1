/**
 * API client for ConsenTide backend
 */

import axios from 'axios'
import type { APIError } from './types'

const getAPIURL = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3001'
  }
  
  const host = window.location.hostname
  
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3001'
  }
  
  return '/api/proxy'
}

const API_URL = getAPIURL()

export const api = axios.create({
  baseURL: API_URL.startsWith('/api/proxy') ? '/api/proxy/v1' : `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - use localStorage token
api.interceptors.request.use(async (config) => {
  try {
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('token')
      if (token) {
        config.headers = config.headers || {}
        ;(config.headers as any).Authorization = `Bearer ${token}`
      }
    }
  } catch {}
  return config
})

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data) {
      const apiError: APIError = error.response.data
      console.error('API Error:', apiError)
    }
    return Promise.reject(error)
  }
)

export default api
