/**
 * EmojiPicker Component - Simple emoji selection interface
 * Clean React+Vite+TypeScript implementation
 */

import React from 'react'

interface EmojiPickerProps {
  onSelect?: (emoji: string) => void
  className?: string
}

// Simple emoji picker component - can be enhanced later
export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, className }) => {
  const commonEmojis = ['👍', '👏', '❤️', '😂', '😮', '😢', '🔥', '🎉']

  return (
    <div className={className}>
      <div className="grid grid-cols-4 gap-2 p-2">
        {commonEmojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect?.(emoji)}
            className="text-2xl p-2 hover:bg-gray-100 rounded cursor-pointer text-center"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}