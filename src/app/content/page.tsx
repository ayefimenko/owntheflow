'use client'

import PermissionGuard from '@/components/PermissionGuard'
import ContentDashboard from '@/components/ContentDashboard'

export default function ContentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <PermissionGuard
        role={['admin', 'content_manager']}
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h1>
              <p className="text-gray-600 mb-6">
                You need to be a content manager or admin to access this page.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.href = '/'}
                  className="block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
                  type="button"
                >
                  Back to Home
                </button>
                <p className="text-sm text-gray-500">
                  Please sign in with an admin or content manager account.
                </p>
              </div>
            </div>
          </div>
        }
      >
        <ContentDashboard />
      </PermissionGuard>
    </div>
  )
} 