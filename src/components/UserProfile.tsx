'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import RoleBadge from './RoleBadge'
import { AdminOnly, ContentManagerOnly } from './PermissionGuard'
import { ROLE_PERMISSIONS } from '@/types/auth'

export default function UserProfile() {
  const { user, profile, signOut, updateProfile, isAdmin, isContentManager } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const success = await updateProfile({
      display_name: displayName,
      bio: bio,
    })
    
    if (success) {
      setIsEditing(false)
    }
    setSaving(false)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  if (!user || !profile) return null

  const userPermissions = profile ? ROLE_PERMISSIONS[profile.role] : []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">
              {profile.role === 'admin' ? '👑' : profile.role === 'content_manager' ? '✏️' : '🎓'}
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {profile.display_name || 'Anonymous User'}
            </h2>
            <RoleBadge role={profile.role} />
          </div>
          
          <p className="text-gray-600">
            {profile.bio || 'Learning to own the flow! 🌊'}
          </p>
        </div>

        {/* Edit Profile Section */}
        <div className="border-t pt-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your display name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us about yourself..."
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setDisplayName(profile.display_name || '')
                    setBio(profile.bio || '')
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
        
        <div className="grid gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Email</div>
            <div className="font-medium text-gray-900">{user.email}</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
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

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Member Since</div>
            <div className="font-medium text-gray-900">
              {new Date(profile.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Permissions & Access */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Permissions</h3>
        
        <div className="space-y-3">
          {userPermissions.map((permission, index) => (
            <div key={index} className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg">
              <span className="text-green-600">✓</span>
              <span className="text-sm">
                <strong className="capitalize">{permission.action}</strong> {permission.resource}
              </span>
            </div>
          ))}
        </div>

        {/* Role-specific messages */}
        <div className="mt-4 p-4 rounded-lg border-l-4 border-blue-400 bg-blue-50">
          {isAdmin() && (
            <p className="text-blue-800 text-sm">
              🔥 <strong>Administrator Access:</strong> You have full control over the platform, including user management and content publishing.
            </p>
          )}
          
          {isContentManager() && !isAdmin() && (
            <p className="text-blue-800 text-sm">
              ✏️ <strong>Content Manager Access:</strong> You can create and edit learning content. Contact an admin to publish your work.
            </p>
          )}
          
          {!isAdmin() && !isContentManager() && (
            <p className="text-blue-800 text-sm">
              🎓 <strong>Learner Access:</strong> Enjoy unlimited access to all learning content. Ready to start your technical journey!
            </p>
          )}
        </div>
      </div>

      {/* Admin Panel Access */}
      <AdminOnly>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-4">👑 Admin Panel</h3>
          <p className="text-red-700 mb-4 text-sm">
            Access administrative features to manage users, content, and platform settings.
          </p>
          <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors">
            Open Admin Panel
          </button>
        </div>
      </AdminOnly>

      {/* Content Manager Panel */}
      <ContentManagerOnly>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">✏️ Content Manager</h3>
          <p className="text-blue-700 mb-4 text-sm">
            Create and manage learning content, lessons, and course materials.
          </p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
            Content Dashboard
          </button>
        </div>
      </ContentManagerOnly>

      {/* Sign Out */}
      <div className="text-center">
        <button
          onClick={handleSignOut}
          className="bg-red-600 text-white py-2 px-6 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
} 