'use client'

import { useAuth } from '@/contexts/AuthContext'
import type { UserRole, Resource, Action } from '@/types/auth'

interface PermissionGuardProps {
  children: React.ReactNode
  resource?: Resource
  action?: Action
  role?: UserRole | UserRole[]
  fallback?: React.ReactNode
  _requireAll?: boolean // If true, user must have ALL specified permissions (unused for now)
}

function PermissionGuard({
  children,
  resource,
  action,
  role,
  fallback = null,
  _requireAll = false,
}: PermissionGuardProps) {
  const { userProfile, hasPermission, loading, hydrated } = useAuth()

  // Show loading state if auth is still loading or not hydrated
  if (!hydrated || loading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-full rounded"></div>
  }

  // If no profile, user is not authenticated
  if (!userProfile) {
    return <>{fallback}</>
  }

  let isAuthorized = true

  // Check role-based authorization
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role]
    isAuthorized = allowedRoles.includes(userProfile.role)
  }

  // Check permission-based authorization
  if (isAuthorized && resource && action) {
    isAuthorized = hasPermission(resource, action)
  }

  // If user is authorized, show children; otherwise show fallback
  return isAuthorized ? <>{children}</> : <>{fallback}</>
}

// Convenience components for common permission patterns
export function AdminOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGuard role="admin" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function ContentManagerOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGuard role="content_manager" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function AuthenticatedOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGuard role={['admin', 'content_manager', 'user']} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export default PermissionGuard 