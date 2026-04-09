/**
 * Whiteboard Participants Component
 * Shows active participants and their cursors in real-time
 */

import { useState } from 'react'
import { 
  Users, 
  UserX, 
  Crown, 
  Eye,
  Edit,
  MoreVertical,
  Circle
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '../ui/dropdown-menu'
import { ScrollArea } from '../ui/scroll-area'
import { cn } from '../../lib/utils'
import type { CursorPosition } from '@/lib/api/whiteboard-api'

interface WhiteboardParticipantsProps {
  participants: Map<string, { name: string; color: string }>
  cursors: Map<string, CursorPosition>
  className?: string
}

interface ParticipantInfo {
  id: string
  name: string
  color: string
  isOnline: boolean
  isCurrentUser?: boolean
  role?: 'admin' | 'editor' | 'viewer'
  cursor?: CursorPosition
  lastSeen?: Date
}

export function WhiteboardParticipants({ 
  participants, 
  cursors, 
  className 
}: WhiteboardParticipantsProps) {
  const [showOffline, setShowOffline] = useState(false)

  // Convert participants map to enriched participant info
  const getParticipantInfo = (): ParticipantInfo[] => {
    const currentUserId = 'current_user' // This should come from auth context
    const participantList: ParticipantInfo[] = []

    // Add current user
    participantList.push({
      id: currentUserId,
      name: 'You',
      color: '#4F46E5',
      isOnline: true,
      isCurrentUser: true,
      role: 'admin'
    })

    // Add other participants
    participants.forEach((participant, id) => {
      const cursor = cursors.get(id)
      participantList.push({
        id,
        name: participant.name,
        color: participant.color,
        isOnline: true,
        role: 'editor',
        cursor,
        lastSeen: cursor?.timestamp ? new Date(cursor.timestamp) : undefined
      })
    })

    // Add some mock offline users for demo
    if (showOffline) {
      participantList.push(
        {
          id: 'offline_1',
          name: 'Alice Johnson',
          color: '#10B981',
          isOnline: false,
          role: 'editor',
          lastSeen: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        },
        {
          id: 'offline_2', 
          name: 'Bob Wilson',
          color: '#F59E0B',
          isOnline: false,
          role: 'viewer',
          lastSeen: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
        }
      )
    }

    return participantList.sort((a, b) => {
      // Current user first
      if (a.isCurrentUser) return -1
      if (b.isCurrentUser) return 1
      
      // Online users before offline
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1
      }
      
      // Sort by name
      return a.name.localeCompare(b.name)
    })
  }

  const formatLastSeen = (date?: Date): string => {
    if (!date) return ''
    
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3 text-yellow-500" />
      case 'editor':
        return <Edit className="h-3 w-3 text-green-500" />
      case 'viewer':
        return <Eye className="h-3 w-3 text-gray-500" />
      default:
        return null
    }
  }

  const getRoleBadge = (role?: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      admin: 'default',
      editor: 'secondary', 
      viewer: 'outline'
    }
    
    return (
      <Badge variant={variants[role || 'outline']} className="text-xs">
        {role || 'guest'}
      </Badge>
    )
  }

  const participantInfo = getParticipantInfo()
  const onlineCount = participantInfo.filter(p => p.isOnline).length
  const totalCount = participantInfo.length

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Participants
          </h3>
          <Badge variant="secondary" className="text-xs">
            {onlineCount} online
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{onlineCount} online</span>
          </div>
          {!showOffline && totalCount > onlineCount && (
            <>
              <span>•</span>
              <button
                onClick={() => setShowOffline(true)}
                className="text-blue-600 hover:underline"
              >
                +{totalCount - onlineCount} offline
              </button>
            </>
          )}
        </div>
      </div>

      {/* Participants List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {participantInfo.map((participant) => (
            <div
              key={participant.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors",
                !participant.isOnline && "opacity-60"
              )}
            >
              {/* Avatar with online indicator */}
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://avatar.vercel.sh/${participant.id}`} />
                  <AvatarFallback 
                    className="text-xs font-medium"
                    style={{ backgroundColor: participant.color + '20', color: participant.color }}
                  >
                    {participant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Online/Offline indicator */}
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                  participant.isOnline ? "bg-green-500" : "bg-gray-400"
                )} />

                {/* Cursor indicator for active users */}
                {participant.cursor && (
                  <div className="absolute -top-1 -right-1">
                    <Circle 
                      className="h-3 w-3 animate-pulse" 
                      style={{ color: participant.color }}
                      fill="currentColor"
                    />
                  </div>
                )}
              </div>

              {/* Participant info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-medium text-sm truncate",
                    participant.isCurrentUser && "text-blue-600"
                  )}>
                    {participant.name}
                  </span>
                  {getRoleIcon(participant.role)}
                </div>
                
                <div className="flex items-center gap-2 mt-0.5">
                  {getRoleBadge(participant.role)}
                  
                  {!participant.isOnline && participant.lastSeen && (
                    <span className="text-xs text-gray-500">
                      {formatLastSeen(participant.lastSeen)}
                    </span>
                  )}
                  
                  {participant.cursor && (
                    <span className="text-xs text-gray-500">
                      Drawing with {participant.cursor.tool}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions menu */}
              {!participant.isCurrentUser && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      Follow User
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Users className="mr-2 h-4 w-4" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      <UserX className="mr-2 h-4 w-4" />
                      Remove User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-2">
          {/* Share/Invite Button */}
          <Button size="sm" className="w-full">
            <Users className="h-4 w-4 mr-2" />
            Invite Participants
          </Button>
          
          {/* Toggle offline users */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => setShowOffline(!showOffline)}
          >
            {showOffline ? 'Hide' : 'Show'} Offline Users
          </Button>
        </div>
      </div>
    </div>
  )
}