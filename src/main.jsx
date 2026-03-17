import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import AppErrorBoundary from '@/components/AppErrorBoundary.jsx'
import { validateEnv } from '@/core/utils/validateEnv'
import '@/core/design/tokens.css'
import '@/core/design/animations.css'
import '@/core/shell/depth.css'
import '@/index.css'

async function bootstrap() {
  await validateEnv()

  ReactDOM.createRoot(document.getElementById('root')).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  )
}

bootstrap().catch((error) => {
  console.error('[main] Startup blocked by environment validation:', error)
})
