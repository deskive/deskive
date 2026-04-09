/**
 * EventBotAssignment Component
 * Manages bot assignments for calendar events
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useBots } from '@/lib/api/bots-api';
import {
  useEventBotAssignments,
  useAssignBotToEvent,
  useUnassignBotFromEvent,
} from '@/lib/api/event-bot-assignments-api';
import { Bot, Calendar, Plus, X, Loader2 } from 'lucide-react';

interface EventBotAssignmentProps {
  eventId: string;
}

export function EventBotAssignment({ eventId }: EventBotAssignmentProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { toast } = useToast();
  const [selectedBotId, setSelectedBotId] = useState<string>('');

  const { data: bots, isLoading: botsLoading } = useBots(workspaceId!);
  const { data: assignments, isLoading: assignmentsLoading } = useEventBotAssignments(
    workspaceId!,
    eventId
  );
  const assignBot = useAssignBotToEvent();
  const unassignBot = useUnassignBotFromEvent();

  // Filter to only show activated prebuilt bots
  const availableBots = bots?.filter(
    (bot) => bot.botType === 'prebuilt' && bot.status === 'active'
  ) || [];

  // Filter out already assigned bots
  const assignedBotIds = new Set(assignments?.map((a) => a.botId) || []);
  const unassignedBots = availableBots.filter((bot) => !assignedBotIds.has(bot.id));

  const handleAssignBot = async () => {
    if (!selectedBotId) return;

    try {
      await assignBot.mutateAsync({
        workspaceId: workspaceId!,
        eventId,
        data: {
          botId: selectedBotId,
          isActive: true,
        },
      });

      toast({
        title: 'Bot assigned',
        description: 'The bot will now manage this event',
      });

      setSelectedBotId('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to assign bot',
        variant: 'destructive',
      });
    }
  };

  const handleUnassignBot = async (botId: string, botName: string) => {
    try {
      await unassignBot.mutateAsync({
        workspaceId: workspaceId!,
        eventId,
        botId,
      });

      toast({
        title: 'Bot unassigned',
        description: `${botName} will no longer manage this event`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to unassign bot',
        variant: 'destructive',
      });
    }
  };

  if (assignmentsLoading || botsLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Bot className="h-4 w-4" />
          <h3 className="font-medium">Event Bot Assistant</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Assign a bot to automatically send reminders and manage this event
        </p>
      </div>

      {/* Assigned Bots */}
      {assignments && assignments.length > 0 && (
        <div className="space-y-2">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {assignment.botDisplayName || assignment.botName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.botDescription || 'Calendar Event Assistant'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleUnassignBot(
                          assignment.botId,
                          assignment.botDisplayName || assignment.botName || 'Bot'
                        )
                      }
                      disabled={unassignBot.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Bot */}
      {unassignedBots.length > 0 && (
        <div className="flex gap-2">
          <Select value={selectedBotId} onValueChange={setSelectedBotId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a bot to assign..." />
            </SelectTrigger>
            <SelectContent>
              {unassignedBots.map((bot) => (
                <SelectItem key={bot.id} value={bot.id}>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {bot.displayName || bot.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAssignBot}
            disabled={!selectedBotId || assignBot.isPending}
            size="sm"
          >
            {assignBot.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Assign
              </>
            )}
          </Button>
        </div>
      )}

      {unassignedBots.length === 0 && (!assignments || assignments.length === 0) && (
        <Card>
          <CardContent className="p-4 text-center">
            <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No bots available. Activate a bot from the Bots page first.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
