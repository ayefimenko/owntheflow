'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function UserProfile() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  if (!user) return null

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">👤</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome Back!</h2>
        <p className="text-gray-600 mt-2">You're signed in to Own The Flow</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="text-sm text-gray-600 mb-1">Email</div>
        <div className="font-medium text-gray-900">{user.email}</div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="text-sm text-gray-600 mb-1">User ID</div>
        <div className="font-mono text-xs text-gray-700 break-all">{user.id}</div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="text-sm text-gray-600 mb-1">Account Status</div>
        <div className="flex items-center">
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
            user.email_confirmed_at ? 'bg-green-500' : 'bg-yellow-500'
          }`}></span>
          <span className="text-sm font-medium">
            {user.email_confirmed_at ? 'Email Verified' : 'Email Pending Verification'}
          </span>
        </div>
      </div>

      <button
        onClick={handleSignOut}
        className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
      >
        Sign Out
      </button>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          🎉 Ready to start learning? The dashboard will be available soon!
        </p>
      </div>
    </div>
  )
} 