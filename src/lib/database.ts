import { supabase } from './supabase'
import type { UserProfile, UserRole, Resource, Action } from '@/types/auth'

export class DatabaseService {
  // User Profile Management
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  }

  static async createUserProfile(
    userId: string, 
    displayName: string, 
    role: UserRole = 'user'
  ): Promise<UserProfile | null> {
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
      console.error('Error creating user profile:', error)
      return null
    }

    return data
  }

  static async updateUserProfile(
    userId: string, 
    updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url' | 'bio'>>
  ): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return null
    }

    return data
  }

  static async updateUserRole(
    userId: string, 
    role: UserRole
  ): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user role:', error)
      return null
    }

    return data
  }

  // Admin functions
  static async getAllUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all users:', error)
      return []
    }

    return data || []
  }

  static async getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users by role:', error)
      return []
    }

    return data || []
  }

  // Permission checking functions
  static async userHasPermission(
    userId: string, 
    resource: Resource, 
    action: Action
  ): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('user_has_permission', {
        user_id: userId,
        check_resource: resource,
        check_action: action
      })

    if (error) {
      console.error('Error checking user permission:', error)
      return false
    }

    return data || false
  }

  static async getUserRole(userId: string): Promise<UserRole> {
    const { data, error } = await supabase
      .rpc('get_user_role', {
        user_id: userId
      })

    if (error) {
      console.error('Error getting user role:', error)
      return 'user'
    }

    return data || 'user'
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

  // Analytics functions (for admins)
  static async getUserStats(): Promise<{
    total: number
    admins: number
    contentManagers: number
    users: number
  }> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')

    if (error) {
      console.error('Error fetching user stats:', error)
      return { total: 0, admins: 0, contentManagers: 0, users: 0 }
    }

    const stats = data.reduce(
      (acc, user) => {
        acc.total++
        switch (user.role) {
          case 'admin':
            acc.admins++
            break
          case 'content_manager':
            acc.contentManagers++
            break
          case 'user':
            acc.users++
            break
        }
        return acc
      },
      { total: 0, admins: 0, contentManagers: 0, users: 0 }
    )

    return stats
  }

  // Search functions
  static async searchUsers(query: string): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .or(`display_name.ilike.%${query}%,bio.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error searching users:', error)
      return []
    }

    return data || []
  }
} 