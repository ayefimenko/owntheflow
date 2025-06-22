'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import ErrorBoundary from './ErrorBoundary'

interface AuthProviderWrapperProps {
  children: React.ReactNode
}

export default function AuthProviderWrapper({ children }: AuthProviderWrapperProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ErrorBoundary>
  )
} 