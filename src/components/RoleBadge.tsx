'use client'

import type { UserRole } from '@/types/auth'
import { ROLE_INFO } from '@/types/auth'

interface RoleBadgeProps {
  role: UserRole
  size?: 'sm' | 'md' | 'lg'
  showDescription?: boolean
}

export default function RoleBadge({ 
  role, 
  size = 'md', 
  showDescription = false 
}: RoleBadgeProps) {
  const roleInfo = ROLE_INFO[role]
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  const colorClasses = {
    red: 'bg-red-100 text-red-800 border-red-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
  }

  const iconMap = {
    admin: '👑',
    content_manager: '✏️',
    user: '🎓',
  }

  return (
    <div className="inline-flex items-center">
      <span
        className={`
          inline-flex items-center gap-1.5 rounded-full border font-medium
          ${sizeClasses[size]}
          ${colorClasses[roleInfo.color as keyof typeof colorClasses]}
        `}
      >
        <span className="text-sm">{iconMap[role]}</span>
        {roleInfo.label}
      </span>
      
      {showDescription && (
        <div className="ml-2 text-gray-600 text-sm">
          {roleInfo.description}
        </div>
      )}
    </div>
  )
}

export function RoleSelector({
  currentRole,
  onRoleChange,
  disabled = false,
  availableRoles = ['user', 'content_manager', 'admin'] as UserRole[],
}: {
  currentRole: UserRole
  onRoleChange: (role: UserRole) => void
  disabled?: boolean
  availableRoles?: UserRole[]
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        User Role
      </label>
      <select
        value={currentRole}
        onChange={(e) => onRoleChange(e.target.value as UserRole)}
        disabled={disabled}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {availableRoles.map((role) => (
          <option key={role} value={role}>
            {ROLE_INFO[role].label}
          </option>
        ))}
      </select>
      
      <div className="text-xs text-gray-500">
        {ROLE_INFO[currentRole].description}
      </div>
    </div>
  )
} 