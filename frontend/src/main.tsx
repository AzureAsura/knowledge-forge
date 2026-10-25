import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { setSessionExpiredHandler } from './lib/api/client'
import { queryClient } from './lib/query/queryClient'
import { router } from './router'

setSessionExpiredHandler(() => {
  queryClient.removeQueries()
  router.navigate(`/auth?next=${encodeURIComponent(location.pathname + location.search)}`)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              'flex items-center gap-3 w-[356px] p-4 bg-base neu-raised rounded-[14px] text-[13px] font-semibold text-[#1F2937]',
            error: 'text-[#EF4444]',
            success: 'text-[#10B981]',
          },
        }}
      />
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  </StrictMode>,
)
