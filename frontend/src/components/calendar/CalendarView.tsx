import { Calendar } from './Calendar'

interface CalendarViewProps {
  workspaceId?: string
}

export function CalendarView({ }: CalendarViewProps) {
  return <Calendar />
}