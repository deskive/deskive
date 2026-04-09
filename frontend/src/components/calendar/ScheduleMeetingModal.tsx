import { useState } from 'react'
import { format, addHours } from 'date-fns'
import { useIntl } from 'react-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Clock, Video, MapPin, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface ScheduleMeetingModalProps {
  open: boolean
  onClose: () => void
  onOpenChange?: (open: boolean) => void
  defaultDate?: Date
  defaultHour?: number
}

interface TimeSlot {
  date: Date
  time: string
  available: boolean
}

export function ScheduleMeetingModal({ open, onClose }: ScheduleMeetingModalProps) {
  const intl = useIntl()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState(30)
  const [location, setLocation] = useState('virtual')
  const [attendees, setAttendees] = useState<string[]>([])
  const [attendeeInput, setAttendeeInput] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])

  const durations = [15, 30, 45, 60, 90, 120]

  const handleAddAttendee = () => {
    if (attendeeInput && !attendees.includes(attendeeInput)) {
      setAttendees([...attendees, attendeeInput])
      setAttendeeInput('')
    }
  }

  const handleRemoveAttendee = (email: string) => {
    setAttendees(attendees.filter(a => a !== email))
  }

  const handleCheckAvailability = async () => {
    if (!selectedDate || attendees.length === 0) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.errors.required' }))
      return
    }

    setIsCheckingAvailability(true)
    
    // Simulate API call to check availability
    setTimeout(() => {
      const slots: TimeSlot[] = []
      const baseDate = selectedDate
      const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
      
      times.forEach(time => {
        slots.push({
          date: baseDate,
          time,
          available: Math.random() > 0.3, // Random availability for demo
        })
      })
      
      setAvailableSlots(slots)
      setIsCheckingAvailability(false)
    }, 1500)
  }

  const handleScheduleMeeting = async () => {
    if (!title || !selectedSlot || attendees.length === 0) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.errors.allRequired' }))
      return
    }

    // Here you would make an API call to create the meeting
    console.log('Scheduling meeting:', {
      title,
      description,
      date: selectedSlot.date,
      time: selectedSlot.time,
      duration,
      location,
      attendees,
    })

    toast.success(intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.toast.success' }))
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.title' })}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Meeting Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">{intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.fields.title' })}</Label>
              <Input
                id="title"
                placeholder={intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.placeholders.title' })}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="description">{intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.fields.description' })}</Label>
              <Textarea
                id="description"
                placeholder={intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.placeholders.description' })}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label>{intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.fields.duration' })}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {durations.map(d => (
                  <Badge
                    key={d}
                    variant={duration === d ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setDuration(d)}
                  >
                    {intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.durations.minutes' }, { minutes: d })}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>{intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.fields.location' })}</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={location === 'virtual' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLocation('virtual')}
                >
                  <Video className="h-4 w-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.location.virtual' })}
                </Button>
                <Button
                  variant={location === 'physical' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLocation('physical')}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.location.inPerson' })}
                </Button>
              </div>
              {location === 'physical' && (
                <Input
                  placeholder={intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.placeholders.location' })}
                  className="mt-2"
                />
              )}
            </div>

            <div>
              <Label>{intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.fields.attendees' })}</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder={intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.placeholders.email' })}
                  value={attendeeInput}
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddAttendee()
                    }
                  }}
                />
                <Button size="sm" onClick={handleAddAttendee}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {attendees.map(email => (
                  <div key={email} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttendee(email)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Date & Time Selection */}
          <div className="space-y-4">
            <div>
              <Label>{intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.fields.selectDate' })}</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border mt-2"
              />
            </div>

            <Button
              onClick={handleCheckAvailability}
              className="w-full"
              disabled={!selectedDate || attendees.length === 0 || isCheckingAvailability}
            >
              {isCheckingAvailability ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  {intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.buttons.checking' })}
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.buttons.checkAvailability' })}
                </>
              )}
            </Button>

            {availableSlots.length > 0 && (
              <div>
                <Label>{intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.fields.availableSlots' })}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableSlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant={selectedSlot?.time === slot.time ? "default" : slot.available ? "outline" : "ghost"}
                      size="sm"
                      disabled={!slot.available}
                      onClick={() => slot.available && setSelectedSlot(slot)}
                    >
                      {slot.time}
                      {!slot.available && (
                        <X className="h-3 w-3 ml-1 text-red-500" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {selectedSlot && (
              <div className="p-4 border rounded-lg bg-muted">
                <p className="font-medium">{intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.selectedTime.title' })}</p>
                <p className="text-sm text-muted-foreground">
                  {format(selectedSlot.date, 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm">
                  {selectedSlot.time} - {addHours(new Date(`2000-01-01 ${selectedSlot.time}`), duration / 60).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.buttons.cancel' })}
          </Button>
          <Button
            onClick={handleScheduleMeeting}
            disabled={!title || !selectedSlot || attendees.length === 0}
          >
            {intl.formatMessage({ id: 'modules.calendar.scheduleMeetingModal.buttons.schedule' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}