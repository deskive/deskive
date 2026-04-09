/**
 * Join Request Notification Component
 * Shows a notification to the host when someone requests to join the call
 */

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserPlus, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JoinRequest } from './types';

// Re-export for backward compatibility
export type { JoinRequest };

interface JoinRequestNotificationProps {
  request: JoinRequest;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  className?: string;
}

export const JoinRequestNotification: React.FC<JoinRequestNotificationProps> = ({
  request,
  onAccept,
  onReject,
  className,
}) => {
  return (
    <Card
      className={cn(
        'p-4 bg-white dark:bg-gray-800 shadow-lg border-l-4 border-blue-500',
        'animate-in slide-in-from-right duration-300',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={request.avatar} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            {request.display_name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <p className="text-sm font-semibold truncate">
              {request.display_name}
            </p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Wants to join the call
          </p>
          {request.message && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-3 line-clamp-2">
              "{request.message}"
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onAccept(request.id)}
              className="flex-1 bg-green-600 hover:bg-green-700 h-8"
            >
              <Check className="h-4 w-4 mr-1" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onReject(request.id)}
              className="flex-1 h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * Join Request List Component
 * Manages multiple join requests in a stack
 */
interface JoinRequestListProps {
  requests: JoinRequest[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  className?: string;
}

export const JoinRequestList: React.FC<JoinRequestListProps> = ({
  requests,
  onAccept,
  onReject,
  className,
}) => {
  if (requests.length === 0) {
    return null;
  }

  return (
    <div className={cn('fixed top-20 right-4 z-[60] space-y-3 max-w-sm', className)}>
      {requests.map((request) => (
        <JoinRequestNotification
          key={request.id}
          request={request}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}
    </div>
  );
};
