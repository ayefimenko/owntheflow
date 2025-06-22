'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import AuthForm from '@/components/AuthForm'
import UserProfile from '@/components/UserProfile'

export default function Home() {
  const { user, loading, hydrated, resendConfirmation } = useAuth()
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [showAuth, setShowAuth] = useState(false)
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const [showEmailNotConfirmed, setShowEmailNotConfirmed] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('')
  const [resendingEmail, setResendingEmail] = useState(false)

  const toggleAuthMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
  }

  const handleSignupSuccess = (email: string) => {
    setSignupEmail(email)
    setShowAuth(false)
    setShowEmailConfirmation(true)
  }

  const handleEmailNotConfirmed = (email: string) => {
    setUnconfirmedEmail(email)
    setShowAuth(false)
    setShowEmailNotConfirmed(true)
  }

  const handleBackToAuth = () => {
    setShowEmailConfirmation(false)
    setShowEmailNotConfirmed(false)
    setShowAuth(true)
    setAuthMode('signin')
  }

  const handleResendConfirmation = async () => {
    setResendingEmail(true)
    try {
      console.log('Resending confirmation email to:', unconfirmedEmail)
      const { error } = await resendConfirmation(unconfirmedEmail)
      
      if (error) {
        console.error('Error resending confirmation email:', error.message)
        // You could show an error message to the user here
        alert(`Error resending email: ${error.message}`)
      } else {
        console.log('Confirmation email resent successfully!')
        // Show success and redirect to email confirmation page
        setSignupEmail(unconfirmedEmail)
        setShowEmailNotConfirmed(false)
        setShowEmailConfirmation(true)
      }
    } catch (error) {
      console.error('Exception during resend confirmation:', error)
      alert('An unexpected error occurred while resending the email.')
    } finally {
      setResendingEmail(false)
    }
  }

  // Show loading during auth operations
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading while auth context is initializing
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    )
  }

  // If user is authenticated, show their profile
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <UserProfile />
      </div>
    )
  }

  // Show authentication form
  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-full max-w-md">
          <AuthForm 
            mode={authMode} 
            onToggleMode={toggleAuthMode}
            onBack={() => setShowAuth(false)}
            onSignupSuccess={handleSignupSuccess}
            onEmailNotConfirmed={handleEmailNotConfirmed}
          />
        </div>
      </div>
    )
  }

  // Show email confirmation
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            {/* Success Icon */}
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Check Your Email
            </h2>
            
            <p className="text-gray-600 mb-6">
              We&apos;ve sent a confirmation email to:
            </p>
            
            <p className="text-lg font-semibold text-blue-600 mb-6">
              {signupEmail}
            </p>
            
            <p className="text-sm text-gray-500 mb-8">
              Please check your inbox and click the confirmation link to activate your account. 
              Don&apos;t forget to check your spam folder if you don&apos;t see it in your inbox.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleBackToAuth}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Back to Sign In
              </button>
              
              <button
                onClick={() => {
                  setShowEmailConfirmation(false)
                  setShowAuth(false)
                }}
                className="w-full text-gray-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show email not confirmed
  if (showEmailNotConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            {/* Warning Icon */}
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 mb-4">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.697 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Email Not Confirmed
            </h2>
            
            <p className="text-gray-600 mb-6">
              The email address {unconfirmedEmail} has not been confirmed.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm mb-6">
              <p className="font-medium mb-1">What to do next:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Check your email inbox for a confirmation message</li>
                <li>Check your spam/junk folder</li>
                <li>Click the confirmation link in the email</li>
                <li>Or request a new confirmation email below</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleResendConfirmation}
                disabled={resendingEmail}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resendingEmail ? 'Sending...' : 'Resend Confirmation Email'}
              </button>
              
              <button
                onClick={handleBackToAuth}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Back to Sign In
              </button>
              
              <button
                onClick={() => {
                  setShowEmailNotConfirmed(false)
                  setShowAuth(false)
                }}
                className="w-full text-gray-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show landing page (default state)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Own The Flow
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Understand systems. Lead smarter.
            </p>
            <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
              AI-powered online learning platform for business professionals to understand 
              technical systems, tools, and workflows like never before.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setAuthMode('signup')
                  setShowAuth(true)
                }}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Get Started
              </button>
              <button
                onClick={() => {
                  setAuthMode('signin')
                  setShowAuth(true)
                }}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-blue-600 text-4xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold mb-3">AI-Powered Learning</h3>
              <p className="text-gray-600">
                Leverage artificial intelligence to understand complex business systems and workflows.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-blue-600 text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-3">Fast Understanding</h3>
              <p className="text-gray-600">
                Quickly grasp technical concepts and tools that drive modern business operations.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-blue-600 text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-3">Business Focused</h3>
              <p className="text-gray-600">
                Designed specifically for business professionals who need to understand technical systems.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Own The Flow?
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Join thousands of business professionals who are mastering technical systems.
            </p>
            <button
              onClick={() => {
                setAuthMode('signup')
                setShowAuth(true)
              }}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Learning Today
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
