// src/utils/task-helpers.ts
import type { User } from '@/types'

/**
 * Type guard to check if a value is a User object
 */
export const isUserObject = (value: unknown): value is User => {
  return typeof value === 'object' && value !== null && 'id' in value
}

/**
 * Safely get user display name from assignee (User object or string ID)
 */
export const getAssigneeName = (assignee: User | string | undefined): string => {
  if (!assignee) return ''
  if (typeof assignee === 'string') return assignee
  return assignee.name || assignee.email || assignee.id
}

/**
 * Safely get user email from assignee (User object or string ID)
 */
export const getAssigneeEmail = (assignee: User | string | undefined): string => {
  if (!assignee) return ''
  if (typeof assignee === 'string') return ''
  return assignee.email || ''
}

/**
 * Safely get user avatar URL from assignee (User object or string ID)
 */
export const getAssigneeAvatar = (assignee: User | string | undefined): string | undefined => {
  if (!assignee) return undefined
  if (typeof assignee === 'string') return undefined
  return assignee.avatarUrl || assignee.avatar
}

/**
 * Safely get user initials from assignee (User object or string ID)
 */
export const getAssigneeInitials = (assignee: User | string | undefined): string => {
  if (!assignee) return '?'

  if (typeof assignee === 'string') {
    return assignee.charAt(0).toUpperCase()
  }

  const name = assignee.name || assignee.email
  if (!name) return '?'

  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}
