import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

interface EnhancedDatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  minDate?: Date
  maxDate?: Date
}

export function EnhancedDatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  minDate,
  maxDate
}: EnhancedDatePickerProps) {
  // Normalize dates to midnight for proper comparison
  const normalizeDate = (date: Date) => {
    const normalized = new Date(date)
    normalized.setHours(0, 0, 0, 0)
    return normalized
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={(date) => {
            const normalizedDate = normalizeDate(date)
            if (minDate) {
              const normalizedMin = normalizeDate(minDate)
              if (normalizedDate < normalizedMin) return true
            }
            if (maxDate) {
              const normalizedMax = normalizeDate(maxDate)
              if (normalizedDate > normalizedMax) return true
            }
            return false
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
