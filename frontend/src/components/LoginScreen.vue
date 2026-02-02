<template>
  <div class="login-screen">
    <div class="login-container">
      <div class="login-header">
        <h1>Gantt Chart Manager</h1>
        <p>Construction Project Timeline Tool</p>
      </div>

      <div class="login-content">
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Checking authentication...</p>
        </div>

        <div v-else>
          <p class="login-instruction">Sign in with your Google account to access the project timeline.</p>

          <div ref="googleButtonRef" class="google-button-container"></div>

          <!-- Dev login button (only in development) -->
          <div v-if="isDev" class="dev-login-section">
            <div class="dev-divider">
              <span>Development Mode</span>
            </div>
            <button @click="devLogin" class="dev-login-btn" :disabled="isLoggingIn">
              {{ isLoggingIn ? 'Logging in...' : 'Dev Login (Skip Google)' }}
            </button>
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </div>
      </div>

      <div class="login-footer">
        <p>Authorized users only</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useAuth } from '../composables/useAuth'

export default {
  name: 'LoginScreen',
  setup() {
    const googleButtonRef = ref(null)
    const isLoggingIn = ref(false)
    const { isLoading, error, initGoogleSignIn, token, user } = useAuth()

    const isDev = computed(() => import.meta.env.DEV)

    const devLogin = async () => {
      isLoggingIn.value = true
      try {
        const apiUrl = import.meta.env.VITE_API_URL || ''
        const response = await axios.post(`${apiUrl}/api/auth/dev-login`)
        token.value = response.data.token
        user.value = response.data.user
        localStorage.setItem('auth_token', response.data.token)
      } catch (err) {
        console.error('Dev login failed:', err)
        error.value = 'Dev login failed'
      } finally {
        isLoggingIn.value = false
      }
    }

    onMounted(() => {
      // Wait for Google script to load
      const checkGoogleLoaded = setInterval(() => {
        if (window.google && googleButtonRef.value) {
          clearInterval(checkGoogleLoaded)
          initGoogleSignIn(googleButtonRef.value)
        }
      }, 100)

      // Timeout after 10 seconds
      setTimeout(() => clearInterval(checkGoogleLoaded), 10000)
    })

    return {
      googleButtonRef,
      isLoading,
      isLoggingIn,
      error,
      isDev,
      devLogin
    }
  }
}
</script>

<style scoped>
.login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 420px;
  text-align: center;
}

.login-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  color: #333;
}

.login-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.login-content {
  margin: 30px 0;
}

.login-instruction {
  color: #555;
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.5;
}

.google-button-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state p {
  color: #666;
  margin: 0;
}

.error-message {
  background: #fee;
  color: #c00;
  padding: 12px 16px;
  border-radius: 6px;
  margin-top: 20px;
  font-size: 13px;
  border: 1px solid #fcc;
}

.login-footer {
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.login-footer p {
  margin: 0;
  color: #999;
  font-size: 12px;
}

.dev-login-section {
  margin-top: 24px;
}

.dev-divider {
  display: flex;
  align-items: center;
  margin: 16px 0;
}

.dev-divider::before,
.dev-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #ddd;
}

.dev-divider span {
  padding: 0 12px;
  color: #999;
  font-size: 12px;
  text-transform: uppercase;
}

.dev-login-btn {
  width: 100%;
  padding: 12px 24px;
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.dev-login-btn:hover:not(:disabled) {
  background: #eee;
  border-color: #ccc;
}

.dev-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
