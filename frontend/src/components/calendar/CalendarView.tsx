import { Calendar } from './Calendar'

interface CalendarViewProps {
  workspaceId?: string
}

export function CalendarView(_props: CalendarViewProps) {
  return <Calendar />
}