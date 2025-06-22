import { supabase } from './supabase'
import type { UserProfile, UserRole, Resource, Action } from '@/types/auth'

export class DatabaseService {
  // User Profile Management
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      if (!supabase?.from) {
        console.warn('Database service not available')
        return null
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)

      if (error) {
        console.error('Error fetching user profile:', error.message)
        return null
      }

      if (!data || data.length === 0) {
        return null
      }

      if (data.length > 1) {
        console.warn('Multiple profiles found for user, using the first one')
      }

      return data[0]
    } catch (error) {
      console.error('Exception in getUserProfile:', error)
      return null
    }
  }

  static async createUserProfile(
    userId: string, 
    displayName: string, 
    role: UserRole = 'user'
  ): Promise<UserProfile | null> {
    try {
      if (!supabase?.from) {
        console.warn('Database service not available')
        return null
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          display_name: displayName,
          role,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating user profile:', error.message)
        return null
      }

      return data
    } catch (error) {
      console.error('Exception in createUserProfile:', error)
      return null
    }
  }

  static async updateUserProfile(
    userId: string, 
    updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url' | 'bio'>>
  ): Promise<UserProfile | null> {
    try {
      if (!supabase?.from) {
        console.warn('Database service not available')
        return null
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating user profile:', error.message)
        return null
      }

      return data
    } catch (error) {
      console.error('Exception in updateUserProfile:', error)
      return null
    }
  }

  static async updateUserRole(
    userId: string, 
    role: UserRole
  ): Promise<UserProfile | null> {
    try {
      if (!supabase?.from) {
        console.warn('Database service not available')
        return null
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating user role:', error.message)
        return null
      }

      return data
    } catch (error) {
      console.error('Exception in updateUserRole:', error)
      return null
    }
  }

  // Admin functions
  static async getAllUsers(): Promise<UserProfile[]> {
    try {
      if (!supabase?.from) {
        console.warn('Database service not available')
        return []
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching all users:', error.message)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Exception in getAllUsers:', error)
      return []
    }
  }

  static async getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    try {
      if (!supabase?.from) {
        console.warn('Database service not available')
        return []
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users by role:', error.message)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Exception in getUsersByRole:', error)
      return []
    }
  }

  // Permission checking functions
  static async userHasPermission(
    userId: string, 
    resource: Resource, 
    action: Action
  ): Promise<boolean> {
    try {
      if (!supabase?.rpc) {
        console.warn('Database service not available')
        return false
      }

      const { data, error } = await supabase
        .rpc('user_has_permission', {
          user_id: userId,
          check_resource: resource,
          check_action: action
        })

      if (error) {
        console.error('Error checking user permission:', error.message)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Exception in userHasPermission:', error)
      return false
    }
  }

  static async getUserRole(userId: string): Promise<UserRole> {
    try {
      if (!supabase?.rpc) {
        console.warn('Database service not available')
        return 'user'
      }

      const { data, error } = await supabase
        .rpc('get_user_role', {
          user_id: userId
        })

      if (error) {
        console.error('Error getting user role:', error.message)
        return 'user'
      }

      return data || 'user'
    } catch (error) {
      console.error('Exception in getUserRole:', error)
      return 'user'
    }
  }

  // Batch operations
  static async batchUpdateUserRoles(
    updates: Array<{ userId: string; role: UserRole }>
  ): Promise<boolean> {
    try {
      const promises = updates.map(({ userId, role }) =>
        this.updateUserRole(userId, role)
      )

      await Promise.all(promises)
      return true
    } catch (error) {
      console.error('Error in batch update user roles:', error)
      return false
    }
  }

  // Analytics functions
  static async getUserStats(): Promise<{
    total: number
    admins: number
    contentManagers: number
    users: number
  }> {
    try {
      if (!supabase?.from) {
        console.warn('Database service not available')
        return { total: 0, admins: 0, contentManagers: 0, users: 0 }
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')

      if (error) {
        console.error('Error fetching user stats:', error.message)
        return { total: 0, admins: 0, contentManagers: 0, users: 0 }
      }

      const stats = {
        total: data?.length || 0,
        admins: data?.filter((u: any) => u.role === 'admin').length || 0,
        contentManagers: data?.filter((u: any) => u.role === 'content_manager').length || 0,
        users: data?.filter((u: any) => u.role === 'user').length || 0,
      }

      return stats
    } catch (error) {
      console.error('Exception in getUserStats:', error)
      return { total: 0, admins: 0, contentManagers: 0, users: 0 }
    }
  }

  static async searchUsers(query: string): Promise<UserProfile[]> {
    try {
      if (!supabase?.from) {
        console.warn('Database service not available')
        return []
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .or(`display_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error searching users:', error.message)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Exception in searchUsers:', error)
      return []
    }
  }
} 