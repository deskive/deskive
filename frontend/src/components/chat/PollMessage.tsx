import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { BarChart2, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Poll, PollOption } from '@/lib/api/chat-api';
import { useVotePoll, useClosePoll } from '@/lib/api/chat-api';
import { useParams } from 'react-router-dom';

interface PollMessageProps {
  poll: Poll;
  messageId: string;
  currentUserId: string;
  userVotedOptionId?: string | null;
}

export function PollMessage({
  poll,
  messageId,
  currentUserId,
  userVotedOptionId: initialUserVotedOptionId,
}: PollMessageProps) {
  const intl = useIntl();
  const { workspaceId } = useParams();
  const [userVotedOptionId, setUserVotedOptionId] = useState<string | null>(
    initialUserVotedOptionId || null
  );
  const [localPoll, setLocalPoll] = useState<Poll>(poll);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const voteMutation = useVotePoll();
  const closeMutation = useClosePoll();

  // Sync local state with prop when it changes (e.g., from WebSocket updates)
  useEffect(() => {
    setLocalPoll(poll);
  }, [poll]);

  // Sync userVotedOptionId with prop when it changes
  useEffect(() => {
    if (initialUserVotedOptionId) {
      setUserVotedOptionId(initialUserVotedOptionId);
    }
  }, [initialUserVotedOptionId]);

  const isCreator = currentUserId === localPoll.createdBy;
  const hasVoted = !!userVotedOptionId;
  const canVote = localPoll.isOpen && !hasVoted;
  const canViewResults =
    hasVoted || localPoll.showResultsBeforeVoting || !localPoll.isOpen;

  const handleVote = async (optionId: string) => {
    if (!workspaceId || !canVote) return;

    try {
      const result = await voteMutation.mutateAsync({
        workspaceId,
        messageId,
        pollId: localPoll.id,
        optionId,
      });

      // Update local state with the result
      setUserVotedOptionId(result.data.userVotedOptionId);
      setLocalPoll(result.data.poll);
      setSelectedOption(null);
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleClosePoll = async () => {
    if (!workspaceId || !isCreator) return;

    try {
      const result = await closeMutation.mutateAsync({
        workspaceId,
        messageId,
        pollId: localPoll.id,
      });

      // Update local state
      setLocalPoll(result.data.poll);
    } catch (error) {
      console.error('Failed to close poll:', error);
    }
  };

  const getVotePercentage = (option: PollOption): number => {
    if (localPoll.totalVotes === 0) return 0;
    return Math.round((option.voteCount / localPoll.totalVotes) * 100);
  };

  return (
    <div className="bg-muted/30 rounded-lg border p-4 max-w-md">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="h-5 w-5 text-primary" />
        <span className="font-medium text-sm">
          {intl.formatMessage({
            id: 'modules.chat.poll.title',
            defaultMessage: 'Poll',
          })}
        </span>
        {!localPoll.isOpen && (
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {intl.formatMessage({
              id: 'modules.chat.poll.closed',
              defaultMessage: 'Closed',
            })}
          </span>
        )}
      </div>

      {/* Question */}
      <h4 className="font-semibold text-base mb-3">{localPoll.question}</h4>

      {/* Options */}
      <div className="space-y-2">
        {localPoll.options.map((option) => {
          const isSelected = selectedOption === option.id;
          const isVoted = userVotedOptionId === option.id;
          const percentage = getVotePercentage(option);

          return (
            <div key={option.id} className="relative">
              {canVote ? (
                // Voting mode - clickable options (with results if showResultsBeforeVoting)
                <button
                  onClick={() => setSelectedOption(option.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-md border transition-colors relative overflow-hidden',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  {/* Show progress bar if results visible before voting */}
                  {canViewResults && (
                    <div
                      className="absolute inset-0 bg-muted/50 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                          isSelected ? 'border-primary' : 'border-muted-foreground'
                        )}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-sm">{option.text}</span>
                    </div>
                    {canViewResults && (
                      <span className="text-sm font-medium text-muted-foreground">
                        {percentage}% ({option.voteCount})
                      </span>
                    )}
                  </div>
                </button>
              ) : (
                // Results mode - show progress bars
                <div
                  className={cn(
                    'relative overflow-hidden rounded-md border p-3',
                    isVoted ? 'border-primary' : 'border-border'
                  )}
                >
                  {/* Progress bar background */}
                  {canViewResults && (
                    <div
                      className={cn(
                        'absolute inset-0 transition-all',
                        isVoted ? 'bg-primary/20' : 'bg-muted'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  )}

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isVoted && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <span className="text-sm">{option.text}</span>
                    </div>
                    {canViewResults ? (
                      <span className="text-sm font-medium text-muted-foreground">
                        {percentage}% ({option.voteCount})
                      </span>
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vote button */}
      {canVote && selectedOption && (
        <Button
          onClick={() => handleVote(selectedOption)}
          disabled={voteMutation.isPending}
          className="w-full mt-3"
          size="sm"
        >
          {voteMutation.isPending
            ? intl.formatMessage({
                id: 'modules.chat.poll.voting',
                defaultMessage: 'Voting...',
              })
            : intl.formatMessage({
                id: 'modules.chat.poll.vote',
                defaultMessage: 'Vote',
              })}
        </Button>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <span className="text-xs text-muted-foreground">
          {intl.formatMessage(
            {
              id: 'modules.chat.poll.totalVotes',
              defaultMessage: '{count} {count, plural, one {vote} other {votes}}',
            },
            { count: localPoll.totalVotes }
          )}
        </span>

        {isCreator && localPoll.isOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClosePoll}
            disabled={closeMutation.isPending}
            className="text-xs h-7"
          >
            {closeMutation.isPending
              ? intl.formatMessage({
                  id: 'modules.chat.poll.closing',
                  defaultMessage: 'Closing...',
                })
              : intl.formatMessage({
                  id: 'modules.chat.poll.closePoll',
                  defaultMessage: 'Close Poll',
                })}
          </Button>
        )}
      </div>

      {/* Hint for users who haven't voted */}
      {!hasVoted && !localPoll.isOpen && (
        <p className="text-xs text-muted-foreground mt-2 italic">
          {intl.formatMessage({
            id: 'modules.chat.poll.closedNoVote',
            defaultMessage: 'This poll is closed. You did not vote.',
          })}
        </p>
      )}
    </div>
  );
}
