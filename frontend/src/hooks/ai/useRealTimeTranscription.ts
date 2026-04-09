/**
 * useRealTimeTranscription Hook - Speech-to-text with Web Speech API
 * Migrated from Next.js to React+Vite+TypeScript
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import type { TranscriptionEntry } from '@/types/video'

export interface TranscriptionSegment {
  id: string
  text: string
  speaker?: string
  confidence: number
  timestamp: number
  isFinal: boolean
  start?: number
  end?: number
}

export interface SpeakerInfo {
  id: string
  name: string
  color: string
  avatar?: string
}

export interface TranscriptionState {
  isActive: boolean
  segments: TranscriptionSegment[]
  currentSegment: string
  speakers: SpeakerInfo[]
  confidence: number
  language: string
  isConnected: boolean
  error: string | null
}

export interface UseRealTimeTranscriptionReturn extends TranscriptionState {
  // Actions
  startTranscription: (
    sessionId: string,
    options?: {
      language?: string
      speakerDiarization?: boolean
      enableTranslation?: boolean
      targetLanguages?: string[]
    }
  ) => Promise<{ transcriptionId: string }>
  stopTranscription: () => Promise<void>
  
  // Computed values
  getFullTranscript: () => string
  getSegmentsBySpeaker: (speakerId: string) => TranscriptionSegment[]
  getSpeakingStats: () => Array<{
    speaker: SpeakerInfo
    segmentCount: number
    wordCount: number
    speakingTime: number
    averageConfidence: number
    wordPercentage: number
    timePercentage: number
  }>
  hasSegments: boolean
  currentText: string
}

export const useRealTimeTranscription = (): UseRealTimeTranscriptionReturn => {
  const [state, setState] = useState<TranscriptionState>({
    isActive: false,
    segments: [],
    currentSegment: '',
    speakers: [],
    confidence: 0,
    language: 'en',
    isConnected: false,
    error: null,
  })

  const speechRecognitionRef = useRef<any>(null)
  const segmentCounterRef = useRef(0)

  // Start transcription with Web Speech API
  const startTranscription = useCallback(async (
    sessionId: string,
    options: {
      language?: string
      speakerDiarization?: boolean
      enableTranslation?: boolean
      targetLanguages?: string[]
    } = {}
  ): Promise<{ transcriptionId: string }> => {
    try {
      setState(prev => ({ ...prev, error: null }))

      // Check if Web Speech API is supported
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Speech recognition not supported in this browser')
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      speechRecognitionRef.current = new SpeechRecognition()
      
      const recognition = speechRecognitionRef.current
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = options.language || 'en'
      recognition.maxAlternatives = 1

      const currentSpeaker = 'speaker_1'

      recognition.onstart = () => {
        console.log('Speech recognition started')
        setState(prev => ({ 
          ...prev, 
          isActive: true,
          isConnected: true,
          language: options.language || 'en',
          segments: [],
          currentSegment: '',
          speakers: [
            { id: 'speaker_1', name: 'Speaker 1', color: '#3B82F6' },
            { id: 'speaker_2', name: 'Speaker 2', color: '#EF4444' },
          ]
        }))
      }

      recognition.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          const confidence = event.results[i][0].confidence

          if (event.results[i].isFinal) {
            finalTranscript += transcript
            
            // Create a final segment
            const segment: TranscriptionSegment = {
              id: `segment_${++segmentCounterRef.current}`,
              text: transcript.trim(),
              speaker: currentSpeaker,
              confidence: confidence || 0.8,
              timestamp: Date.now(),
              isFinal: true,
            }

            setState(prev => ({
              ...prev,
              segments: [...prev.segments, segment],
              currentSegment: '',
              confidence: confidence || 0.8,
            }))
          } else {
            interimTranscript += transcript
            setState(prev => ({
              ...prev,
              currentSegment: interimTranscript.trim(),
              confidence: confidence || 0.6,
            }))
          }
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setState(prev => ({ 
          ...prev, 
          error: `Speech recognition error: ${event.error}`,
          isConnected: false 
        }))
        toast.error(`Transcription error: ${event.error}`)
      }

      recognition.onend = () => {
        console.log('Speech recognition ended')
        // Auto-restart if still active
        if (state.isActive) {
          setTimeout(() => {
            if (speechRecognitionRef.current && state.isActive) {
              speechRecognitionRef.current.start()
            }
          }, 100)
        }
      }

      recognition.start()
      toast.success('Real-time transcription started')
      
      return { transcriptionId: sessionId }
    } catch (error) {
      console.error('Failed to start transcription:', error)
      setState(prev => ({ ...prev, error: 'Failed to start transcription' }))
      toast.error('Failed to start transcription')
      throw error
    }
  }, [state.isActive])

  // Stop transcription
  const stopTranscription = useCallback(async () => {
    try {
      // Stop Web Speech API
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop()
        speechRecognitionRef.current = null
      }

      setState({
        isActive: false,
        segments: [],
        currentSegment: '',
        speakers: [],
        confidence: 0,
        language: 'en',
        isConnected: false,
        error: null,
      })

      segmentCounterRef.current = 0
      toast.success('Transcription stopped')
    } catch (error) {
      console.error('Failed to stop transcription:', error)
      toast.error('Failed to stop transcription')
    }
  }, [])

  // Get full transcript as text
  const getFullTranscript = useCallback((): string => {
    return state.segments
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(segment => {
        const speaker = state.speakers.find(s => s.id === segment.speaker)
        const speakerName = speaker?.name || segment.speaker || 'Unknown'
        return `${speakerName}: ${segment.text}`
      })
      .join('\n')
  }, [state.segments, state.speakers])

  // Get segments by speaker
  const getSegmentsBySpeaker = useCallback((speakerId: string): TranscriptionSegment[] => {
    return state.segments.filter(segment => segment.speaker === speakerId)
  }, [state.segments])

  // Get speaking statistics
  const getSpeakingStats = useCallback(() => {
    const stats = state.speakers.map(speaker => {
      const segments = getSegmentsBySpeaker(speaker.id)
      const totalWords = segments.reduce((count, segment) => count + segment.text.split(' ').length, 0)
      const totalTime = segments.reduce((time, segment) => {
        if (segment.start && segment.end) {
          return time + (segment.end - segment.start)
        }
        return time
      }, 0)

      return {
        speaker,
        segmentCount: segments.length,
        wordCount: totalWords,
        speakingTime: totalTime,
        averageConfidence: segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length || 0,
      }
    })

    const totalWords = stats.reduce((sum, s) => sum + s.wordCount, 0)
    const totalTime = stats.reduce((sum, s) => sum + s.speakingTime, 0)

    return stats.map(stat => ({
      ...stat,
      wordPercentage: totalWords > 0 ? (stat.wordCount / totalWords) * 100 : 0,
      timePercentage: totalTime > 0 ? (stat.speakingTime / totalTime) * 100 : 0,
    }))
  }, [state.speakers, getSegmentsBySpeaker])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop()
      }
    }
  }, [])

  return {
    // State
    ...state,
    
    // Actions
    startTranscription,
    stopTranscription,
    
    // Computed values
    getFullTranscript,
    getSegmentsBySpeaker,
    getSpeakingStats,
    hasSegments: state.segments.length > 0,
    currentText: state.currentSegment || (state.segments[state.segments.length - 1]?.text || ''),
  }
}

// Helper function to generate consistent colors for speakers
export const generateSpeakerColor = (speakerId: string): string => {
  const colors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
  ]
  
  // Use simple hash to consistently assign colors
  let hash = 0
  for (let i = 0; i < speakerId.length; i++) {
    hash = speakerId.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}