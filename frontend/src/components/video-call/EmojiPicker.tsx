import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
import { Button } from '../ui/button'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  children: ReactNode
}

// Common emojis for quick access
const QUICK_EMOJIS = ['👍', '👏', '❤️', '😂', '😮', '🎉', '🔥', '✨', '💯', '👌', '🎯', '💪']

export const EmojiPicker = ({ onSelect, children }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false)

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="center" side="top">
        <div className="flex gap-2 flex-wrap max-w-xs">
          {QUICK_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              onClick={() => handleEmojiSelect(emoji)}
              className="h-10 w-10 p-0 text-2xl hover:bg-gray-100"
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
