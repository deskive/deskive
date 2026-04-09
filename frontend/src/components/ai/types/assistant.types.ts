// assistant.types.ts - Unified AI Assistant Types
import type { ViewType } from '@/components/layout/NavigationRail'
import type { Project } from '@/lib/api/projects-api'

/**
 * Props for the unified DeskiAssistantModal component
 */
export interface DeskiAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  currentView?: ViewType      // For context-aware suggestions
  projects?: Project[]        // For project operations context
  onProjectsChanged?: () => void | Promise<void>  // Callback for project refresh
}

/**
 * Action result from tool execution
 */
export interface ActionResult {
  tool: string
  success: boolean
  message: string
}

/**
 * Chat message in the assistant conversation
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean         // Shows loading indicator
  isStreaming?: boolean       // Currently receiving streamed content
  status?: string             // Status text: "Processing...", "Creating task...", etc.
  actions?: ActionResult[]    // Completed actions during this message
  success?: boolean           // Overall success state for assistant messages
}

/**
 * Streaming state for managing the typing effect
 */
export interface StreamingState {
  isActive: boolean
  messageId: string | null
  buffer: string              // Full content received so far
  displayedLength: number     // Characters displayed so far
}

/**
 * Command suggestion for quick actions
 */
export interface CommandSuggestion {
  textKey: string             // i18n key for the suggestion text
  defaultText: string         // Default text when translation is missing
  icon: string                // Emoji icon
  action: string              // Action identifier
}

/**
 * Module configuration for context-aware behavior
 */
export interface ModuleConfig {
  titleKey: string            // i18n key for title
  descriptionKey: string      // i18n key for description
  placeholderKey: string      // i18n key for input placeholder
  welcomeKey?: string         // i18n key for welcome message
  welcomeDefault?: string     // Default welcome message
}

/**
 * Callbacks for SSE stream handling
 */
export interface StreamCallbacks {
  onStatusUpdate: (messageId: string, status: string) => void
  onActionComplete: (messageId: string, action: ActionResult) => void
  onTextDelta: (messageId: string, delta: string) => void
  onText: (messageId: string, content: string) => void
  onComplete: (messageId: string, result: any) => void
  onError: (messageId: string, error: string) => void
}

/**
 * Options for typing effect hook
 */
export interface UseTypingEffectOptions {
  minDelay?: number           // Minimum delay between characters (ms)
  maxDelay?: number           // Maximum delay between characters (ms)
  chunkSize?: number          // Characters to reveal per tick
}

/**
 * Return type for typing effect hook
 */
export interface UseTypingEffectReturn {
  displayedContent: string    // Currently displayed content
  isTyping: boolean           // Whether typing animation is active
  appendToBuffer: (text: string) => void  // Add text to buffer (for text_delta)
  setFullContent: (text: string) => void  // Set complete content instantly (for text)
  reset: () => void           // Reset all state
  fullContent: string         // Full buffered content
}
