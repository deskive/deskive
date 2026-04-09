import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '../ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CalendarView, UserPreferences } from '../../types/calendar'
import { Settings, Clock, Bell, MapPin } from 'lucide-react'
import { CalendarSettings } from './CalendarSettings'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  openRoomDialog?: boolean
}

export function SettingsDialog({ open, onClose, openRoomDialog = false }: SettingsDialogProps) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultView: 'month',
    weekStartsOn: 0,
    defaultEventDuration: 60,
    workingHours: {
      start: '09:00',
      end: '17:00',
    },
    workingDays: [1, 2, 3, 4, 5],
    defaultReminders: [],
    showWeekNumbers: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    showDeclinedEvents: false,
    showTentativeEvents: true,
    enableWeatherIntegration: false,
    enableSmartScheduling: true,
    focusTimePreferences: [],
  })

  const weekDays = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ]

  const calendarViews: { value: CalendarView; label: string }[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
    { value: 'agenda', label: 'Agenda' },
  ]

  const handleSave = () => {
    // Save preferences to backend/local storage
    console.log('Saving preferences:', preferences)
    onClose()
  }

  const toggleWorkingDay = (day: number) => {
    const newDays = preferences.workingDays.includes(day)
      ? preferences.workingDays.filter(d => d !== day)
      : [...preferences.workingDays, day].sort()
    setPreferences({ ...preferences, workingDays: newDays })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Calendar Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={openRoomDialog ? "rooms" : "display"} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="time">Time</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="display" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Default Calendar View</Label>
              <Select
                value={preferences.defaultView}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, defaultView: value as CalendarView })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {calendarViews.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Week Starts On</Label>
              <Select
                value={preferences.weekStartsOn.toString()}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, weekStartsOn: parseInt(value) as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map(({ value, label }) => (
                    <SelectItem key={value} value={value.toString()}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="weekNumbers">Show Week Numbers</Label>
              <Switch
                id="weekNumbers"
                checked={preferences.showWeekNumbers}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, showWeekNumbers: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="tentativeEvents">Show Tentative Events</Label>
              <Switch
                id="tentativeEvents"
                checked={preferences.showTentativeEvents}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, showTentativeEvents: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="declinedEvents">Show Declined Events</Label>
              <Switch
                id="declinedEvents"
                checked={preferences.showDeclinedEvents}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, showDeclinedEvents: checked })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="time" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Time Format</Label>
              <Select
                value={preferences.timeFormat}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, timeFormat: value as '12h' | '24h' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                  <SelectItem value="24h">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Event Duration (minutes)</Label>
              <Input
                type="number"
                value={preferences.defaultEventDuration}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    defaultEventDuration: parseInt(e.target.value) || 60,
                  })
                }
                min="15"
                max="480"
                step="15"
              />
            </div>

            <div className="space-y-2">
              <Label>Working Hours</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Start Time</Label>
                  <Input
                    type="time"
                    value={preferences.workingHours.start}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        workingHours: { ...preferences.workingHours, start: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-sm">End Time</Label>
                  <Input
                    type="time"
                    value={preferences.workingHours.end}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        workingHours: { ...preferences.workingHours, end: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Working Days</Label>
              <div className="flex flex-wrap gap-2">
                {weekDays.map(({ value, label }) => (
                  <Button
                    key={value}
                    variant={preferences.workingDays.includes(value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleWorkingDay(value)}
                  >
                    {label.slice(0, 3)}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">Default Event Reminders</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Set default reminders that will be automatically added to new events
                </p>
                <Button variant="outline" size="sm">
                  <Bell className="h-4 w-4 mr-2" />
                  Add Default Reminder
                </Button>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">Notification Preferences</h4>
                <div className="space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailNotif">Email Notifications</Label>
                    <Switch id="emailNotif" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pushNotif">Push Notifications</Label>
                    <Switch id="pushNotif" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="soundNotif">Sound Notifications</Label>
                    <Switch id="soundNotif" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-4 mt-4">
            <CalendarSettings onClose={() => {}} openRoomDialog={openRoomDialog} />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smartScheduling">Smart Scheduling</Label>
                  <p className="text-sm text-muted-foreground">
                    AI-powered scheduling suggestions
                  </p>
                </div>
                <Switch
                  id="smartScheduling"
                  checked={preferences.enableSmartScheduling}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, enableSmartScheduling: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weatherIntegration">Weather Integration</Label>
                  <p className="text-sm text-muted-foreground">
                    Show weather forecasts for outdoor events
                  </p>
                </div>
                <Switch
                  id="weatherIntegration"
                  checked={preferences.enableWeatherIntegration}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, enableWeatherIntegration: checked })
                  }
                />
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">Focus Time Preferences</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure your preferred focus time blocks
                </p>
                <Button variant="outline" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Add Focus Time Block
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}