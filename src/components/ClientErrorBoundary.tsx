'use client'

import ErrorBoundary from './ErrorBoundary'

interface ClientErrorBoundaryProps {
  children: React.ReactNode
}

export default function ClientErrorBoundary({ children }: ClientErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: any) => {
    // Log errors in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Application Error:', error, errorInfo);
      // Here you could send to error tracking service
    }
  }

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  )
} 