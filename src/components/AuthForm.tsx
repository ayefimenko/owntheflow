'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface AuthFormProps {
  mode: 'signin' | 'signup'
  onToggleMode: () => void
  onBack?: () => void
  onSignupSuccess?: (email: string) => void
  onEmailNotConfirmed?: (email: string) => void
}

interface AuthError {
  type: 'invalid_credentials' | 'email_not_confirmed' | 'too_many_attempts' | 'network_error' | 'server_error' | 'validation_error' | 'unknown'
  message: string
  suggestion?: string
  canRetry?: boolean
  canResendEmail?: boolean
}

export default function AuthForm({ mode, onToggleMode, onBack, onSignupSuccess, onEmailNotConfirmed }: AuthFormProps) {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<AuthError | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Debug effect
  useEffect(() => {
    console.log('🎨 AuthForm: authError state changed:', authError)
  }, [authError])

  const categorizeError = (errorMessage: string): AuthError => {
    const message = errorMessage.toLowerCase()
    
    if (message.includes('invalid login credentials') || 
        message.includes('invalid email or password') ||
        message.includes('wrong password') ||
        message.includes('user not found')) {
      return {
        type: 'invalid_credentials',
        message: 'Invalid email or password',
        suggestion: 'Please check your email and password and try again.',
        canRetry: true
      }
    }
    
    if (message.includes('email not confirmed') || 
        message.includes('confirm your email') ||
        message.includes('unconfirmed')) {
      return {
        type: 'email_not_confirmed',
        message: 'Email not confirmed',
        suggestion: 'Please check your email and click the confirmation link.',
        canResendEmail: true
      }
    }
    
    if (message.includes('too many requests') ||
        message.includes('rate limit') ||
        message.includes('too many attempts')) {
      return {
        type: 'too_many_attempts',
        message: 'Too many login attempts',
        suggestion: 'Please wait a few minutes before trying again.',
        canRetry: false
      }
    }
    
    if (message.includes('network') || 
        message.includes('fetch') ||
        message.includes('connection')) {
      return {
        type: 'network_error',
        message: 'Connection problem',
        suggestion: 'Please check your internet connection and try again.',
        canRetry: true
      }
    }
    
    if (message.includes('server') || 
        message.includes('internal') ||
        message.includes('500')) {
      return {
        type: 'server_error',
        message: 'Server temporarily unavailable',
        suggestion: 'Please try again in a few moments.',
        canRetry: true
      }
    }
    
    return {
      type: 'unknown',
      message: errorMessage,
      suggestion: 'If this problem persists, please contact support.',
      canRetry: true
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent all possible form submission behaviors
    e.preventDefault()
    e.stopPropagation()
    
    // Additional safety check
    if (e.nativeEvent) {
      e.nativeEvent.preventDefault?.()
      e.nativeEvent.stopPropagation?.()
    }
    
    console.log('🔄 AuthForm: Form submitted, preventing default behavior')
    
    try {
      setLoading(true)
      setAuthError(null)
      setMessage(null)
      if (mode === 'signup') {
        console.log('📝 AuthForm: Starting signup process for:', email)
        console.log('📝 AuthForm: Calling signUp function...')
        
        const result = await signUp(email, password, email.split('@')[0])
        console.log('📝 AuthForm: SignUp function returned:', result)
        
        const { data, error } = result || {}
        console.log('📝 AuthForm: Destructured result:', { hasData: !!data, hasError: !!error, error: error?.message })
        
        if (error) {
          setAuthError(categorizeError(error.message))
        } else {
          console.log('✅ AuthForm: Signup successful!')
          
          if (onSignupSuccess) {
            // Call the success callback to show email confirmation page
            onSignupSuccess(email)
          } else {
            // Fallback: show success message in form
            setMessage('Account created! Check your email for confirmation.')
            // Clear form
            setEmail('')
            setPassword('')
            
            // Auto-hide success message after a few seconds
            setTimeout(() => {
              setMessage(null)
            }, 5000)
          }
        }
      } else {
        console.log('🔑 AuthForm: Starting sign in process...')
        const { data, error } = await signIn(email, password)
        
        if (error) {
          console.log('❌ AuthForm: Sign in error detected:', error.message)
          const categorizedError = categorizeError(error.message)
          console.log('🔍 AuthForm: Categorized error:', categorizedError)
          
          // Check if the error is related to email confirmation
          if (categorizedError.type === 'email_not_confirmed') {
            console.log('📧 AuthForm: Email not confirmed, handling...')
            if (onEmailNotConfirmed) {
              onEmailNotConfirmed(email)
            } else {
              setAuthError(categorizedError)
            }
          } else {
            console.log('🎯 AuthForm: Setting auth error:', categorizedError)
            setAuthError(categorizedError)
            console.log('🎯 AuthForm: Auth error has been set, returning early')
            return // Important: return early to prevent any further processing
          }
        } else if (data?.user) {
          console.log('✅ AuthForm: Sign in successful, user:', data.user.email)
          setMessage('Successfully signed in! Loading your profile...')
          // Clear form
          setEmail('')
          setPassword('')
          
          // Auto-hide success message after a few seconds
          setTimeout(() => {
            setMessage(null)
          }, 3000)
        } else {
          console.warn('⚠️ AuthForm: Sign in returned no error but no user data')
          setAuthError({
            type: 'unknown',
            message: 'Sign in failed - no user data returned',
            suggestion: 'Please try again or contact support if the problem persists.',
            canRetry: true
          })
        }
      }
    } catch (_err) {
      console.error('💥 AuthForm: Unexpected error during form submission:', _err)
      setAuthError({
        type: 'unknown',
        message: 'An unexpected error occurred: ' + (_err instanceof Error ? _err.message : String(_err)),
        suggestion: 'Please try again or contact support if the problem persists.',
        canRetry: true
      })
    } finally {
      console.log('🏁 AuthForm: Form submission completed, setting loading to false')
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setAuthError(null)
    setEmail('')
    setPassword('')
  }

  const handleForgotPassword = () => {
    // For now, just show a message. In the future, you can implement password reset
    alert('Password reset functionality will be implemented soon. Please contact support for assistance.')
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 text-blue-600 hover:text-blue-700 font-medium flex items-center"
          type="button"
        >
          ← Back to home
        </button>
      )}
      
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === 'signin' ? 'Welcome Back' : 'Join Own The Flow'}
        </h2>
        <p className="text-gray-600 mt-2">
          {mode === 'signin' 
            ? 'Sign in to continue your learning journey' 
            : 'Start understanding systems like never before'
          }
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            placeholder="••••••••"
          />
        </div>

        {/* Enhanced Error Display */}
        {authError && (
          <div className={`border rounded-md p-4 text-sm ${
            authError.type === 'invalid_credentials' 
              ? 'bg-red-50 border-red-200 text-red-800'
              : authError.type === 'email_not_confirmed'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'  
              : authError.type === 'too_many_attempts'
              ? 'bg-orange-50 border-orange-200 text-orange-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {authError.type === 'invalid_credentials' && (
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {authError.type === 'email_not_confirmed' && (
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {(authError.type === 'network_error' || authError.type === 'server_error') && (
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className="font-medium">{authError.message}</h3>
                {authError.suggestion && (
                  <p className="mt-1 text-sm opacity-90">{authError.suggestion}</p>
                )}
                {/* Action buttons */}
                <div className="mt-3 flex space-x-2">
                  {authError.canRetry && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="text-xs font-medium underline hover:no-underline"
                    >
                      Try Again
                    </button>
                  )}
                  {authError.type === 'invalid_credentials' && mode === 'signin' && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs font-medium underline hover:no-underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                                     {authError.canResendEmail === true && onEmailNotConfirmed && (
                    <button
                      type="button"
                      onClick={() => onEmailNotConfirmed(email)}
                      className="text-xs font-medium underline hover:no-underline"
                    >
                      Resend Email
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
            {message}
          </div>
        )}

        <button
          type="button"
          disabled={loading || Boolean(authError && authError.canRetry === false)}
          onClick={(e) => {
            console.log('🖱️ AuthForm: Submit button clicked!', { mode, disabled: loading, email: email ? 'provided' : 'empty', password: password ? 'provided' : 'empty' })
            handleSubmit(e)
          }}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading 
            ? (mode === 'signin' ? 'Signing In...' : 'Creating Account...') 
            : (mode === 'signin' ? 'Sign In' : 'Create Account')
          }
        </button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          {mode === 'signin' ? "Don&apos;t have an account? " : 'Already have an account? '}
          <button
            onClick={onToggleMode}
            className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline"
            type="button"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
} 