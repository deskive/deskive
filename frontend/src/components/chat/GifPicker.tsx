import { useState, useCallback } from 'react'
import { GiphyFetch } from '@giphy/js-fetch-api'
import { Grid } from '@giphy/react-components'
import type { IGif } from '@giphy/js-types'
import { Search, Loader2, ImageOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDebouncedCallback } from 'use-debounce'

// Initialize GIPHY client with API key
const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || ''
const gf = GIPHY_API_KEY ? new GiphyFetch(GIPHY_API_KEY) : null

export interface GifPickerProps {
  onSelect: (gif: IGif) => void
  width?: number
}

export function GifPicker({ onSelect, width = 300 }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Debounce search query
  const debouncedSetQuery = useDebouncedCallback((query: string) => {
    setDebouncedQuery(query)
    setIsLoading(false)
  }, 300)

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setIsLoading(true)
    debouncedSetQuery(value)
  }, [debouncedSetQuery])

  // Fetch function for the Grid component
  const fetchGifs = useCallback(async (offset: number) => {
    if (!gf) {
      // Return empty result - Grid will handle gracefully
      throw new Error('GIPHY not configured')
    }

    if (debouncedQuery.trim()) {
      return gf.search(debouncedQuery, { offset, limit: 10 })
    }
    return gf.trending({ offset, limit: 10 })
  }, [debouncedQuery])

  // Handle GIF click
  const handleGifClick = useCallback((gif: IGif, e: React.SyntheticEvent<HTMLElement>) => {
    e.preventDefault()
    onSelect(gif)
  }, [onSelect])

  // Show error state if no API key
  if (!gf) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <ImageOff className="h-8 w-8 mb-2" />
        <p className="text-sm font-medium">GIPHY not configured</p>
        <p className="text-xs mt-1">Add VITE_GIPHY_API_KEY to .env</p>
      </div>
    )
  }

  return (
    <div className="gif-picker flex flex-col" style={{ width }}>
      {/* Search Input */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search GIFs..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
            autoFocus
          />
          {isLoading && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* GIF Grid */}
      <ScrollArea className="h-[250px]">
        <div className="p-2">
          <Grid
            key={debouncedQuery}
            width={width - 16}
            columns={2}
            fetchGifs={fetchGifs}
            onGifClick={handleGifClick}
            noLink
            hideAttribution
          />
        </div>
      </ScrollArea>

      {/* GIPHY Attribution */}
      <div className="px-2 py-1.5 border-t border-border bg-muted/30">
        <img
          src="https://giphy.com/static/img/poweredby_giphy.png"
          alt="Powered by GIPHY"
          className="h-3 opacity-60"
        />
      </div>
    </div>
  )
}

export default GifPicker
