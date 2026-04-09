// @ts-nocheck - Test dependencies not installed
/**
 * MessageRenderer Component Tests
 *
 * Basic test suite for the MessageRenderer component.
 * Run with: npm test MessageRenderer.test.tsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageRenderer } from './MessageRenderer'

describe('MessageRenderer', () => {
  describe('Text Formatting', () => {
    it('renders plain text without formatting', () => {
      render(<MessageRenderer text="Hello World" />)
      expect(screen.getByText('Hello World')).toBeInTheDocument()
    })

    it('renders bold text', () => {
      render(<MessageRenderer text="**bold text**" />)
      const boldElement = screen.getByText('bold text')
      expect(boldElement).toHaveClass('font-bold')
    })

    it('renders italic text', () => {
      render(<MessageRenderer text="*italic text*" />)
      const italicElement = screen.getByText('italic text')
      expect(italicElement).toHaveClass('italic')
    })

    it('renders strikethrough text', () => {
      render(<MessageRenderer text="~~strikethrough~~" />)
      const strikeElement = screen.getByText('strikethrough')
      expect(strikeElement).toHaveClass('line-through')
    })

    it('renders inline code', () => {
      render(<MessageRenderer text="`inline code`" />)
      const codeElement = screen.getByText('inline code')
      expect(codeElement.tagName).toBe('CODE')
    })

    it('renders code blocks', () => {
      render(<MessageRenderer text="```const x = 42;```" />)
      const codeElement = screen.getByText('const x = 42;')
      expect(codeElement.closest('pre')).toBeInTheDocument()
    })

    it('renders mixed formatting', () => {
      render(<MessageRenderer text="**bold** and *italic*" />)
      expect(screen.getByText('bold')).toHaveClass('font-bold')
      expect(screen.getByText('italic')).toHaveClass('italic')
    })
  })

  describe('Structural Elements', () => {
    it('renders blockquotes', () => {
      render(<MessageRenderer text="> This is a quote" />)
      const quote = screen.getByText('This is a quote')
      expect(quote.closest('blockquote')).toBeInTheDocument()
    })

    it('renders unordered lists', () => {
      render(<MessageRenderer text="• List item" />)
      expect(screen.getByText('List item')).toBeInTheDocument()
      expect(screen.getByText('•')).toBeInTheDocument()
    })

    it('renders ordered lists', () => {
      render(<MessageRenderer text="1. First item" />)
      expect(screen.getByText('First item')).toBeInTheDocument()
      expect(screen.getByText('1.')).toBeInTheDocument()
    })
  })

  describe('Interactive Elements', () => {
    it('renders mentions', () => {
      render(<MessageRenderer text="@john" />)
      const mention = screen.getByText('@john')
      expect(mention).toBeInTheDocument()
      expect(mention).toHaveClass('text-blue-600')
    })

    it('calls onMentionClick when mention is clicked', () => {
      const handleMentionClick = vi.fn()
      render(
        <MessageRenderer
          text="@john"
          onMentionClick={handleMentionClick}
        />
      )
      const mention = screen.getByText('@john')
      fireEvent.click(mention)
      expect(handleMentionClick).toHaveBeenCalledWith('john')
    })

    it('renders channel references', () => {
      render(<MessageRenderer text="#general" />)
      const channel = screen.getByText('#general')
      expect(channel).toBeInTheDocument()
      expect(channel).toHaveClass('text-purple-600')
    })

    it('calls onChannelClick when channel is clicked', () => {
      const handleChannelClick = vi.fn()
      render(
        <MessageRenderer
          text="#general"
          onChannelClick={handleChannelClick}
        />
      )
      const channel = screen.getByText('#general')
      fireEvent.click(channel)
      expect(handleChannelClick).toHaveBeenCalledWith('general')
    })

    it('handles keyboard events on mentions', () => {
      const handleMentionClick = vi.fn()
      render(
        <MessageRenderer
          text="@john"
          onMentionClick={handleMentionClick}
        />
      )
      const mention = screen.getByText('@john')
      fireEvent.keyDown(mention, { key: 'Enter' })
      expect(handleMentionClick).toHaveBeenCalledWith('john')
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <MessageRenderer
          text="Hello"
          className="custom-class"
        />
      )
      const element = container.firstChild
      expect(element).toHaveClass('custom-class')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty text', () => {
      const { container } = render(<MessageRenderer text="" />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('handles text without any formatting', () => {
      render(<MessageRenderer text="Just plain text" />)
      expect(screen.getByText('Just plain text')).toBeInTheDocument()
    })

    it('handles incomplete formatting gracefully', () => {
      render(<MessageRenderer text="**incomplete bold" />)
      expect(screen.getByText('**incomplete bold')).toBeInTheDocument()
    })

    it('handles multiple mentions in one message', () => {
      render(<MessageRenderer text="@john and @jane" />)
      expect(screen.getByText('@john')).toBeInTheDocument()
      expect(screen.getByText('@jane')).toBeInTheDocument()
    })

    it('handles complex mixed content', () => {
      const text = "**Bold** @john check #general and `code`"
      render(<MessageRenderer text={text} />)
      expect(screen.getByText('Bold')).toHaveClass('font-bold')
      expect(screen.getByText('@john')).toBeInTheDocument()
      expect(screen.getByText('#general')).toBeInTheDocument()
      expect(screen.getByText('code')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('handles long messages efficiently', () => {
      const longText = 'Hello '.repeat(100) + '**bold** ' + 'world '.repeat(100)
      const { container } = render(<MessageRenderer text={longText} />)
      expect(container).toBeInTheDocument()
    })

    it('handles multiple patterns efficiently', () => {
      const complexText = `
        **bold** *italic* ~~strike~~ \`code\`
        > quote
        • list
        @user #channel
        \`\`\`code block\`\`\`
      `
      const { container } = render(<MessageRenderer text={complexText} />)
      expect(container).toBeInTheDocument()
    })
  })
})

/**
 * Integration Test Examples
 */
describe('MessageRenderer Integration', () => {
  it('works in a chat message context', () => {
    const ChatMessage = () => (
      <div className="message">
        <div className="user">John Doe</div>
        <MessageRenderer text="Hey @everyone, check #general!" />
      </div>
    )

    render(<ChatMessage />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('@everyone')).toBeInTheDocument()
    expect(screen.getByText('#general')).toBeInTheDocument()
  })

  it('works with message preview', () => {
    const MessagePreview = ({ text }: { text: string }) => (
      <div className="preview">
        <p>Preview:</p>
        <MessageRenderer text={text} />
      </div>
    )

    render(<MessagePreview text="**Bold** preview" />)
    expect(screen.getByText('Bold')).toHaveClass('font-bold')
  })
})
