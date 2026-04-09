import { format } from 'date-fns'
import { cn } from '../../lib/utils'

interface TimeColumnProps {
  hours: number[]
  hourHeight: number
  className?: string
}

export function TimeColumn({ hours, hourHeight, className }: TimeColumnProps) {
  const formatHour = (hour: number) => {
    const date = new Date()
    date.setHours(hour, 0, 0, 0)
    return format(date, 'h a')
  }

  return (
    <div className={cn("w-12 sm:w-16 flex-shrink-0 border-r border-border bg-muted/20", className)}>
      {hours.map((hour, index) => (
        <div
          key={hour}
          className="relative border-b border-border/30 text-right pr-1 sm:pr-2 text-xs text-muted-foreground box-border"
          style={{ height: hourHeight }}
        >
          {index === 0 || hour % 3 === 0 ? (
            <div className={cn(
              "absolute right-1 sm:right-2 bg-background px-1",
              index === 0 ? "-top-0" : "-top-0"
            )}>
              <span>{formatHour(hour)}</span>
            </div>
          ) : (
            <div className="absolute top-1/2 right-1 sm:right-2 w-2 h-px bg-border" />
          )}
        </div>
      ))}
    </div>
  )
}