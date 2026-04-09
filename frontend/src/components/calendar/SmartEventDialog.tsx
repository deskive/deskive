import { useState, useRef, useEffect } from 'react'
import { useIntl } from 'react-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '../ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, Calendar, Clock, MapPin, Users, Brain, Loader2, Mic, MicOff } from 'lucide-react'
import { toast } from 'sonner'
import { format, addHours, parse, isValid } from 'date-fns'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { useSmartSchedule, useCreateEvent } from '../../lib/api/calendar-api'

interface SmartEventDialogProps {
  open: boolean
  onClose: () => void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SmartSuggestion {
  id?: string
  title?: string
  startTime: string
  endTime: string
  location?: string
  attendees?: string[]
  confidence: number
  reasoning: string
  recommendedRoom?: {
    id: string
    name: string
    capacity: number
    equipment?: string[]
    whyRecommended?: string
    location?: string
  }
  alternativeRooms?: Array<{
    id: string
    name: string
    capacity: number
    equipment?: string[]
    note?: string
  }>
  promptMatchScore?: number
  considerations?: string[]
}

export function SmartEventDialog({ open, onClose }: SmartEventDialogProps) {
  const intl = useIntl()
  const [input, setInput] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState<SmartSuggestion | null>(null)
  const [extractedTitle, setExtractedTitle] = useState<string>('')
  const [isListening, setIsListening] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [includeWeekends, setIncludeWeekends] = useState(false)
  const [maxLookAheadDays, setMaxLookAheadDays] = useState(14)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const { currentWorkspace } = useWorkspace()
  const smartSchedule = useSmartSchedule(currentWorkspace?.id || '')
  const createEvent = useCreateEvent()

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onstart = () => {
          setIsRecording(true)
        }

        recognitionRef.current.onresult = (event) => {
          let interimTranscript = ''
          let finalTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          if (finalTranscript) {
            setInput(prev => prev + ' ' + finalTranscript)
          }
        }

        recognitionRef.current.onend = () => {
          setIsRecording(false)
          setIsListening(false)
        }

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
          setIsRecording(false)
          setIsListening(false)
          toast.error(intl.formatMessage({ id: 'modules.calendar.smartEventDialog.errors.voiceRecognition' }))
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.smartEventDialog.errors.voiceNotSupported' }))
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
      toast.info(intl.formatMessage({ id: 'modules.calendar.smartEventDialog.toast.listening' }))
    }
  }


  const analyzeInput = async () => {
    if (!input.trim() || !currentWorkspace) return

    setIsAnalyzing(true)

    try {
      // Get user's timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'

      // Call the smart schedule API with the correct request format
      const response = await smartSchedule.mutateAsync({
        prompt: input.trim(),
        context: 'work',
        maxLookAheadDays,
        includeWeekends,
        timezone,
        additionalNotes: additionalNotes.trim() || undefined
      })

      console.log('API Response:', response)
      console.log('Suggestions:', response.suggestions)

      // Extract title from extractedInfo
      const title = response.extractedInfo?.title || input.trim().slice(0, 50)
      setExtractedTitle(title)

      // Merge title into each suggestion
      const suggestionsWithTitle = (Array.isArray(response.suggestions) ? response.suggestions : []).map((s: SmartSuggestion, index: number) => ({
        ...s,
        id: s.id || `suggestion-${index}`,
        title: title,
        location: response.extractedInfo?.preferredLocation,
        attendees: response.extractedInfo?.attendees || [],
      }))

      setSuggestions(suggestionsWithTitle)
      setIsAnalyzing(false)
    } catch (error) {
      console.error('Failed to get AI suggestions:', error)
      toast.error(intl.formatMessage({ id: 'modules.calendar.smartEventDialog.errors.analyzeFailed' }))
      setIsAnalyzing(false)
    }
  }

  const handleCreateEvent = async () => {
    if (!selectedSuggestion || !currentWorkspace) return

    // Validate title - use extractedTitle as fallback
    const title = (selectedSuggestion.title || extractedTitle)?.trim()
    if (!title) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.smartEventDialog.errors.titleRequired' }))
      return
    }

    try {
      // Create event from the selected AI suggestion
      await createEvent.mutateAsync({
        workspaceId: currentWorkspace.id,
        data: {
          title: title,
          start_time: selectedSuggestion.startTime,
          end_time: selectedSuggestion.endTime,
          location: selectedSuggestion.location || selectedSuggestion.recommendedRoom?.location || undefined,
          attendees: selectedSuggestion.attendees || [],
          description: selectedSuggestion.reasoning || '',
          priority: 'normal',
          all_day: false,
        }
      })

      toast.success(intl.formatMessage({ id: 'modules.calendar.smartEventDialog.toast.createSuccess' }, { title: title }))

      // Reset
      setInput('')
      setSuggestions([])
      setSelectedSuggestion(null)
      setExtractedTitle('')
      setAdditionalNotes('')
      setIncludeWeekends(false)
      setMaxLookAheadDays(14)
      onClose()
    } catch (error) {
      console.error('Failed to create event:', error)
      toast.error(intl.formatMessage({ id: 'modules.calendar.smartEventDialog.errors.createFailed' }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {intl.formatMessage({ id: 'modules.calendar.smartEventDialog.title' })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="space-y-4">
            <div>
              <Label>{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.fields.description' })}</Label>
              <Textarea
                placeholder={intl.formatMessage({ id: 'modules.calendar.smartEventDialog.placeholders.description' })}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
                className="resize-none mt-2"
              />
            </div>

            <div className="flex items-center justify-center">
              <button
                type="button"
                className={`w-16 h-16 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                  isRecording 
                    ? 'bg-red-500 border-red-500 animate-pulse'
                    : isListening
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
                onClick={toggleVoiceInput}
                title={isListening ? intl.formatMessage({ id: 'modules.calendar.smartEventDialog.voice.stop' }) : intl.formatMessage({ id: 'modules.calendar.smartEventDialog.voice.start' })}
              >
                {isRecording ? (
                  <MicOff 
                    className="w-8 h-8 text-white" 
                    strokeWidth={2}
                  />
                ) : (
                  <Mic 
                    className={`w-8 h-8 ${isListening ? 'text-white' : 'text-gray-600'}`} 
                    strokeWidth={2}
                  />
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                {isListening
                  ? intl.formatMessage({ id: 'modules.calendar.smartEventDialog.voice.listening' })
                  : intl.formatMessage({ id: 'modules.calendar.smartEventDialog.voice.instructions' })
                }
              </p>
              <Button
                onClick={analyzeInput}
                disabled={!input.trim() || isAnalyzing}
                size="default"
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {intl.formatMessage({ id: 'modules.calendar.smartEventDialog.buttons.analyzing' })}
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    {intl.formatMessage({ id: 'modules.calendar.smartEventDialog.buttons.getSuggestions' })}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <h4 className="text-sm font-medium">{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.preferences.title' })}</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lookAheadDays" className="text-sm">{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.preferences.lookAheadDays' })}</Label>
                <Select value={maxLookAheadDays.toString()} onValueChange={(value) => setMaxLookAheadDays(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.preferences.days' }, { days: 7 })}</SelectItem>
                    <SelectItem value="14">{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.preferences.days' }, { days: 14 })}</SelectItem>
                    <SelectItem value="30">{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.preferences.days' }, { days: 30 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeWeekends"
                  checked={includeWeekends}
                  onCheckedChange={(checked) => setIncludeWeekends(checked as boolean)}
                />
                <Label htmlFor="includeWeekends" className="text-sm">{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.preferences.includeWeekends' })}</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalNotes" className="text-sm">{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.preferences.additionalNotes' })}</Label>
              <Textarea
                id="additionalNotes"
                placeholder={intl.formatMessage({ id: 'modules.calendar.smartEventDialog.placeholders.additionalNotes' })}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Voice Input Tips */}
          {isListening && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.voiceTips.title' })}</h4>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-0.5">
                <li>{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.voiceTips.tip1' })}</li>
                <li>{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.voiceTips.tip2' })}</li>
                <li>{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.voiceTips.tip3' })}</li>
                <li>{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.voiceTips.tip4' })}</li>
              </ul>
            </div>
          )}

          {suggestions && Array.isArray(suggestions) && suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.suggestions.title' })}</h3>
              {suggestions.map((suggestion, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all ${
                    selectedSuggestion === suggestion
                      ? 'ring-2 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedSuggestion(suggestion)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{suggestion.title}</h4>
                      <Badge variant="secondary">
                        {intl.formatMessage({ id: 'modules.calendar.smartEventDialog.suggestions.match' }, { percent: suggestion.promptMatchScore || suggestion.confidence })}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(suggestion.startTime), 'EEEE, MMMM d')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(new Date(suggestion.startTime), 'h:mm a')} - {format(new Date(suggestion.endTime), 'h:mm a')}
                        </span>
                      </div>
                      {(suggestion.location || suggestion.recommendedRoom) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {suggestion.recommendedRoom 
                              ? `${suggestion.recommendedRoom.name}${suggestion.recommendedRoom.location ? ` (${suggestion.recommendedRoom.location})` : ''}`
                              : suggestion.location
                            }
                          </span>
                        </div>
                      )}
                      {suggestion.attendees && Array.isArray(suggestion.attendees) && suggestion.attendees.length > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{suggestion.attendees.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {suggestion.reasoning && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {suggestion.reasoning}
                      </p>
                    )}

                    {suggestion.recommendedRoom && (
                      <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                        <div className="font-medium text-primary">{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.suggestions.recommendedRoom' })}</div>
                        <div>{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.suggestions.capacity' }, { capacity: suggestion.recommendedRoom.capacity })}</div>
                        {suggestion.recommendedRoom.equipment && suggestion.recommendedRoom.equipment.length > 0 && (
                          <div>{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.suggestions.features' })}: {suggestion.recommendedRoom.equipment.join(', ')}</div>
                        )}
                      </div>
                    )}

                    {suggestion.considerations && Array.isArray(suggestion.considerations) && suggestion.considerations.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <div className="font-medium">{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.suggestions.considerations' })}:</div>
                        <ul className="list-disc list-inside mt-1">
                          {suggestion.considerations.map((consideration, i) => (
                            <li key={i}>{consideration}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isAnalyzing && (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) && input && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">{intl.formatMessage({ id: 'modules.calendar.smartEventDialog.emptyState' })}</p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            {intl.formatMessage({ id: 'modules.calendar.smartEventDialog.buttons.cancel' })}
          </Button>
          <Button
            onClick={handleCreateEvent}
            disabled={!selectedSuggestion}
          >
            {intl.formatMessage({ id: 'modules.calendar.smartEventDialog.buttons.createEvent' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}