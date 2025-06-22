export type UserRole = 'admin' | 'content_manager' | 'user'

export interface UserProfile {
  id: string
  role: UserRole
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface RolePermission {
  id: string
  role: UserRole
  resource: string
  action: string
  created_at: string
}

export type Resource = 
  | 'users'
  | 'content' 
  | 'certificates'
  | 'analytics'
  | 'profile'
  | 'progress'

export type Action = 
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'issue'
  | 'revoke'

export interface Permission {
  resource: Resource
  action: Action
}

// Role definitions with their capabilities
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' },
    { resource: 'content', action: 'read' },
    { resource: 'content', action: 'create' },
    { resource: 'content', action: 'update' },
    { resource: 'content', action: 'delete' },
    { resource: 'content', action: 'publish' },
    { resource: 'certificates', action: 'issue' },
    { resource: 'certificates', action: 'revoke' },
    { resource: 'analytics', action: 'read' },
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'update' },
    { resource: 'progress', action: 'read' },
    { resource: 'progress', action: 'update' },
  ],
  content_manager: [
    { resource: 'content', action: 'read' },
    { resource: 'content', action: 'create' },
    { resource: 'content', action: 'update' },
    { resource: 'users', action: 'read' },
    { resource: 'analytics', action: 'read' },
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'update' },
    { resource: 'progress', action: 'read' },
  ],
  user: [
    { resource: 'content', action: 'read' },
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'update' },
    { resource: 'progress', action: 'read' },
    { resource: 'progress', action: 'update' },
  ],
}

// Helper function to check if a role has a specific permission
export function hasPermission(role: UserRole, resource: Resource, action: Action): boolean {
  return ROLE_PERMISSIONS[role].some(
    permission => permission.resource === resource && permission.action === action
  )
}

// Role hierarchy for UI display
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  content_manager: 1,
  admin: 2,
}

// Role display information
export const ROLE_INFO: Record<UserRole, { label: string; description: string; color: string }> = {
  admin: {
    label: 'Administrator',
    description: 'Full access to all platform features and user management',
    color: 'red',
  },
  content_manager: {
    label: 'Content Manager', 
    description: 'Can create and edit content but cannot publish or manage users',
    color: 'blue',
  },
  user: {
    label: 'Learner',
    description: 'Can access learning content and manage their own profile',
    color: 'green',
  },
} 