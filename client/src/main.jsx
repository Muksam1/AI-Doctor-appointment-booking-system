import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'

const defaultGoogleClientId = '1082786291257-e09e2fcg0b1hcmuhc1orb21192vb31f2.apps.googleusercontent.com'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || defaultGoogleClientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
