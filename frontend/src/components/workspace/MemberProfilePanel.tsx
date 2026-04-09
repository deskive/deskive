/**
 * Member Profile Panel Component
 * Slides in from the right to show detailed workspace member profile
 * Can be triggered from projects sidebar, video calls, chat, etc.
 */

import { useEffect } from 'react';
import { X, Mail, Phone, Calendar, MapPin, Briefcase, Award, Clock, MessageSquare, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import type { WorkspaceMember } from '@/types';
import { cn } from '@/lib/utils';

interface MemberProfilePanelProps {
  member: WorkspaceMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: (memberId: string) => void;
  onStartCall?: (memberId: string, type: 'audio' | 'video') => void;
  className?: string;
}

export function MemberProfilePanel({
  member,
  isOpen,
  onClose,
  onSendMessage,
  onStartCall,
  className,
}: MemberProfilePanelProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!member) return null;

  const user = member.user || {
    id: member.user_id,
    name: member.name || 'Unknown User',
    email: member.email || '',
    avatar: member.avatar_url || '',
  };

  const getRoleBadgeColor = (role: string | undefined) => {
    if (!role) return 'bg-gray-500/10 text-gray-500 border-gray-500/20';

    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'admin':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusBadgeColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-500/10 text-gray-500 border-gray-500/20';

    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'inactive':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  // Helper function to safely format dates
  const formatSafeDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'Not available';

    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Not available';
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Not available';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-96 bg-background border-l border-border shadow-2xl z-50 overflow-y-auto',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold">Member Profile</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2">
              <h3 className="text-xl font-bold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            {/* Role and Status Badges */}
            <div className="flex gap-2">
              <Badge
                variant="outline"
                className={cn('capitalize', getRoleBadgeColor(member.role))}
              >
                {member.role}
              </Badge>
              {/* <Badge
                variant="outline"
                className={cn('capitalize', getStatusBadgeColor(member.status))}
              >
                {member.status}
              </Badge> */}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {/* {onSendMessage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendMessage(member.user_id)}
                className="w-full"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
            )} */}
            {/* {onStartCall && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStartCall(member.user_id, 'video')}
                className="w-full"
              >
                <Video className="h-4 w-4 mr-2" />
                Call
              </Button>
            )} */}
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Contact Information
            </h4>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm break-all">{user.email}</p>
                </div>
              </div>

              {/* Additional contact info can be added here */}
            </div>
          </div>

          <Separator />

          {/* Workspace Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Workspace Details
            </h4>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="text-sm">
                    {formatSafeDate(member.joined_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="text-sm capitalize">{member.role}</p>
                </div>
              </div>

              {member.permissions && member.permissions.length > 0 && (
                <div className="flex items-start gap-3">
                  <Award className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-2">Permissions</p>
                    <div className="flex flex-wrap gap-1">
                      {member.permissions.map((permission) => (
                        <Badge
                          key={permission}
                          variant="secondary"
                          className="text-xs"
                        >
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Activity Status */}
       {/*    <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Activity
            </h4>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      member.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    )}
                  />
                  <span className="text-sm">
                    {member.status === 'active' ? 'Active' : 'Offline'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm">
                    {formatSafeDate(member.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </>
  );
}
