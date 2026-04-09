import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Calendar, Users } from 'lucide-react'
import type { UpcomingEvent } from './types'

interface UpcomingEventsListProps {
  events: UpcomingEvent[]
  onEventClick: (eventId: string) => void
}

export function UpcomingEventsList({ events, onEventClick }: UpcomingEventsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => onEventClick(event.id)}
          >
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{event.title}</div>
                <Badge variant={event.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                  {event.priority}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {event.date} at {event.time}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{event.attendees} attendees</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
