import { useState, useEffect } from 'react';
import { Play, Pause, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRunningTimer, useStartTimer, useStopTimer } from '@/lib/api/budget-api';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';

interface TimeTrackerWidgetProps {
  taskId: string;
  taskName: string;
}

export function TimeTrackerWidget({ taskId, taskName }: TimeTrackerWidgetProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: runningTimer, isLoading } = useRunningTimer(workspaceId!);
  const startTimer = useStartTimer(workspaceId!);
  const stopTimer = useStopTimer(workspaceId!);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isTimerRunningForThisTask = runningTimer?.taskId === taskId;
  const isAnyTimerRunning = !!runningTimer;

  // Calculate elapsed time
  useEffect(() => {
    if (runningTimer && isTimerRunningForThisTask) {
      const startTime = new Date(runningTimer.startTime).getTime();

      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [runningTimer, isTimerRunningForThisTask]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    // Timer starting is now managed from Budget → Tasks tab with hourly rate and assignee selection
    toast.info('Please start timers from the Budget → Tasks tab');
  };

  const handleStop = async () => {
    if (!runningTimer) return;

    try {
      await stopTimer.mutateAsync({ timeEntryId: runningTimer.id, taskId });
      toast.success('Timer stopped');
    } catch (error) {
      toast.error('Failed to stop timer');
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Time Tracker</p>
              {isTimerRunningForThisTask && (
                <p className="text-2xl font-mono font-bold text-primary">
                  {formatTime(elapsedSeconds)}
                </p>
              )}
            </div>
          </div>

          {isTimerRunningForThisTask ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStop}
              disabled={stopTimer.isPending}
            >
              <Pause className="w-4 h-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleStart}
              disabled={startTimer.isPending || isAnyTimerRunning}
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
          )}
        </div>

        {isAnyTimerRunning && !isTimerRunningForThisTask && (
          <p className="text-xs text-muted-foreground mt-2">
            Timer running on another task
          </p>
        )}
      </CardContent>
    </Card>
  );
}
