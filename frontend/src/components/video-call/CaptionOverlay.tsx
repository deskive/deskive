/**
 * Caption Overlay Component
 * Displays live transcription captions at the bottom of video call
 * Similar to Zoom/Meet closed captions
 */

import React, { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface CaptionOverlayProps {
  caption: string | null
  speakerName: string | null
  isEnabled: boolean
  className?: string
}

export function CaptionOverlay({
  caption,
  speakerName,
  isEnabled,
  className,
}: CaptionOverlayProps) {
  const [displayCaption, setDisplayCaption] = useState<string | null>(null)
  const [displaySpeaker, setDisplaySpeaker] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update display with a fade effect
  useEffect(() => {
    if (caption) {
      setDisplayCaption(caption)
      setDisplaySpeaker(speakerName)

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout to clear caption after silence
      timeoutRef.current = setTimeout(() => {
        setDisplayCaption(null)
        setDisplaySpeaker(null)
      }, 5000) // Keep caption visible for 5 seconds after last update
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [caption, speakerName])

  // Clear caption when disabled
  useEffect(() => {
    if (!isEnabled) {
      setDisplayCaption(null)
      setDisplaySpeaker(null)
    }
  }, [isEnabled])

  if (!isEnabled) return null

  return (
    <AnimatePresence>
      {displayCaption && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute bottom-24 left-1/2 transform -translate-x-1/2 z-50",
            "max-w-3xl w-full mx-auto px-4",
            className
          )}
        >
          <div className="bg-black/80 backdrop-blur-sm rounded-lg px-6 py-3 shadow-2xl">
            {displaySpeaker && (
              <span className="text-blue-400 text-sm font-medium mr-2">
                {displaySpeaker}:
              </span>
            )}
            <span className="text-white text-lg leading-relaxed">
              {displayCaption}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Transcript Panel Component
 * Shows full transcript history in a scrollable panel
 */

interface TranscriptMessage {
  id: string
  speakerId: string
  speakerName: string
  text: string
  isFinal: boolean
  timestamp: number
  language?: string
}

interface TranscriptPanelProps {
  transcripts: TranscriptMessage[]
  isOpen: boolean
  onClose?: () => void
  className?: string
}

export function TranscriptPanel({
  transcripts,
  isOpen,
  onClose,
  className,
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new transcript arrives
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcripts, isOpen])

  if (!isOpen) return null

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Group transcripts by speaker for better readability
  const groupedTranscripts = transcripts.reduce((groups, transcript, index) => {
    const prevTranscript = transcripts[index - 1]

    // Start new group if different speaker or more than 10 seconds gap
    if (
      !prevTranscript ||
      prevTranscript.speakerId !== transcript.speakerId ||
      transcript.timestamp - prevTranscript.timestamp > 10000
    ) {
      groups.push({
        speakerId: transcript.speakerId,
        speakerName: transcript.speakerName,
        startTime: transcript.timestamp,
        messages: [transcript],
      })
    } else {
      // Add to existing group
      groups[groups.length - 1].messages.push(transcript)
    }

    return groups
  }, [] as Array<{
    speakerId: string
    speakerName: string
    startTime: number
    messages: TranscriptMessage[]
  }>)

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-gray-900/95 border-l border-gray-700 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Transcript
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Transcript content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ overflowX: 'hidden', width: '100%' }}
      >
        {transcripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg
              className="w-16 h-16 mb-4 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <p className="text-center">
              Transcript will appear here when<br />someone starts speaking
            </p>
          </div>
        ) : (
          <div className="max-w-full" style={{ width: '100%', overflow: 'hidden' }}>
            {groupedTranscripts.map((group, groupIndex) => (
              <div key={`${group.speakerId}-${group.startTime}`} className="space-y-1 mb-4" style={{ maxWidth: '100%' }}>
                {/* Speaker header */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-blue-400 truncate">
                    {group.speakerName}
                  </span>
                  <span className="text-gray-500 text-xs flex-shrink-0">
                    {formatTime(group.startTime)}
                  </span>
                </div>

                {/* Messages */}
                <div
                  className="text-white leading-relaxed text-sm pr-2"
                  style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '100%',
                    width: '100%',
                    overflow: 'hidden'
                  }}
                >
                  {group.messages.map((msg, msgIndex) => (
                    <span
                      key={msg.id}
                      className={cn(
                        !msg.isFinal && "text-gray-400 italic"
                      )}
                    >
                      {msg.text}
                      {msgIndex < group.messages.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>{transcripts.length} segments</span>
          <span>Powered by OpenAI</span>
        </div>
      </div>
    </div>
  )
}

export default CaptionOverlay
