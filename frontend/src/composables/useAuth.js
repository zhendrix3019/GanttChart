import { ref, computed } from 'vue'
import axios from 'axios'

const user = ref(null)
const token = ref(localStorage.getItem('auth_token') || null)
const isLoading = ref(true)
const error = ref(null)

const isAuthenticated = computed(() => !!token.value && !!user.value)

// Set up axios interceptor to include token
axios.interceptors.request.use((config) => {
  if (token.value) {
    config.headers.Authorization = `Bearer ${token.value}`
  }
  return config
})

// Handle 401 responses
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout()
    }
    return Promise.reject(error)
  }
)

export function useAuth() {
  const initGoogleSignIn = (buttonElement) => {
    if (!window.google) {
      console.error('Google Sign-In script not loaded')
      return
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCallback,
      auto_select: false
    })

    window.google.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      width: 300
    })
  }

  const handleGoogleCallback = async (response) => {
    error.value = null
    isLoading.value = true

    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const result = await axios.post(`${apiUrl}/api/auth/google`, {
        credential: response.credential
      })

      token.value = result.data.token
      user.value = result.data.user
      localStorage.setItem('auth_token', result.data.token)
    } catch (err) {
      console.error('Login failed:', err)
      error.value = err.response?.data?.error || 'Login failed. Please try again.'
      token.value = null
      user.value = null
      localStorage.removeItem('auth_token')
    } finally {
      isLoading.value = false
    }
  }

  const verifyToken = async () => {
    if (!token.value) {
      isLoading.value = false
      return false
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const response = await axios.get(`${apiUrl}/api/auth/verify`)
      user.value = response.data.user
      return true
    } catch (err) {
      console.error('Token verification failed:', err)
      token.value = null
      user.value = null
      localStorage.removeItem('auth_token')
      return false
    } finally {
      isLoading.value = false
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')

    // Revoke Google session if available
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect()
    }
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    initGoogleSignIn,
    verifyToken,
    logout
  }
}
