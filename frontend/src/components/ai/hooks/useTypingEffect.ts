// useTypingEffect.ts - Custom hook for typing animation effect
import { useState, useEffect, useRef, useCallback } from 'react'
import type { UseTypingEffectOptions, UseTypingEffectReturn } from '../types/assistant.types'

/**
 * Custom hook for creating a typing animation effect.
 *
 * This hook manages a buffer of text that can be appended to (for streaming)
 * and animates the display of that text character-by-character at a controlled rate.
 *
 * Usage:
 * - For streaming (text_delta events): use appendToBuffer() to add chunks
 * - For full text (text events): use setFullContent() to display instantly
 * - The displayedContent updates progressively to create the typing effect
 *
 * @param options - Configuration options for timing and chunk size
 */
export function useTypingEffect(options: UseTypingEffectOptions = {}): UseTypingEffectReturn {
  const {
    minDelay = 15,      // Minimum 15ms between characters (fast typing)
    maxDelay = 35,      // Maximum 35ms between characters (natural variation)
    chunkSize = 2       // Display 2 characters per tick for smoother feel
  } = options

  // State for the displayed content (what the user sees)
  const [displayedContent, setDisplayedContent] = useState('')

  // State to track if typing animation is active
  const [isTyping, setIsTyping] = useState(false)

  // Refs to track buffer and display progress without triggering re-renders
  const bufferRef = useRef('')           // Full content received
  const displayedIndexRef = useRef(0)    // How many characters are displayed
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /**
   * Start or continue the typing animation
   */
  const startTypingAnimation = useCallback(() => {
    // Don't start if already running
    if (intervalRef.current) return

    setIsTyping(true)

    intervalRef.current = setInterval(() => {
      // Check if there's more content to display
      if (displayedIndexRef.current < bufferRef.current.length) {
        // Calculate next chunk end position
        const nextIndex = Math.min(
          displayedIndexRef.current + chunkSize,
          bufferRef.current.length
        )

        // Update displayed index
        displayedIndexRef.current = nextIndex

        // Update displayed content state
        setDisplayedContent(bufferRef.current.slice(0, nextIndex))
      } else {
        // Buffer caught up - pause animation but keep ready for more
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setIsTyping(false)
      }
    }, minDelay + Math.random() * (maxDelay - minDelay))
  }, [minDelay, maxDelay, chunkSize])

  /**
   * Append text to the buffer (used for text_delta streaming events)
   * This will automatically start/continue the typing animation
   */
  const appendToBuffer = useCallback((text: string) => {
    // Add to buffer
    bufferRef.current += text

    // Start animation if not already running
    startTypingAnimation()
  }, [startTypingAnimation])

  /**
   * Set the full content instantly (used for complete text events)
   * This bypasses the typing animation for immediate display
   */
  const setFullContent = useCallback((text: string) => {
    // Stop any running animation
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Set buffer and display index to full content
    bufferRef.current = text
    displayedIndexRef.current = text.length

    // Update state
    setDisplayedContent(text)
    setIsTyping(false)
  }, [])

  /**
   * Reset all state (used when starting a new message)
   */
  const reset = useCallback(() => {
    // Stop any running animation
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Reset all refs and state
    bufferRef.current = ''
    displayedIndexRef.current = 0
    setDisplayedContent('')
    setIsTyping(false)
  }, [])

  /**
   * Complete any remaining typing animation instantly
   * Useful for when the stream completes and we want to show all remaining content
   */
  const completeTyping = useCallback(() => {
    if (displayedIndexRef.current < bufferRef.current.length) {
      // Stop animation
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      // Display all remaining content
      displayedIndexRef.current = bufferRef.current.length
      setDisplayedContent(bufferRef.current)
      setIsTyping(false)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    displayedContent,           // Currently visible text
    isTyping,                   // Whether animation is active
    appendToBuffer,             // Add text chunk (for streaming)
    setFullContent,             // Set complete text instantly
    reset,                      // Clear everything
    fullContent: bufferRef.current  // Full buffered content
  }
}
