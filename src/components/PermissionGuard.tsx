'use client'

import { useAuth } from '@/contexts/AuthContext'
import type { UserRole, Resource, Action } from '@/types/auth'

interface PermissionGuardProps {
  children: React.ReactNode
  resource?: Resource
  action?: Action
  role?: UserRole | UserRole[]
  fallback?: React.ReactNode
  requireAll?: boolean // If true, user must have ALL specified permissions
}

export default function PermissionGuard({
  children,
  resource,
  action,
  role,
  fallback = null,
  requireAll = false,
}: PermissionGuardProps) {
  const { profile, hasPermission, loading } = useAuth()

  // Show loading state if auth is still loading
  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-full rounded"></div>
  }

  // If no profile, user is not authenticated
  if (!profile) {
    return <>{fallback}</>
  }

  let isAuthorized = true

  // Check role-based authorization
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role]
    isAuthorized = allowedRoles.includes(profile.role)
  }

  // Check permission-based authorization
  if (isAuthorized && resource && action) {
    isAuthorized = hasPermission(resource, action)
  }

  // If user is authorized, show children; otherwise show fallback
  return isAuthorized ? <>{children}</> : <>{fallback}</>
}

// Convenience components for common use cases
export function AdminOnly({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <PermissionGuard role="admin" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function ContentManagerOnly({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <PermissionGuard role={['admin', 'content_manager']} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function AuthenticatedOnly({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  const { user } = useAuth()
  return user ? <>{children}</> : <>{fallback}</>
} 