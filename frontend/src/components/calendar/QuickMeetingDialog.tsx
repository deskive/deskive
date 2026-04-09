import { useState } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Video, Clock, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface QuickMeetingDialogProps {
  open: boolean
  onClose: () => void
}

export function QuickMeetingDialog({ open, onClose }: QuickMeetingDialogProps) {
  const intl = useIntl()
  const [title, setTitle] = useState(intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.defaultTitle' }))
  const [duration, setDuration] = useState('30')
  const [attendees, setAttendees] = useState<string[]>([])
  const [attendeeInput, setAttendeeInput] = useState('')

  const durations = [
    { value: '15', label: intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.durations.15min' }) },
    { value: '30', label: intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.durations.30min' }) },
    { value: '45', label: intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.durations.45min' }) },
    { value: '60', label: intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.durations.1hour' }) },
  ]

  const handleAddAttendee = () => {
    if (attendeeInput && !attendees.includes(attendeeInput)) {
      setAttendees([...attendees, attendeeInput])
      setAttendeeInput('')
    }
  }

  const handleRemoveAttendee = (email: string) => {
    setAttendees(attendees.filter(a => a !== email))
  }

  const handleStartMeeting = () => {
    if (!title || attendees.length === 0) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.errors.required' }))
      return
    }

    // TODO: Implement actual meeting creation
    toast.success(intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.toast.success' }))

    // Reset form
    setTitle(intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.defaultTitle' }))
    setDuration('30')
    setAttendees([])
    setAttendeeInput('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.title' })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">{intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.fields.title' })}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.placeholders.title' })}
            />
          </div>

          <div>
            <Label htmlFor="duration">{intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.fields.duration' })}</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durations.map(d => (
                  <SelectItem key={d.value} value={d.value}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {d.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.fields.attendees' })}</Label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder={intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.placeholders.email' })}
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

            <div className="space-y-2">
              {attendees.map(email => (
                <div key={email} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAttendee(email)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {attendees.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.emptyState' })}
              </p>
            )}
          </div>

          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm font-medium mb-1">{intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.info.immediate' })}</p>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.info.linkGenerated' })}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.buttons.cancel' })}
          </Button>
          <Button
            onClick={handleStartMeeting}
            disabled={!title || attendees.length === 0}
          >
            <Video className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'modules.calendar.quickMeetingDialog.buttons.start' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}