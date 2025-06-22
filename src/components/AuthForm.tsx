'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface AuthFormProps {
  mode: 'signin' | 'signup'
  onToggleMode: () => void
  onBack?: () => void
  onSignupSuccess?: (email: string) => void
  onEmailNotConfirmed?: (email: string) => void
}

export default function AuthForm({ mode, onToggleMode, onBack, onSignupSuccess, onEmailNotConfirmed }: AuthFormProps) {
  console.log('🔄 AuthForm: Component rendered with mode:', mode)
  
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  console.log('🔄 AuthForm: Current state:', { mode, email: email ? 'provided' : 'empty', password: password ? 'provided' : 'empty', loading, error, message })

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 AuthForm: Form submitted!', { mode, email: email ? 'provided' : 'empty', password: password ? 'provided' : 'empty' })
    
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'signup') {
        console.log('📝 AuthForm: Starting signup process for:', email)
        console.log('📝 AuthForm: Calling signUp function...')
        
        const result = await signUp(email, password, email.split('@')[0])
        console.log('📝 AuthForm: SignUp function returned:', result)
        
        const { data, error } = result || {}
        console.log('📝 AuthForm: Destructured result:', { hasData: !!data, hasError: !!error, error: error?.message })
        
        if (error) {
          console.error('❌ AuthForm: Signup error:', error.message)
          setError(error.message)
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
          console.error('❌ AuthForm: Sign in error:', error.message)
          
          // Check if the error is related to email confirmation
          if (error.message.toLowerCase().includes('email not confirmed') || 
              error.message.toLowerCase().includes('confirm your email') ||
              error.message.toLowerCase().includes('unconfirmed')) {
            
            console.log('📧 AuthForm: Email not confirmed error detected')
            if (onEmailNotConfirmed) {
              onEmailNotConfirmed(email)
            } else {
              setError('Please check your email and click the confirmation link before signing in.')
            }
          } else {
            setError(error.message)
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
          setError('Sign in failed - no user data returned')
        }
      }
    } catch (_err) {
      console.error('💥 AuthForm: Unexpected error during form submission:', _err)
      setError('An unexpected error occurred: ' + (_err instanceof Error ? _err.message : String(_err)))
    } finally {
      console.log('🏁 AuthForm: Form submission completed, setting loading to false')
      setLoading(false)
    }
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          onClick={() => {
            console.log('🖱️ AuthForm: Submit button clicked!', { mode, disabled: loading, email: email ? 'provided' : 'empty', password: password ? 'provided' : 'empty' })
          }}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading 
            ? (mode === 'signin' ? 'Signing In...' : 'Creating Account...') 
            : (mode === 'signin' ? 'Sign In' : 'Create Account')
          }
        </button>
      </form>

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