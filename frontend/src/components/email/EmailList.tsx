import React, { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { type EmailListItem as EmailListItemType, type EmailProvider, type EmailPriority, type EmailPriorityLevel, formatEmailAddress } from '@/lib/api/email-api';
import { Star, Paperclip, Loader2, Mail, Server, AlertCircle, AlertTriangle, ArrowDown, Minus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Extended email type with provider info for "All Mail" mode
export interface EmailWithProvider extends EmailListItemType {
  provider?: EmailProvider;
  connectionEmail?: string;
  priority?: EmailPriority;
}

interface EmailListProps {
  emails: EmailWithProvider[];
  isLoading: boolean;
  selectedId: string | null;
  onSelectEmail: (id: string) => void;
  onRefresh: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  showSource?: boolean; // Show source badge in "All Mail" mode
}

export function EmailList({
  emails,
  isLoading,
  selectedId,
  onSelectEmail,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  showSource = false,
}: EmailListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !hasNextPage || isFetchingNextPage || !onLoadMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Load more when user scrolls to within 200px of the bottom
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore();
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  if (isLoading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>No emails found</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="overflow-auto h-full"
      onScroll={handleScroll}
    >
      {emails.map((email) => (
        <EmailListItem
          key={email.id}
          email={email}
          isSelected={email.id === selectedId}
          onClick={() => onSelectEmail(email.id)}
          showSource={showSource}
        />
      ))}
      {/* Loading indicator at bottom */}
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
        </div>
      )}
      {/* End of list indicator */}
      {!hasNextPage && emails.length > 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No more emails
        </div>
      )}
    </div>
  );
}

interface EmailListItemProps {
  email: EmailWithProvider;
  isSelected: boolean;
  onClick: () => void;
  showSource?: boolean;
}

// Priority indicator component
function PriorityIndicator({ priority }: { priority?: EmailPriority }) {
  if (!priority || priority.level === 'none') return null;

  const config = {
    high: {
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-200 dark:border-red-800',
      label: 'High Priority',
    },
    medium: {
      icon: AlertTriangle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      borderColor: 'border-amber-200 dark:border-amber-800',
      label: 'Medium Priority',
    },
    low: {
      icon: ArrowDown,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800',
      label: 'Low Priority',
    },
    none: {
      icon: Minus,
      color: 'text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-950',
      borderColor: 'border-gray-200 dark:border-gray-800',
      label: 'No Priority',
    },
  };

  const { icon: Icon, color, bgColor, borderColor, label } = config[priority.level] || config.none;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded border', bgColor, borderColor)}>
            <Icon className={cn('h-3 w-3', color)} />
            <span className={cn('text-[10px] font-medium', color)}>
              {priority.score}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{label} (Score: {priority.score}/10)</p>
            <p className="text-xs text-muted-foreground">{priority.reason}</p>
            {priority.factors.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {priority.factors.map((factor, idx) => (
                  <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    {factor}
                  </span>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function EmailListItem({ email, isSelected, onClick, showSource = false }: EmailListItemProps) {
  const fromName = email.from?.name || email.from?.email || 'Unknown';
  const formattedDate = email.date
    ? formatDistanceToNow(new Date(email.date), { addSuffix: true })
    : '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b transition-colors',
        isSelected
          ? 'bg-primary/5 border-l-2 border-l-primary'
          : 'hover:bg-muted/50',
        !email.isRead && 'bg-primary/5',
        // Add colored left border for high priority emails
        email.priority?.level === 'high' && !isSelected && 'border-l-2 border-l-red-500',
        email.priority?.level === 'medium' && !isSelected && 'border-l-2 border-l-amber-500'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Star indicator */}
        <Star
          className={cn(
            'h-4 w-4 mt-1 flex-shrink-0',
            email.isStarred
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground/30'
          )}
        />

        <div className="flex-1 min-w-0">
          {/* Sender and date */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className={cn(
                  'text-sm truncate',
                  !email.isRead && 'font-semibold'
                )}
              >
                {fromName}
              </span>
              {/* Priority indicator */}
              {email.priority && email.priority.level !== 'none' && (
                <PriorityIndicator priority={email.priority} />
              )}
              {/* Source badge - shown in "All Mail" mode */}
              {showSource && email.provider && (
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 px-1.5 text-[10px] font-normal flex-shrink-0',
                    email.provider === 'gmail'
                      ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400'
                      : 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400'
                  )}
                >
                  {email.provider === 'gmail' ? (
                    <Mail className="h-3 w-3 mr-1" />
                  ) : (
                    <Server className="h-3 w-3 mr-1" />
                  )}
                  {email.provider === 'gmail' ? 'Gmail' : 'IMAP'}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formattedDate}
            </span>
          </div>

          {/* Subject */}
          <div
            className={cn(
              'text-sm truncate mb-1',
              !email.isRead ? 'font-medium' : 'text-muted-foreground'
            )}
          >
            {email.subject || '(no subject)'}
          </div>

          {/* Snippet */}
          <div className="text-xs text-muted-foreground line-clamp-1">
            {email.snippet}
          </div>

          {/* Indicators */}
          {email.hasAttachments && (
            <div className="flex items-center gap-1 mt-1">
              <Paperclip className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
