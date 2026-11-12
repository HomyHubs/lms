import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { DemoGate } from './demo/DemoGate'
import { installDemoFetch } from './demo/interceptor'
import './index.css'

// Cài interceptor demo TRƯỚC khi app mount (chỉ hoạt động khi VITE_DEMO='1').
installDemoFetch()

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DemoGate />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
