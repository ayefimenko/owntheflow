'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { DatabaseService } from '@/lib/database'
import type { UserProfile, Resource, Action } from '@/types/auth'
import { hasPermission } from '@/types/auth'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  hydrated: boolean
  signUp: (_email: string, _password: string, _fullName: string) => Promise<{ data?: any; error?: any }>
  signIn: (_email: string, _password: string) => Promise<{ data?: any; error?: any }>
  signOut: () => Promise<void>
  resendConfirmation: (_email: string) => Promise<{ data?: any; error?: any }>
  hasPermission: (_resource: Resource, _action: Action) => boolean
  isRole: (_role: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false) // Start as not hydrated to prevent SSR issues
  
  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('AuthContext: Starting initialization...', { supabase: !!supabase, auth: !!supabase?.auth })
        }
        
        if (!supabase?.auth) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Supabase not available - skipping auth initialization')
          }
          if (mounted) {
            setHydrated(true)
          }
          return
        }

        // Get current session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted && session?.user) {
          setUser(session.user)
          // Load user profile
          try {
            const profile = await DatabaseService.getUserProfile(session.user.id)
            if (profile) {
              setUserProfile(profile)
            }
          } catch (profileError) {
            console.error('Error loading user profile:', profileError)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (mounted) {
          setHydrated(true)
        }
      }
    }

    initializeAuth()
    
    return () => {
      mounted = false
    }
  }, [])

  // Set up auth state listener
  useEffect(() => {
    if (!supabase?.auth) {
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        console.log('AuthContext: Auth state change:', { event, hasUser: !!session?.user, email: session?.user?.email })
        
        if (session?.user) {
          setUser(session.user)
          
          // Load user profile with delay for database trigger
          setTimeout(async () => {
            try {
              const profile = await DatabaseService.getUserProfile(session.user.id)
              setUserProfile(profile)
              console.log('AuthContext: User profile loaded:', { hasProfile: !!profile, role: profile?.role })
            } catch (error) {
              console.error('Error loading user profile:', error)
            }
          }, 1000)
        } else {
          setUser(null)
          setUserProfile(null)
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      if (!supabase?.auth) {
        console.error('AuthContext: Supabase auth not available')
        return { error: { message: 'Authentication service not available' } }
      }

      console.log('AuthContext: Starting signup for:', email)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            display_name: fullName
          },
        },
      })

      console.log('AuthContext: Signup response:', { 
        hasData: !!data, 
        hasUser: !!data?.user, 
        hasSession: !!data?.session,
        hasError: !!error, 
        error: error?.message 
      })

      if (error) {
        // Return error without logging - let the UI component handle display
        return { error }
      }

      console.log('AuthContext: Signup successful!')
      return { data }
    } catch (error: any) {
      // Return error without logging - let the UI component handle display
      return { error: { message: error?.message || 'Unknown signup error' } }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      if (!supabase?.auth) {
        return { error: { message: 'Authentication service not available' } }
      }

      console.log('AuthContext: Attempting sign in for:', email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Return error without logging - let the UI component handle display
        return { error }
      }

      console.log('AuthContext: Sign in successful:', { hasUser: !!data?.user, hasSession: !!data?.session })
      return { data }
    } catch (error: any) {
      // Return error without logging - let the UI component handle display
      return { error: { message: error?.message || 'Unknown signin error' } }
    }
  }

  const signOut = async () => {
    try {
      if (supabase?.auth) {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.error('Supabase signOut error:', error.message)
        }
      }
      
      // Always clear local state
      setUser(null)
      setUserProfile(null)
    } catch (error) {
      console.error('Exception during signOut:', error)
      // Still clear local state
      setUser(null)
      setUserProfile(null)
    }
  }

  const resendConfirmation = async (email: string) => {
    try {
      if (!supabase?.auth) {
        console.error('AuthContext: Supabase auth not available')
        return { error: { message: 'Authentication service not available' } }
      }

      console.log('AuthContext: Resending confirmation email to:', email)
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      console.log('AuthContext: Resend confirmation response:', { 
        hasData: !!data,
        hasError: !!error, 
        error: error?.message 
      })

      if (error) {
        console.error('AuthContext: Resend confirmation error:', error.message)
        return { error }
      }

      console.log('AuthContext: Confirmation email resent successfully!')
      return { data }
    } catch (error: any) {
      console.error('AuthContext: Resend confirmation exception:', error)
      return { error: { message: error?.message || 'Unknown resend error' } }
    }
  }

  const checkPermission = (resource: Resource, action: Action): boolean => {
    if (!hydrated || !userProfile) {
      return false
    }
    return hasPermission(userProfile.role, resource, action)
  }

  const isRole = (role: string): boolean => {
    if (!hydrated || !userProfile) {
      return false
    }
    return userProfile.role === role
  }

  const value = {
    user,
    userProfile,
    loading,
    hydrated,
    signUp,
    signIn,
    signOut,
    resendConfirmation,
    hasPermission: checkPermission,
    isRole,
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