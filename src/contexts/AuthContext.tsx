'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { DatabaseService } from '@/lib/database'
import type { UserProfile, UserRole, Resource, Action } from '@/types/auth'
import { hasPermission } from '@/types/auth'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url' | 'bio'>>) => Promise<boolean>
  hasPermission: (resource: Resource, action: Action) => boolean
  isAdmin: () => boolean
  isContentManager: () => boolean
  isUser: () => boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user profile when user changes
  const loadUserProfile = async (userId: string) => {
    try {
      const userProfile = await DatabaseService.getUserProfile(userId)
      setProfile(userProfile)
    } catch (error) {
      console.error('Error loading user profile:', error)
      setProfile(null)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser) {
        await loadUserProfile(currentUser.id)
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser) {
        await loadUserProfile(currentUser.id)
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const updateProfile = async (
    updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url' | 'bio'>>
  ): Promise<boolean> => {
    if (!user) return false

    try {
      const updatedProfile = await DatabaseService.updateUserProfile(user.id, updates)
      if (updatedProfile) {
        setProfile(updatedProfile)
        return true
      }
      return false
    } catch (error) {
      console.error('Error updating profile:', error)
      return false
    }
  }

  const refreshProfile = async () => {
    if (!user) return
    await loadUserProfile(user.id)
  }

  // Permission checking functions
  const checkPermission = (resource: Resource, action: Action): boolean => {
    if (!profile) return false
    return hasPermission(profile.role, resource, action)
  }

  const isAdmin = (): boolean => {
    return profile?.role === 'admin'
  }

  const isContentManager = (): boolean => {
    return profile?.role === 'content_manager'
  }

  const isUser = (): boolean => {
    return profile?.role === 'user'
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    hasPermission: checkPermission,
    isAdmin,
    isContentManager,
    isUser,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 