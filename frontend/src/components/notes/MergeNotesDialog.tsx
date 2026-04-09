import { useState } from 'react'
import type { Note } from '../../types/notes'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import {
  FileText,
  Calendar,
  Layers,
  GitMerge,
  Settings
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface MergeNotesDialogProps {
  isOpen: boolean
  onClose: () => void
  notes: Note[]
  onMerge: (mergeTitle: string, options: {
    includeHeaders: boolean
    includeDividers: boolean
    sortByDate: boolean
  }) => void
}

// Helper function to safely format date
const formatDate = (dateValue: string | Date): string => {
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }
    return date.toLocaleDateString()
  } catch (error) {
    console.warn('Error formatting date:', error)
    return 'Invalid date'
  }
}

export function MergeNotesDialog({ isOpen, onClose, notes, onMerge }: MergeNotesDialogProps) {
  const [mergeTitle, setMergeTitle] = useState('')
  const [includeHeaders, setIncludeHeaders] = useState(true)
  const [includeDividers, setIncludeDividers] = useState(true)
  const [sortByDate, setSortByDate] = useState(false)

  const handleMerge = () => {
    onMerge(mergeTitle, {
      includeHeaders,
      includeDividers,
      sortByDate
    })
    onClose()
  }

  const totalBlocks = notes.reduce((sum, note) => sum + (note.content?.length || 0), 0)
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags || [])))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Merge Notes
          </DialogTitle>
          <DialogDescription>
            Combine {notes.length} selected notes into a single note. Choose how you want to merge them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notes Preview */}
          <div>
            <Label className="text-base font-medium mb-3 block">Notes to merge</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {notes.map((note, index) => {
                const noteTitle = note.title?.map(rt => rt.text).join('') || 'Untitled'
                const contentLength = note.content?.length || 0
                const createdDate = formatDate(note.createdAt)
                
                return (
                  <div key={note.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{note.icon?.value || '📄'}</span>
                        <span className="font-medium truncate">{noteTitle}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {contentLength} blocks • {createdDate}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Merge Options */}
          <div>
            <Label className="text-base font-medium mb-3 block">Merge options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="headers" 
                  checked={includeHeaders}
                  onCheckedChange={(checked) => setIncludeHeaders(!!checked)}
                />
                <Label htmlFor="headers" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Include note headers and metadata
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="dividers" 
                  checked={includeDividers}
                  onCheckedChange={(checked) => setIncludeDividers(!!checked)}
                />
                <Label htmlFor="dividers" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Add dividers between notes
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sort" 
                  checked={sortByDate}
                  onCheckedChange={(checked) => setSortByDate(!!checked)}
                />
                <Label htmlFor="sort" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Sort by creation date (oldest first)
                </Label>
              </div>
            </div>
          </div>

          {/* Custom Title */}
          <div>
            <Label htmlFor="title" className="text-base font-medium">Custom title (optional)</Label>
            <Input
              id="title"
              value={mergeTitle}
              onChange={(e) => setMergeTitle(e.target.value)}
              placeholder={notes.length > 3 ? `Merged Note (${notes.length} notes)` : notes.map(n => n.title?.map(rt => rt.text).join('') || 'Untitled').join(' + ')}
              className="mt-2"
            />
          </div>

          {/* Summary */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Merge Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total content blocks:</span>
                  <div className="font-medium">{totalBlocks}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Unique tags:</span>
                  <div className="font-medium">{allTags.length}</div>
                </div>
              </div>
              {allTags.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground">Tags to include:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {allTags.slice(0, 6).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {allTags.length > 6 && (
                      <Badge variant="secondary" className="text-xs">
                        +{allTags.length - 6} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleMerge} className="flex items-center gap-2">
            <GitMerge className="h-4 w-4" />
            Merge Notes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}