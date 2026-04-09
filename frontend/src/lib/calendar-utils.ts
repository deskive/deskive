import type { CalendarView, CalendarEvent, EventCategory } from '../types/calendar'
import { format, differenceInMinutes, differenceInHours } from 'date-fns'

export function formatCalendarViewTitle(view: CalendarView, date: Date): string {
  switch (view) {
    case 'day':
      return format(date, 'EEEE, MMMM d, yyyy')
    case 'week':
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'd, yyyy')}`
      } else if (weekStart.getFullYear() === weekEnd.getFullYear()) {
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      } else {
        return `${format(weekStart, 'MMM d, yyyy')} - ${format(weekEnd, 'MMM d, yyyy')}`
      }
    case 'month':
      return format(date, 'MMMM yyyy')
    case 'year':
      return format(date, 'yyyy')
    case 'agenda':
      return 'Agenda View'
    case 'timeline':
      return 'Timeline View'
    default:
      return format(date, 'MMMM yyyy')
  }
}

export function getEventColor(event: CalendarEvent, categories: EventCategory[]): string {
  // If event has a custom color, use that
  if (event.color) {
    return event.color
  }
  
  // Otherwise, find the category and use its color
  const category = categories.find(cat => cat.id === event.categoryId)
  if (category) {
    return category.color
  }
  
  // Default colors based on priority
  switch (event.priority) {
    case 'urgent':
      return '#ef4444' // red-500
    case 'high':
      return '#f97316' // orange-500
    case 'normal':
      return '#3b82f6' // blue-500
    case 'low':
      return '#9ca3af' // gray-400
    default:
      return '#6b7280' // gray-500
  }
}

export function formatEventTime(startTime: Date, endTime: Date, isAllDay: boolean): string {
  if (isAllDay) {
    return 'All day'
  }
  
  const startStr = format(startTime, 'h:mm a')
  const endStr = format(endTime, 'h:mm a')
  
  // If same day, just show times
  if (format(startTime, 'yyyy-MM-dd') === format(endTime, 'yyyy-MM-dd')) {
    return `${startStr} - ${endStr}`
  }
  
  // Multi-day event
  return `${format(startTime, 'MMM d')} ${startStr} - ${format(endTime, 'MMM d')} ${endStr}`
}

export function formatEventDuration(startTime: Date, endTime: Date): string {
  const totalMinutes = differenceInMinutes(endTime, startTime)
  
  if (totalMinutes < 60) {
    return `${totalMinutes}min`
  }
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  if (minutes === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${minutes}min`
}