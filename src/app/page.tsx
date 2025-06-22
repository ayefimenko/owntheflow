'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import AuthForm from '@/components/AuthForm'
import UserProfile from '@/components/UserProfile'

export default function Home() {
  const { user, loading } = useAuth()
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [showAuth, setShowAuth] = useState(false)

  const toggleAuthMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
  }

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

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <UserProfile />
      </div>
    )
  }

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <button
            onClick={() => setShowAuth(false)}
            className="mb-4 text-blue-600 hover:text-blue-700 font-medium flex items-center"
          >
            ← Back to home
          </button>
          <AuthForm mode={authMode} onToggleMode={toggleAuthMode} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Brand Header */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            🏄 Own The Flow
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            Understand systems. Lead smarter.
          </p>
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            An AI-powered online learning platform designed for business-oriented professionals — 
            COOs, Project Managers, Product Managers, Delivery Directors, and Founders — 
            who seek to understand technical systems, tools, and workflows.
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">🎯 Target Audience</h3>
              <p className="text-gray-700">Business leaders who need to collaborate confidently with developers</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">🤖 AI-Powered</h3>
              <p className="text-gray-700">Personalized learning with intelligent mentorship and feedback</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">🏆 Gamified</h3>
              <p className="text-gray-700">XP system, levels, badges, and certificates with LinkedIn integration</p>
            </div>
          </div>
        </div>

        {/* Authentication CTA */}
        <div className="mb-8">
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setAuthMode('signup')
                setShowAuth(true)
              }}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Get Started
            </button>
            <button
              onClick={() => {
                setAuthMode('signin')
                setShowAuth(true)
              }}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-medium border-2 border-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Development Status */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🚧</span>
            </div>
            <div className="ml-3 text-left">
              <h3 className="text-sm font-medium text-yellow-800">
                Development in Progress
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                MVP Sprint 1: Core Setup & Auth - Supabase Authentication ✅
              </p>
            </div>
          </div>
        </div>

        {/* Tech Stack Info */}
        <div className="mt-8 text-sm text-gray-500">
          <p>Built with Next.js 15, Tailwind CSS, TypeScript, and Supabase</p>
        </div>
      </div>
    </div>
  );
}
