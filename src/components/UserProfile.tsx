'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import RoleBadge from './RoleBadge'
// Permission guards available if needed
// import { AdminOnly, ContentManagerOnly } from './PermissionGuard'
import { ROLE_PERMISSIONS } from '@/types/auth'
import { DatabaseService } from '@/lib/database'
import { ContentService } from '@/lib/content'
import type { UserXP, XPLevel, UserLearningStats, Certificate } from '@/types/content'

export default function UserProfile() {
  const { user, userProfile, signOut, isRole } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(userProfile?.display_name || '')
  const [bio, setBio] = useState(userProfile?.bio || '')
  const [saving, setSaving] = useState(false)
  
  // Sprint 6: XP and progress tracking
  const [userXP, setUserXP] = useState<UserXP | null>(null)
  const [userStats, setUserStats] = useState<UserLearningStats | null>(null)
  const [xpLevels, setXpLevels] = useState<XPLevel[]>([])
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)
  const [newLevelAchieved, setNewLevelAchieved] = useState<XPLevel | null>(null)
  
  // Sprint 7: Certificates
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loadingCertificates, setLoadingCertificates] = useState(false)

  // Component state logging only in development
  if (process.env.NODE_ENV === 'development') {
    console.log('UserProfile render - user:', user?.email || 'none', 'profile:', userProfile?.role || 'none')
  }

  // Load XP data and certificates when user is authenticated
  useEffect(() => {
    async function loadUserData() {
      if (!user) return

      try {
        setLoadingCertificates(true)
        const [xpData, statsData, levelsData, certsData] = await Promise.all([
          ContentService.getUserXP(user.id),
          ContentService.getUserLearningStats(user.id),
          ContentService.getXPLevels(),
          ContentService.getUserCertificates(user.id)
        ])

        setUserXP(xpData)
        setUserStats(statsData)
        setXpLevels(levelsData)
        setCertificates(certsData || [])
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoadingCertificates(false)
      }
    }

    loadUserData()
  }, [user])

  const handleSave = async () => {
    if (!user) {
      return
    }
    
    setSaving(true)
    try {
      const updatedProfile = await DatabaseService.updateUserProfile(user.id, {
        display_name: displayName,
        bio: bio,
      })
      
      if (updatedProfile) {
        setIsEditing(false)
      } else {
        console.error('Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    }
    setSaving(false)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error during sign out:', error)
    }
  }

  // Get current level details
  const getCurrentLevel = () => {
    if (!userXP || !xpLevels.length) return null
    return xpLevels.find(level => level.level_id === userXP.level_id) || xpLevels[0]
  }

  // Get next level details  
  const getNextLevel = () => {
    if (!userXP || !xpLevels.length) return null
    const nextLevelId = userXP.level_id + 1
    return xpLevels.find(level => level.level_id === nextLevelId) || null
  }

  // Calculate progress to next level
  const getXPProgress = () => {
    if (!userXP || !xpLevels.length) return { current: 0, needed: 100, percentage: 0 }
    
    const currentLevel = getCurrentLevel()
    const nextLevel = getNextLevel()
    
    if (!currentLevel || !nextLevel) {
      return { current: userXP.total_xp, needed: userXP.total_xp, percentage: 100 }
    }

    const currentLevelXP = currentLevel.xp_required
    const nextLevelXP = nextLevel.xp_required
    const progressXP = userXP.total_xp - currentLevelXP
    const neededXP = nextLevelXP - currentLevelXP
    const percentage = Math.min(100, Math.max(0, (progressXP / neededXP) * 100))

    return { 
      current: progressXP, 
      needed: neededXP, 
      percentage: Math.round(percentage) 
    }
  }

  // Show loading if user exists but profile is still loading
  if (user && !userProfile) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // Show error if no user or profile
  if (!user || !userProfile) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700">Unable to load user profile. Please try signing in again.</p>
          <button
            onClick={handleSignOut}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  const userPermissions = ROLE_PERMISSIONS[userProfile.role] || []
  const isAdmin = isRole('admin')
  const isContentManager = isRole('content_manager')
  const currentLevel = getCurrentLevel()
  const nextLevel = getNextLevel()
  const xpProgress = getXPProgress()

  // Profile rendering complete

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">
              {userProfile.role === 'admin' ? '👑' : userProfile.role === 'content_manager' ? '✏️' : currentLevel?.badge_icon || '🎓'}
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {userProfile.display_name || 'Anonymous User'}
            </h2>
            <RoleBadge role={userProfile.role} />
          </div>

          {/* XP Title Display */}
          {currentLevel && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-lg font-semibold" style={{ color: currentLevel.badge_color }}>
                {currentLevel.badge_icon} {currentLevel.title}
              </span>
              <span className="text-sm text-gray-500">Level {userXP?.level_id}</span>
            </div>
          )}
          
          <p className="text-gray-600">
            {userProfile.bio || 'Learning to own the flow! 🌊'}
          </p>
        </div>

                {/* XP Progress Section */}
        {userStats && userXP && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Learning Progress</h3>
              <div className="text-right">
                 <div className="text-2xl font-bold text-blue-600">{userXP.total_xp}</div>
                 <div className="text-sm text-gray-600">Total XP</div>
               </div>
            </div>

            {/* Progress Bar */}
            {nextLevel && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress to {nextLevel.title}</span>
                  <span>{xpProgress.current}/{xpProgress.needed} XP</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${xpProgress.percentage}%` }}
                  ></div>
                </div>
                <div className="text-center mt-2 text-sm text-gray-600">
                  {xpProgress.percentage}% to next level
                </div>
              </div>
            )}

            {/* Learning Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{userStats.lessons_completed}</div>
                <div className="text-xs text-gray-600">Lessons</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-600">{userStats.courses_completed}</div>
                <div className="text-xs text-gray-600">Courses</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600">{userStats.challenges_completed}</div>
                <div className="text-xs text-gray-600">Challenges</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-600">{userStats.certificates_earned}</div>
                <div className="text-xs text-gray-600">Certificates</div>
              </div>
            </div>
          </div>
        )}

        {/* Certificates Section */}
        {certificates.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">🎓 Your Certificates</h3>
              <span className="text-sm text-gray-600">{certificates.length} earned</span>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {certificates.slice(0, 4).map((cert) => (
                <div key={cert.id} className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">
                        {cert.path?.title || cert.course?.title || cert.title}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">
                        {cert.certificate_type === 'completion' ? 'Completion Certificate' : 'Achievement Certificate'}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9l2 2 4-4m6-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {new Date(cert.issued_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      cert.status === 'issued' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(`/cert/${cert.verification_code}`, '_blank')}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/cert/${cert.verification_code}`
                        navigator.clipboard.writeText(url)
                      }}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {certificates.length > 4 && (
              <div className="text-center mt-4">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all {certificates.length} certificates
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty Certificates State */}
        {certificates.length === 0 && !loadingCertificates && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-gray-900 font-medium mb-2">No certificates yet</h3>
            <p className="text-gray-600 text-sm mb-4">
              Complete learning paths and courses to earn certificates!
            </p>
            <button
              type="button"
              onClick={() => window.location.href = '/learn'}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Start Learning
            </button>
          </div>
        )}

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
                  type="button"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setDisplayName(userProfile.display_name || '')
                    setBio(userProfile.bio || '')
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              type="button"
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
              {new Date(userProfile.created_at).toLocaleDateString('en-US', {
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
          {isAdmin && (
            <p className="text-blue-800 text-sm">
              🔥 <strong>Administrator Access:</strong> You have full control over the platform, including user management and content publishing.
            </p>
          )}
          
          {isContentManager && !isAdmin && (
            <p className="text-blue-800 text-sm">
              ✏️ <strong>Content Manager Access:</strong> You can create and edit learning content. Contact an admin to publish your work.
            </p>
          )}
          
          {!isAdmin && !isContentManager && (
            <p className="text-blue-800 text-sm">
              🎓 <strong>Learner Access:</strong> Enjoy unlimited access to all learning content. Ready to start your technical journey!
            </p>
          )}
        </div>
      </div>

      {/* Content Management Access */}
      {(isAdmin || isContentManager) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            {isAdmin ? '👑 Content Management' : '✏️ Content Management'}
          </h3>
          <p className="text-blue-700 mb-4 text-sm">
            {isAdmin 
              ? 'Manage all platform content, publish lessons, and oversee the learning experience.'
              : 'Create and edit learning content. Contact an admin to publish your work.'
            }
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => window.location.href = '/content'}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              type="button"
            >
              Open Content Dashboard
            </button>
            {isAdmin && (
              <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors" type="button">
                Admin Settings
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sign Out */}
      <div className="text-center">
        <button
          onClick={handleSignOut}
          className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          type="button"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
} 