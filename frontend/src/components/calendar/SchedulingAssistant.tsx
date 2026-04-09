import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { addDays, format } from 'date-fns'
import { useIntl } from 'react-intl'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'

import type { EventPriority } from '../../types/calendar'
import { 
  Brain, 
  Clock, 
  Calendar, 
  Users, 
  MapPin, 
  Sparkles, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Lightbulb,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { useAIScheduleSuggestions, useCreateEvent } from '../../lib/api/calendar-api'
import { useGenerateDescriptionSuggestions } from '../../lib/api/ai-api'

// Note: Schema validation messages are defined outside component to avoid recreation
// They will be internationalized via form field error handling
const schedulingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  duration: z.number().min(15, 'Duration must be at least 15 minutes'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  attendees: z.array(z.string()),
  location: z.string().optional(),
  constraints: z.object({
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'any']).optional(),
    daysOfWeek: z.array(z.number()).optional(),
  }).optional(),
})

type SchedulingFormData = z.infer<typeof schedulingSchema>

interface TimeSlot {
  startTime: Date
  endTime: Date
  isAvailable: boolean
}

interface SmartSchedulingSuggestion {
  startTime: string
  endTime: string
  confidence: number
  reason: string
  considerations: string[]
  availableRooms: Array<{
    id: string
    name: string
    capacity: number
    equipment: string[]
  }>
}

interface SchedulingAssistantProps {
  open: boolean
  onClose: () => void
  onEventScheduled?: (eventId: string) => void
}

export function SchedulingAssistant({ open, onClose, onEventScheduled }: SchedulingAssistantProps) {
  const intl = useIntl()
  const [step, setStep] = useState<'form' | 'suggestions' | 'confirmation'>('form')
  const [selectedSuggestion, setSelectedSuggestion] = useState<SmartSchedulingSuggestion | null>(null)
  const [attendeeInput, setAttendeeInput] = useState('')
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([])
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<SmartSchedulingSuggestion[]>([])
  const [isCreating, setIsCreating] = useState(false)

  const { currentWorkspace } = useWorkspace()
  const aiScheduleSuggestions = useAIScheduleSuggestions(currentWorkspace?.id || '')
  const createEvent = useCreateEvent()
  const descriptionMutation = useGenerateDescriptionSuggestions()

  const form = useForm<SchedulingFormData>({
    resolver: zodResolver(schedulingSchema),
    defaultValues: {
      title: '',
      description: '',
      duration: 60,
      priority: 'normal',
      attendees: [],
      location: '',
      constraints: {
        timeOfDay: 'any',
        daysOfWeek: [1, 2, 3, 4, 5], // Weekdays by default
      },
    },
  })

  const generateMockSuggestions = (): SmartSchedulingSuggestion[] => {
    const suggestions: SmartSchedulingSuggestion[] = []
    const baseDate = new Date()
    
    for (let i = 0; i < 5; i++) {
      const daysToAdd = Math.floor(i / 2) + 1
      const isAfternoon = i % 2 === 0
      const startHour = isAfternoon ? 14 : 10
      
      const startTime = new Date(baseDate)
      startTime.setDate(startTime.getDate() + daysToAdd)
      startTime.setHours(startHour, 0, 0, 0)
      
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + form.getValues('duration'))
      
      suggestions.push({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        confidence: 0.95 - (i * 0.1),
        reason: i === 0 ? intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.suggestions.earliestSlot' }) : intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.suggestions.alternativeOption' }),
        considerations: [
          intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.considerations.noConflicts' }),
          intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.considerations.alignsPatterns' }),
          intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.considerations.attendeesAvailable' }),
          ...(i === 2 ? [intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.considerations.lunchOverlap' })] : [])
        ],
        availableRooms: []
      })
    }
    
    return suggestions
  }

  const handleFindTimeSlots = async (data: SchedulingFormData) => {
    if (!currentWorkspace) return
    
    setIsSearching(true)
    
    try {
      // Call the AI scheduling API with the form data
      const requestParams = {
        title: data.title,
        description: data.description || '',
        duration: data.duration,
        priority: data.priority,
        attendees: data.attendees,
        location: data.location,
        timePreference: data.constraints?.timeOfDay || 'any',
        lookAheadDays: 7, // Default to 7 days
        includeWeekends: false // Default to weekdays only
      }
      
      const response = await aiScheduleSuggestions.mutateAsync(requestParams)
      setSuggestions(response.suggestions)
      setStep('suggestions')

      toast.success(intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.toast.foundSlots' }, { count: response.suggestions.length }))
    } catch (error) {
      console.error('Error finding time slots:', error)
      toast.error(intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.toast.findSlotsFailed' }))
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectSuggestion = (suggestion: SmartSchedulingSuggestion) => {
    setSelectedSuggestion(suggestion)
    setStep('confirmation')
  }

  const handleConfirmScheduling = async () => {
    if (!selectedSuggestion || !currentWorkspace) return

    const title = form.getValues('title')?.trim()
    if (!title) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.toast.titleRequired' }))
      return
    }

    try {
      setIsCreating(true)

      // Create event from the selected AI suggestion
      const eventData = await createEvent.mutateAsync({
        workspaceId: currentWorkspace.id,
        data: {
          title: title,
          start_time: selectedSuggestion.startTime,
          end_time: selectedSuggestion.endTime,
          description: form.getValues('description') || selectedSuggestion.reason,
          location: form.getValues('location') || undefined,
          attendees: form.getValues('attendees') || [],
          priority: form.getValues('priority'),
          all_day: false,
        }
      })
      
      toast.success(intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.toast.eventScheduledSuccess' }))
      onEventScheduled?.(eventData.id)
      handleClose()
    } catch (error) {
      console.error('Failed to schedule event:', error)
      toast.error(intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.toast.eventScheduledFailed' }))
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    setStep('form')
    setSelectedSuggestion(null)
    setSuggestions([])
    form.reset()
    onClose()
  }

  const addAttendee = () => {
    if (attendeeInput.trim()) {
      const currentAttendees = form.getValues('attendees')
      if (!currentAttendees.includes(attendeeInput.trim())) {
        form.setValue('attendees', [...currentAttendees, attendeeInput.trim()])
        setAttendeeInput('')
      }
    }
  }

  const removeAttendee = (email: string) => {
    const currentAttendees = form.getValues('attendees')
    form.setValue('attendees', currentAttendees.filter(a => a !== email))
  }

  const generateDescriptionSuggestions = async () => {
    const title = form.getValues('title')

    // Validate title first
    if (!title.trim()) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.toast.titleRequiredForAI' }))
      return
    }

    setIsGeneratingDescription(true)
    setDescriptionSuggestions([])
    setShowDescriptionSuggestions(false)

    try {
      // Call the unified description suggestions endpoint
      const response = await descriptionMutation.mutateAsync({
        type: 'event',
        title: title.trim(),
        count: 3,
        tone: 'professional',
        length: 'medium'
      })

      // Use pre-parsed suggestions from backend
      let suggestions = response.suggestions

      // Fallback to smart patterns if AI doesn't provide good suggestions
      if (suggestions.length === 0 || suggestions.every(s => s.length < 20)) {
        suggestions = generateSmartDescriptions(title)
      }

      setDescriptionSuggestions(suggestions)
      setShowDescriptionSuggestions(true)
      toast.success(intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.toast.aiSuggestionsGenerated' }))
    } catch (error) {
      console.error('Error generating descriptions:', error)
      // Fallback to smart patterns if API fails
      const fallbackSuggestions = generateSmartDescriptions(title)
      setDescriptionSuggestions(fallbackSuggestions)
      setShowDescriptionSuggestions(true)
      toast.warning(intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.toast.fallbackSuggestions' }))
    } finally {
      setIsGeneratingDescription(false)
    }
  }

  const generateSmartDescriptions = (title: string): string[] => {
    const lowerTitle = title.toLowerCase()
    
    if (lowerTitle.includes('standup') || lowerTitle.includes('stand-up') || lowerTitle.includes('daily')) {
      return [
        'Quick daily sync to discuss progress, blockers, and plan for the day. Share updates on current tasks and upcoming priorities.',
        'Brief team check-in to align on deliverables, address any impediments, and coordinate daily activities.',
        'Daily standup meeting to review yesterday\'s accomplishments, today\'s goals, and any support needed from the team.'
      ]
    }
    
    if (lowerTitle.includes('retro') || lowerTitle.includes('retrospective')) {
      return [
        'Team retrospective to reflect on recent work, celebrate successes, identify improvement areas, and plan action items for the next iteration.',
        'Sprint retrospective meeting to discuss what went well, what could be improved, and specific actions to enhance team effectiveness.',
        'Collaborative session to review team performance, gather feedback, and implement process improvements for better outcomes.'
      ]
    }
    
    if (lowerTitle.includes('planning') || lowerTitle.includes('sprint planning')) {
      return [
        'Sprint planning session to review backlog items, estimate effort, define sprint goals, and commit to deliverables for the upcoming iteration.',
        'Collaborative planning meeting to prioritize features, break down user stories, and establish clear objectives for the development cycle.',
        'Team planning session to analyze requirements, assess capacity, and create a detailed execution plan for project milestones.'
      ]
    }
    
    if (lowerTitle.includes('1:1') || lowerTitle.includes('one-on-one') || lowerTitle.includes('1-on-1')) {
      return [
        'Regular one-on-one meeting to discuss career development, provide feedback, address concerns, and align on goals and expectations.',
        'Personal check-in to review performance, discuss professional growth opportunities, and ensure alignment on priorities and objectives.',
        'Individual meeting focused on career progression, skill development, feedback exchange, and addressing any workplace challenges.'
      ]
    }
    
    return [
      `Meeting to discuss ${title.toLowerCase()} and related topics. Review current status, address any questions, and plan next steps.`,
      `Collaborative session focused on ${title.toLowerCase()}. Share updates, gather feedback, and ensure alignment on objectives.`,
      `Discussion about ${title.toLowerCase()} to make progress on key initiatives and coordinate team activities.`
    ]
  }

  const applyDescriptionSuggestion = (suggestion: string) => {
    form.setValue('description', suggestion)
    setShowDescriptionSuggestions(false)
  }

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'title') {
        setShowDescriptionSuggestions(false)
        setDescriptionSuggestions([])
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFindTimeSlots)} className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.title' })}</h3>
          <Badge variant="secondary">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.betaBadge' })}</Badge>
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.eventTitle' })}</FormLabel>
              <FormControl>
                <Input placeholder={intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.eventTitlePlaceholder' })} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.description' })}</FormLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generateDescriptionSuggestions}
                  disabled={!form.getValues('title').trim() || isGeneratingDescription || descriptionMutation.isPending}
                  className="h-8 px-2 text-xs"
                >
                  {(isGeneratingDescription || descriptionMutation.isPending) ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.aiGenerating' })}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.aiSuggest' })}
                    </>
                  )}
                </Button>
              </div>
              <FormControl>
                <Textarea placeholder={intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.descriptionPlaceholder' })} rows={2} {...field} />
              </FormControl>
              
              {showDescriptionSuggestions && descriptionSuggestions.length > 0 && (
                <div className="mt-2 p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.aiDescriptionSuggestions' })}</span>
                    <Badge variant="secondary" className="text-xs">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.betaBadge' })}</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {descriptionSuggestions.map((suggestion, index) => (
                      <div key={index}>
                        <Card 
                          className="cursor-pointer hover:bg-accent/50 transition-colors border-dashed"
                          onClick={() => applyDescriptionSuggestion(suggestion)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {suggestion}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        {index < descriptionSuggestions.length - 1 && (
                          <Separator className="my-2" />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.clickToApply' })}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDescriptionSuggestions(false)}
                      className="h-7 px-2 text-xs"
                    >
                      {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.hide' })}
                    </Button>
                  </div>
                </div>
              )}
              
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.duration' })}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.priority' })}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.priorityLow' })}</SelectItem>
                    <SelectItem value="normal">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.priorityNormal' })}</SelectItem>
                    <SelectItem value="high">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.priorityHigh' })}</SelectItem>
                    <SelectItem value="urgent">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.priorityUrgent' })}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <Label>{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.attendees' })}</Label>
          <div className="space-y-2 mb-2">
            {form.watch('attendees').map(email => (
              <div key={email} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">{email}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttendee(email)}
                >
                  {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.remove' })}
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.emailPlaceholder' })}
              value={attendeeInput}
              onChange={(e) => setAttendeeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addAttendee()
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addAttendee}>
              {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.add' })}
            </Button>
          </div>
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.location' })}</FormLabel>
              <FormControl>
                <Input placeholder={intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.locationPlaceholder' })} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <Label>{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.schedulingPreferences' })}</Label>

          <FormField
            control={form.control}
            name="constraints.timeOfDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.preferredTimeOfDay' })}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="any">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.timeAny' })}</SelectItem>
                    <SelectItem value="morning">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.timeMorning' })}</SelectItem>
                    <SelectItem value="afternoon">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.timeAfternoon' })}</SelectItem>
                    <SelectItem value="evening">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.timeEvening' })}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.cancel' })}
          </Button>
          <Button
            type="submit"
            disabled={isSearching}
            className="flex items-center gap-2 btn-gradient-primary border-0"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.form.findOptimalTimes' })}
          </Button>
        </div>
      </form>
    </Form>
  )

  const renderSuggestions = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.suggestions.title' })}</h3>
        <Badge variant="outline">
          {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.suggestions.optionsFound' }, { count: suggestions.length })}
        </Badge>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <Card 
            key={index} 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedSuggestion === suggestion && "ring-2 ring-primary"
            )}
            onClick={() => handleSelectSuggestion(suggestion)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {format(new Date(suggestion.startTime), 'EEEE, MMMM d')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(suggestion.startTime), 'h:mm a')} - {format(new Date(suggestion.endTime), 'h:mm a')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.suggestions.confidence' }, { percentage: Math.round(suggestion.confidence) })}
                    </span>
                  </div>
                </div>

                <Badge
                  variant={suggestion.confidence > 80 ? "default" : "secondary"}
                  className="ml-2"
                >
                  {suggestion.confidence > 80 ? intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.suggestions.optimal' }) : intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.suggestions.good' })}
                </Badge>
              </div>

              <div className="mt-3">
                <div className="text-sm font-medium mb-1">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.suggestions.whyThisWorks' })}</div>
                <div className="text-xs text-muted-foreground">
                  {suggestion.reason}
                </div>
              </div>

              {suggestion.availableRooms && suggestion.availableRooms.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-medium mb-1">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.suggestions.availableRooms' })}</div>
                  <div className="space-y-1">
                    {suggestion.availableRooms.slice(0, 2).map((room) => (
                      <div key={room.id} className="text-xs text-muted-foreground">
                        • {room.name} ({intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.suggestions.capacity' })}: {room.capacity})
                      </div>
                    ))}
                    {suggestion.availableRooms.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.suggestions.moreRooms' }, { count: suggestion.availableRooms.length - 2 })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('form')}>
          {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.suggestions.backToForm' })}
        </Button>
        <Button
          onClick={() => selectedSuggestion && setStep('confirmation')}
          disabled={!selectedSuggestion}
        >
          {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.suggestions.scheduleSelectedTime' })}
        </Button>
      </div>
    </div>
  )

  const renderConfirmation = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.confirmation.title' })}</h3>
      </div>

      {selectedSuggestion && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {form.getValues('title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(selectedSuggestion.startTime), 'EEEE, MMMM d')} at{' '}
                {format(new Date(selectedSuggestion.startTime), 'h:mm a')} - {format(new Date(selectedSuggestion.endTime), 'h:mm a')}
              </span>
            </div>

            {form.getValues('attendees').length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.confirmation.attendeesInvited' }, { count: form.getValues('attendees').length })}</span>
              </div>
            )}

            {form.getValues('location') && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{form.getValues('location')}</span>
              </div>
            )}

            <div className="pt-3 border-t">
              <div className="text-sm font-medium mb-2">{intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.confirmation.whatHappensNext' })}</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.confirmation.step1' })}</li>
                <li>• {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.confirmation.step2' })}</li>
                <li>• {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.confirmation.step3' })}</li>
                <li>• {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.confirmation.step4' })}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('suggestions')}>
          {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.confirmation.backToSuggestions' })}
        </Button>
        <Button
          onClick={handleConfirmScheduling}
          disabled={isCreating}
          className="flex items-center gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.confirmation.creatingEvent' })}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              {intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.confirmation.confirmSchedule' })}
            </>
          )}
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'form' && intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.dialog.titleForm' })}
            {step === 'suggestions' && intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.dialog.titleSuggestions' })}
            {step === 'confirmation' && intl.formatMessage({ id: 'modules.calendar.schedulingAssistant.dialog.titleConfirmation' })}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && renderForm()}
        {step === 'suggestions' && renderSuggestions()}
        {step === 'confirmation' && renderConfirmation()}
      </DialogContent>
    </Dialog>
  )
}