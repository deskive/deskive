import React, { useMemo } from 'react'
import DOMPurify from 'dompurify'

/**
 * MessageRenderer Component
 *
 * A comprehensive text formatting component that renders rich text with support for:
 * - HTML content from rich text editors (Quill)
 * - URLs (https://example.com) - clickable and underlined links
 * - Bold (**text** or <strong>)
 * - Italic (*text* or <em>)
 * - Underline (<u>)
 * - Strikethrough (~~text~~ or <s>)
 * - Inline code (`code` or <code>)
 * - Code blocks (```code``` or <pre>)
 * - Blockquotes (> quote or <blockquote>)
 * - Ordered lists (1. item or <ol>)
 * - Unordered lists (• item or <ul>)
 * - @mentions (@username)
 * - #channel references (#channel-name)
 *
 * Supports both light and dark mode with Tailwind CSS classes.
 */

export interface MessageRendererProps {
  /** The text content to render with formatting (can be HTML or plain text) */
  text: string
  /** Additional CSS classes to apply to the container */
  className?: string
  /** Callback when a mention is clicked */
  onMentionClick?: (username: string) => void
  /** Callback when a channel reference is clicked */
  onChannelClick?: (channelName: string) => void
}

/**
 * Check if text contains HTML tags
 */
const isHtmlContent = (text: string): boolean => {
  return /<[a-z][\s\S]*>/i.test(text)
}

interface Replacement {
  start: number
  end: number
  element: React.ReactNode
}

/**
 * MessageRenderer - Renders formatted text with rich formatting support
 * Automatically detects HTML content and renders it safely, or parses markdown-style formatting
 */
export const MessageRenderer: React.FC<MessageRendererProps> = ({
  text,
  className = '',
  onMentionClick,
  onChannelClick
}) => {
  // Check if the content is HTML (from Quill editor)
  const isHtml = useMemo(() => isHtmlContent(text), [text])

  // Transform @[username] mentions to highlighted spans with inline styles
  const transformMentions = (html: string): string => {
    return html.replace(
      /@\[([^\]]+)\]/g,
      (_match, username) => {
        // Use inline styles for reliable styling across different contexts
        return `<span class="mention-highlight" data-mention="${username}" style="background-color: rgba(59, 130, 246, 0.15); color: rgb(37, 99, 235); padding: 1px 6px; border-radius: 4px; font-weight: 500;">@${username}</span>`
      }
    )
  }

  // Transform mention-blot spans to styled mention-highlight spans
  const transformMentionBlots = (html: string): string => {
    // Handle mention-blot class (from Quill editor) - may have nested content
    return html.replace(
      /<span[^>]*class="mention-blot"[^>]*data-mention="([^"]+)"[^>]*>[\s\S]*?<\/span>/gi,
      (_match, username) => {
        return `<span class="mention-highlight" data-mention="${username}" style="background-color: rgba(59, 130, 246, 0.15); color: rgb(37, 99, 235); padding: 1px 6px; border-radius: 4px; font-weight: 500;">@${username}</span>`
      }
    )
  }

  // Also transform already-highlighted mentions that may not have inline styles
  const ensureMentionStyles = (html: string): string => {
    // Add inline styles to any mention-highlight spans that don't have styles
    // Match any span with both mention-highlight class and data-mention attribute
    return html.replace(
      /<span([^>]*)>/gi,
      (match, attributes) => {
        // Check if this is a mention-highlight span (not mention-blot, which is handled separately)
        if (!attributes.includes('mention-highlight') || !attributes.includes('data-mention')) {
          return match
        }
        // Skip if already has inline style
        if (attributes.includes('style=')) {
          return match
        }
        // Extract the data-mention value
        const mentionMatch = attributes.match(/data-mention="([^"]+)"/)
        if (!mentionMatch) {
          return match
        }
        // Add inline styles
        return `<span class="mention-highlight" data-mention="${mentionMatch[1]}" style="background-color: rgba(59, 130, 246, 0.15); color: rgb(37, 99, 235); padding: 1px 6px; border-radius: 4px; font-weight: 500;">`
      }
    )
  }

  // Transform plain text URLs to clickable links (only URLs not already inside <a> tags or HTML attributes)
  const transformUrls = (html: string): string => {
    // URL regex pattern - only match URLs that are NOT inside quotes (attribute values)
    // Negative lookbehind for quotes ensures we don't match URLs in src="..." or href="..."
    const urlPattern = /(?<!=["'])(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*))/g

    // Split by existing anchor tags and img tags to avoid double-wrapping
    const parts = html.split(/(<a[^>]*>.*?<\/a>|<img[^>]*>)/gi)

    return parts.map(part => {
      // If this part is already an anchor tag or img tag, leave it alone
      if (part.startsWith('<a') || part.startsWith('<img')) {
        return part
      }
      // Otherwise, convert URLs to anchor tags
      return part.replace(urlPattern, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors break-all">${url}</a>`
      })
    }).join('')
  }

  // Sanitize and render HTML content
  const renderHtmlContent = () => {
    // First transform mention-blot spans (from Quill) to styled spans
    const htmlWithBlotsMentions = transformMentionBlots(text)

    // Then transform @[username] mentions to highlighted spans
    const htmlWithMentions = transformMentions(htmlWithBlotsMentions)

    // Ensure any existing mention-highlight spans have inline styles
    const htmlWithStyledMentions = ensureMentionStyles(htmlWithMentions)

    // Then transform plain text URLs to clickable links
    const htmlWithUrls = transformUrls(htmlWithStyledMentions)

    // Configure DOMPurify to allow safe HTML tags
    const cleanHtml = DOMPurify.sanitize(htmlWithUrls, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
        'a', 'code', 'pre', 'blockquote',
        'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'span', 'div',
        'img' // Allow inline images (for GIFs)
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'data-mention', 'src', 'alt', 'loading'],
      ADD_ATTR: ['target'], // Add target="_blank" to links
    })

    return (
      <div
        className={`message-html-content text-gray-900 dark:text-gray-100 leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    )
  }

  const parseFormatting = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    let keyCounter = 0

    // Define all formatting patterns with their rendering functions
    const patterns = [
      // Code blocks (must come before inline code)
      {
        regex: /```([^`]+)```/g,
        render: (_match: string, content: string) => (
          <pre
            key={keyCounter++}
            className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-sm font-mono overflow-x-auto my-1 whitespace-pre-wrap border border-gray-200 dark:border-gray-700"
          >
            <code className="text-gray-800 dark:text-gray-200">{content}</code>
          </pre>
        )
      },

      // URLs (must come before inline code to avoid conflicts)
      {
        regex: /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*))/g,
        render: (_match: string, url: string) => (
          <a
            key={keyCounter++}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {url}
          </a>
        )
      },

      // Inline code
      {
        regex: /`([^`]+)`/g,
        render: (_match: string, content: string) => (
          <code
            key={keyCounter++}
            className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
          >
            {content}
          </code>
        )
      },

      // Bold text
      {
        regex: /\*\*([^*]+)\*\*/g,
        render: (_match: string, content: string) => (
          <span key={keyCounter++} className="font-bold">
            {content}
          </span>
        )
      },

      // Italic text (must come after bold to avoid conflicts)
      {
        regex: /(?<!\*)\*([^*]+)\*(?!\*)/g,
        render: (_match: string, content: string) => (
          <span key={keyCounter++} className="italic">
            {content}
          </span>
        )
      },

      // Strikethrough
      {
        regex: /~~([^~]+)~~/g,
        render: (_match: string, content: string) => (
          <span key={keyCounter++} className="line-through text-gray-500 dark:text-gray-400">
            {content}
          </span>
        )
      },

      // Blockquotes
      {
        regex: /^>\s*(.+)$/gm,
        render: (_match: string, content: string) => (
          <blockquote
            key={keyCounter++}
            className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-1"
          >
            {content}
          </blockquote>
        )
      },

      // Ordered lists
      {
        regex: /^(\d+)\.\s*(.+)$/gm,
        render: (_match: string, number: string, content: string) => (
          <div
            key={keyCounter++}
            className="flex items-start gap-2 my-1"
          >
            <span className="font-medium text-gray-500 dark:text-gray-400 min-w-[24px]">
              {number}.
            </span>
            <span className="flex-1">{content}</span>
          </div>
        )
      },

      // Unordered lists
      {
        regex: /^•\s*(.+)$/gm,
        render: (_match: string, content: string) => (
          <div
            key={keyCounter++}
            className="flex items-start gap-2 my-1"
          >
            <span className="text-gray-500 dark:text-gray-400 min-w-[16px]">•</span>
            <span className="flex-1">{content}</span>
          </div>
        )
      },

      // @mentions with brackets: @[username] - handles usernames with spaces
      {
        regex: /@\[([^\]]+)\]/g,
        render: (_match: string, username: string) => (
          <span
            key={keyCounter++}
            className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            onClick={() => onMentionClick?.(username)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onMentionClick?.(username)
              }
            }}
          >
            @{username}
          </span>
        )
      },

      // #channel references
      {
        regex: /#([\w-]+)/g,
        render: (_match: string, channelName: string) => (
          <span
            key={keyCounter++}
            className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-medium cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            onClick={() => onChannelClick?.(channelName)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onChannelClick?.(channelName)
              }
            }}
          >
            #{channelName}
          </span>
        )
      }
    ]

    // Find all replacements
    const replacements: Replacement[] = []

    patterns.forEach(pattern => {
      let match
      pattern.regex.lastIndex = 0

      while ((match = pattern.regex.exec(text)) !== null) {
        const fullMatch = match[0]
        const startIndex = match.index
        const endIndex = startIndex + fullMatch.length

        // Check for overlapping replacements
        const overlaps = replacements.some(r =>
          (startIndex >= r.start && startIndex < r.end) ||
          (endIndex > r.start && endIndex <= r.end) ||
          (startIndex < r.start && endIndex > r.end)
        )

        if (!overlaps) {
          // @ts-ignore - Complex spread types for pattern matching
          const element = pattern.render(fullMatch, ...match.slice(1))
          replacements.push({ start: startIndex, end: endIndex, element })
        }
      }
    })

    // Sort replacements by start position
    replacements.sort((a, b) => a.start - b.start)

    // Build the final output
    let lastIndex = 0
    replacements.forEach(replacement => {
      // Add text before the replacement
      if (replacement.start > lastIndex) {
        const beforeText = text.slice(lastIndex, replacement.start)
        if (beforeText) {
          parts.push(beforeText)
        }
      }

      // Add the replacement element
      parts.push(replacement.element)
      lastIndex = replacement.end
    })

    // Add any remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex)
      if (remainingText) {
        parts.push(remainingText)
      }
    }

    return parts.length > 0 ? parts : [text]
  }

  // If HTML content, render with dangerouslySetInnerHTML (sanitized)
  if (isHtml) {
    return renderHtmlContent()
  }

  // Otherwise, parse markdown-style formatting
  const formattedContent = parseFormatting(text)

  return (
    <div className={`text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap ${className}`}>
      {formattedContent.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={index}>{part}</span>
        }
        return part
      })}
    </div>
  )
}

// Export as default for convenient importing
export default MessageRenderer

/**
 * Usage Examples:
 *
 * Basic usage:
 * ```tsx
 * <MessageRenderer text="Hello **world**!" />
 * ```
 *
 * With URLs:
 * ```tsx
 * <MessageRenderer text="Check out https://example.com for more info!" />
 * ```
 *
 * With mention and channel callbacks:
 * ```tsx
 * <MessageRenderer
 *   text="Hey @john, check #general channel"
 *   onMentionClick={(username) => console.log('Clicked:', username)}
 *   onChannelClick={(channel) => console.log('Clicked:', channel)}
 * />
 * ```
 *
 * With custom styling:
 * ```tsx
 * <MessageRenderer
 *   text="This is `code` and **bold**"
 *   className="text-sm p-2 bg-white rounded"
 * />
 * ```
 *
 * Mixed formatting with URLs:
 * ```tsx
 * <MessageRenderer
 *   text="Visit **our website** at https://example.com or check @support in #help"
 * />
 * ```
 */
