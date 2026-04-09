/**
 * Real-time Transcription Hook
 * Connects to backend transcription WebSocket for live captions
 * Uses OpenAI Realtime API (gpt-4o-mini-transcribe) for cost-effective transcription
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { io, Socket } from 'socket.io-client'

// Helper to get current user's display name
const getCurrentUserName = (): string => {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      return user.name || user.displayName || user.email?.split('@')[0] || 'You'
    }
    return 'You'
  } catch {
    return 'You'
  }
}

export interface TranscriptMessage {
  id: string
  speakerId: string
  speakerName: string
  text: string
  isFinal: boolean
  timestamp: number
  language?: string
}

interface TranscriptionDelta {
  itemId: string
  speakerId: string
  delta: string
  timestamp: number
}

interface UseTranscriptionOptions {
  callId: string | null
  enabled: boolean
  language?: string
  onTranscript?: (transcript: TranscriptMessage) => void
  onDelta?: (delta: TranscriptionDelta) => void
}

interface UseTranscriptionReturn {
  isConnected: boolean
  isTranscribing: boolean
  transcripts: TranscriptMessage[]
  currentCaption: string | null
  currentSpeaker: string | null
  startTranscription: () => Promise<boolean>
  stopTranscription: () => Promise<void>
  clearTranscripts: () => void
  changeLanguage: (language: string) => void
}

// Audio processing constants
const TARGET_SAMPLE_RATE = 24000 // OpenAI expects 24kHz
const CHANNELS = 1 // Mono
const CHUNK_SIZE = 4096 // Samples per chunk

// Simple linear resampling function
function resampleAudio(inputBuffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return inputBuffer
  }

  const ratio = inputSampleRate / outputSampleRate
  const outputLength = Math.floor(inputBuffer.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio
    const srcIndexFloor = Math.floor(srcIndex)
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputBuffer.length - 1)
    const t = srcIndex - srcIndexFloor
    output[i] = inputBuffer[srcIndexFloor] * (1 - t) + inputBuffer[srcIndexCeil] * t
  }

  return output
}

export function useTranscription({
  callId,
  enabled,
  language = 'en',
  onTranscript,
  onDelta,
}: UseTranscriptionOptions): UseTranscriptionReturn {
  const socketRef = useRef<Socket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isTranscribingRef = useRef(false)

  const [isConnected, setIsConnected] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([])
  const [currentCaption, setCurrentCaption] = useState<string | null>(null)
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null)
  const [pendingDeltas, setPendingDeltas] = useState<Map<string, string>>(new Map())

  // Connect to transcription WebSocket
  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return

    const token = localStorage.getItem('auth_token')
    if (!token) {
      console.error('[Transcription] No auth token available')
      return
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002'
    const baseUrl = apiUrl.replace('/api/v1', '')

    socketRef.current = io(`${baseUrl}/transcription`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current.on('connect', () => {
      console.log('[Transcription] Connected to transcription service')
      setIsConnected(true)
    })

    socketRef.current.on('disconnect', () => {
      console.log('[Transcription] Disconnected from transcription service')
      setIsConnected(false)
      setIsTranscribing(false)
      isTranscribingRef.current = false
    })

    socketRef.current.on('connect_error', (error) => {
      console.error('[Transcription] Connection error:', error)
      setIsConnected(false)
    })

    // Handle transcription events
    socketRef.current.on('transcription:connected', () => {
      console.log('[Transcription] OpenAI connection established')
      setIsTranscribing(true)
      isTranscribingRef.current = true
    })

    socketRef.current.on('transcription:disconnected', () => {
      console.log('[Transcription] OpenAI connection closed')
      setIsTranscribing(false)
      isTranscribingRef.current = false
    })

    socketRef.current.on('transcription:delta', (data: TranscriptionDelta) => {
      // Update pending deltas for streaming display
      setPendingDeltas(prev => {
        const newMap = new Map(prev)
        const current = newMap.get(data.itemId) || ''
        newMap.set(data.itemId, current + data.delta)
        return newMap
      })

      // Update current caption for display
      setCurrentCaption(prev => (prev || '') + data.delta)
      // Use the current user's name since we're capturing their mic
      setCurrentSpeaker(getCurrentUserName())

      onDelta?.(data)
    })

    socketRef.current.on('transcription:completed', (data: TranscriptMessage) => {
      console.log('[Transcription] Completed:', data.text?.substring(0, 50))

      // Ensure speaker name is set properly
      const transcriptWithName: TranscriptMessage = {
        ...data,
        speakerName: data.speakerName || getCurrentUserName(),
      }

      // Add to transcripts
      setTranscripts(prev => [...prev, transcriptWithName])

      // Clear pending delta for this item
      setPendingDeltas(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.id)
        return newMap
      })

      // Clear current caption after a short delay
      setTimeout(() => {
        setCurrentCaption(null)
        setCurrentSpeaker(null)
      }, 2000)

      onTranscript?.(transcriptWithName)
    })

    socketRef.current.on('transcription:error', (data: { error: string }) => {
      console.error('[Transcription] Error:', data.error)
      // No toast - just log to console
    })

    socketRef.current.on('transcription:language-changed', (data: { language: string; changedBy: string }) => {
      console.log('[Transcription] Language changed to', data.language)
    })
  }, [onTranscript, onDelta])

  // Setup audio capture and processing
  const setupAudioCapture = useCallback(async (): Promise<boolean> => {
    try {
      // Get microphone access - let browser pick best settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })
      streamRef.current = stream
      console.log('[Transcription] Microphone access granted')

      // Create audio context - let browser pick sample rate
      audioContextRef.current = new AudioContext()
      const actualSampleRate = audioContextRef.current.sampleRate
      console.log(`[Transcription] AudioContext sample rate: ${actualSampleRate}Hz (target: ${TARGET_SAMPLE_RATE}Hz)`)

      // Create source from stream
      const source = audioContextRef.current.createMediaStreamSource(stream)

      // Create script processor for audio data
      const processor = audioContextRef.current.createScriptProcessor(CHUNK_SIZE, CHANNELS, CHANNELS)

      let audioChunkCount = 0
      processor.onaudioprocess = (event) => {
        if (!isTranscribingRef.current || !socketRef.current?.connected) {
          return
        }

        const inputData = event.inputBuffer.getChannelData(0)

        // Resample to 24kHz if needed
        const resampledData = resampleAudio(inputData, actualSampleRate, TARGET_SAMPLE_RATE)

        // Convert Float32Array to Int16Array (PCM16)
        const pcm16 = new Int16Array(resampledData.length)
        for (let i = 0; i < resampledData.length; i++) {
          const sample = Math.max(-1, Math.min(1, resampledData[i]))
          pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
        }

        // Convert to base64
        const uint8Array = new Uint8Array(pcm16.buffer)
        let binary = ''
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i])
        }
        const base64 = btoa(binary)

        // Send to backend
        socketRef.current?.emit('transcription:audio', {
          callId,
          audio: base64,
        })

        // Debug: Log every 25 chunks
        audioChunkCount++
        if (audioChunkCount % 25 === 0) {
          console.log(`[Transcription] Sent ${audioChunkCount} audio chunks (${resampledData.length} samples each)`)
        }
      }

      source.connect(processor)
      processor.connect(audioContextRef.current.destination)

      console.log('[Transcription] Audio capture setup complete - listening for speech')
      return true
    } catch (error) {
      console.error('[Transcription] Failed to setup audio capture:', error)
      return false
    }
  }, [callId])

  // Start transcription
  const startTranscription = useCallback(async (): Promise<boolean> => {
    if (!callId) {
      console.warn('[Transcription] Cannot start: missing callId')
      return false
    }

    // Connect socket if not connected
    if (!socketRef.current?.connected) {
      connectSocket()
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    if (!socketRef.current?.connected) {
      console.error('[Transcription] Failed to connect to transcription service')
      return false
    }

    // Request to start transcription FIRST (before audio setup)
    const serverStarted = await new Promise<boolean>((resolve) => {
      socketRef.current?.emit(
        'transcription:start',
        { callId, language },
        (response: { success: boolean; error?: string; sessionId?: string }) => {
          if (response.success) {
            console.log('[Transcription] Server started session:', response.sessionId)
            resolve(true)
          } else {
            console.error('[Transcription] Server failed to start:', response.error)
            resolve(false)
          }
        }
      )
    })

    if (!serverStarted) return false

    // NOW set transcribing flag BEFORE audio setup so audio processor can send data
    setIsTranscribing(true)
    isTranscribingRef.current = true
    console.log('[Transcription] isTranscribingRef set to true')

    // Setup audio capture AFTER server is ready
    const audioSetup = await setupAudioCapture()
    if (!audioSetup) {
      setIsTranscribing(false)
      isTranscribingRef.current = false
      return false
    }

    console.log('[Transcription] Live captions enabled')
    return true
  }, [callId, language, connectSocket, setupAudioCapture])

  // Stop transcription
  const stopTranscription = useCallback(async () => {
    if (!socketRef.current?.connected || !callId) return

    // Stop audio capture
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Request to stop transcription
    return new Promise<void>((resolve) => {
      socketRef.current?.emit(
        'transcription:stop',
        { callId },
        (response: { success: boolean; transcript?: string }) => {
          console.log('[Transcription] Stopped:', response.success)
          setIsTranscribing(false)
          isTranscribingRef.current = false
          setCurrentCaption(null)
          setCurrentSpeaker(null)
          resolve()
        }
      )
    })
  }, [callId])

  // Clear transcripts
  const clearTranscripts = useCallback(() => {
    setTranscripts([])
    setPendingDeltas(new Map())
    setCurrentCaption(null)
    setCurrentSpeaker(null)
  }, [])

  // Change language
  const changeLanguage = useCallback((newLanguage: string) => {
    if (!socketRef.current?.connected || !callId) return

    socketRef.current.emit(
      'transcription:language',
      { callId, language: newLanguage },
      (response: { success: boolean }) => {
        if (response.success) {
          console.log('[Transcription] Language changed to', newLanguage)
        }
      }
    )
  }, [callId])

  // Connect socket when enabled
  useEffect(() => {
    if (enabled && callId) {
      connectSocket()
    }

    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [enabled, callId, connectSocket])

  return {
    isConnected,
    isTranscribing,
    transcripts,
    currentCaption,
    currentSpeaker,
    startTranscription,
    stopTranscription,
    clearTranscripts,
    changeLanguage,
  }
}
