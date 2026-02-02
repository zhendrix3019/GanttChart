import { createApp } from 'vue'
import axios from 'axios'
import App from './App.vue'
import './style.css'

// Set axios base URL for production
const apiUrl = import.meta.env.VITE_API_URL
if (apiUrl) {
  axios.defaults.baseURL = apiUrl
}

createApp(App).mount('#app')
