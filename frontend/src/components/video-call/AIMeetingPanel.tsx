import React, { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Brain,
  X,
  FileText,
  Mic,
  CheckSquare,
  Sparkles,
  Download,
  Copy,
  Save,
  RefreshCw,
  FileDown,
  StickyNote,
  Check,
  AlertCircle,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useMeetingSummary,
  useMeetingTranscript,
  useRegenerateMeetingSummary,
  useCreateTasksFromMeeting,
} from '@/lib/api/video-call-api'
import { useSummarize } from '@/lib/api/ai-api'
import { notesApi } from '@/lib/api/notes-api'
import type { AIMeetingPanelProps } from '@/types/video'
import { useParams } from 'react-router-dom'

// Types for live transcription
interface LiveTranscript {
  id: string;
  speakerName: string;
  text: string;
  timestamp: number;
}

interface ExtendedAIMeetingPanelProps extends AIMeetingPanelProps {
  liveTranscripts?: LiveTranscript[];
  isLiveTranscribing?: boolean;
}

export const AIMeetingPanel: React.FC<ExtendedAIMeetingPanelProps> = ({
  callId,
  participants,
  onClose,
  liveTranscripts = [],
  isLiveTranscribing = false,
}) => {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const [activeTab, setActiveTab] = useState('live')
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Local summary state (generated from live transcripts)
  const [localSummary, setLocalSummary] = useState<{
    summary: string;
    keyPoints: string[];
    actionItems: string[];
    generatedAt: number;
  } | null>(null)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  // Fetch backend data
  const { data: summaryResponse, isLoading: loadingSummary, refetch: refetchSummary } = useMeetingSummary(callId)
  const { data: transcriptResponse, isLoading: loadingTranscript } = useMeetingTranscript(callId)

  // Mutations
  const regenerateMutation = useRegenerateMeetingSummary()
  const createTasksMutation = useCreateTasksFromMeeting()
  const summarizeMutation = useSummarize()

  // Extract data
  const meetingSummary = summaryResponse?.data
  const meetingTranscript = transcriptResponse?.data

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current && liveTranscripts.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [liveTranscripts, autoScroll])

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // Generate summary from live transcripts
  const handleGenerateSummary = async () => {
    // If we have live transcripts, use AI to summarize them locally
    if (liveTranscripts.length > 0) {
      setIsGeneratingSummary(true)
      try {
        // Build the full transcript text
        const fullText = liveTranscripts
          .map(t => `${t.speakerName}: ${t.text}`)
          .join('\n')

        // Use AI to summarize - backend expects specific field names
        const result = await summarizeMutation.mutateAsync({
          content: fullText,
          summary_type: 'executive_summary',
          content_type: 'meeting_transcript',
          length: 'medium',
          include_action_items: true,
          include_statistics: false,
        })

        if (result.summary) {
          // Parse the AI summary - it comes with **Executive Summary** and **Action Items:** markers
          let rawSummary = result.summary
          const actionItems: string[] = []
          let summaryText = ''

          // Extract action items if present (format: **Action Items:** 1. xxx 2. xxx 3. xxx)
          const actionMatch = rawSummary.match(/\*\*Action Items:?\*\*\s*([\s\S]*?)$/i)
          if (actionMatch) {
            const actionSection = actionMatch[1]
            // Extract numbered items (1. xxx 2. xxx)
            const numberedItems = actionSection.match(/\d+\.\s*([^0-9]+?)(?=\d+\.|$)/g)
            if (numberedItems) {
              numberedItems.forEach(item => {
                const cleanItem = item.replace(/^\d+\.\s*/, '').trim()
                if (cleanItem.length > 5) {
                  actionItems.push(cleanItem)
                }
              })
            }
            // Remove action items section from summary
            rawSummary = rawSummary.replace(/\*\*Action Items:?\*\*[\s\S]*$/, '').trim()
          }

          // Clean up summary text - remove **Executive Summary** marker
          summaryText = rawSummary
            .replace(/\*\*Executive Summary\*\*\s*/gi, '')
            .replace(/\*\*/g, '')
            .trim()

          setLocalSummary({
            summary: summaryText,
            keyPoints: [], // Don't duplicate summary as key points
            actionItems,
            generatedAt: Date.now(),
          })

          console.log('[AIMeetingPanel] Summary generated:', { summaryText: summaryText.substring(0, 100), actionItems })
        }
      } catch (error) {
        console.error('[AIMeetingPanel] Failed to generate summary:', error)
        // Don't set fallback - just show error state
      } finally {
        setIsGeneratingSummary(false)
      }
    } else {
      // Try backend regeneration for saved meetings
      try {
        await regenerateMutation.mutateAsync(callId)
        console.log('[AIMeetingPanel] Backend summary generated')
        refetchSummary()
      } catch (error) {
        console.error('[AIMeetingPanel] Failed to generate backend summary:', error)
      }
    }
  }

  // Create tasks from action items
  const handleCreateTasks = async () => {
    try {
      const result = await createTasksMutation.mutateAsync({ callId })
      toast.success(`Created ${result.tasksCreated || 0} tasks from meeting!`)
    } catch (error) {
      toast.error('Failed to create tasks')
    }
  }

  // Export as text file
  const handleExportText = () => {
    const content = generateExportContent('text')
    downloadFile(content, `meeting-${callId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain')
    toast.success('Meeting exported as text file')
  }

  // Export as markdown
  const handleExportMarkdown = () => {
    const content = generateExportContent('markdown')
    downloadFile(content, `meeting-${callId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.md`, 'text/markdown')
    toast.success('Meeting exported as markdown file')
  }

  // Copy to clipboard
  const handleCopyToClipboard = () => {
    const content = generateExportContent('text')
    navigator.clipboard.writeText(content)
    toast.success('Copied to clipboard')
  }

  // Save to Notes (creates a note in the workspace)
  const handleSaveToNotes = async () => {
    if (!workspaceId) {
      toast.error('Workspace not found')
      return
    }

    try {
      const meetingDate = new Date().toLocaleDateString()
      const meetingTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const title = `Meeting Notes - ${meetingDate} ${meetingTime}`
      const markdownContent = generateExportContent('markdown')

      // Use the notes API to create a note
      await notesApi.createNote(workspaceId, {
        title,
        content: markdownContent,
      })

      toast.success('Meeting saved to Notes!', {
        description: title,
      })
    } catch (error) {
      console.error('Failed to save to notes:', error)
      toast.error('Failed to save to Notes')
    }
  }

  // Generate export content
  const generateExportContent = (format: 'text' | 'markdown') => {
    const date = new Date()
    const dateStr = date.toLocaleDateString()
    const timeStr = date.toLocaleTimeString()

    // Use backend summary or local summary
    const summaryText = meetingSummary?.summary || localSummary?.summary
    const keyPoints = meetingSummary?.key_points || localSummary?.keyPoints || []
    const actionItems = meetingSummary?.action_items || localSummary?.actionItems?.map(item => ({ task: item })) || []
    const decisions = meetingSummary?.decisions || []

    let content = ''

    if (format === 'markdown') {
      content += `# Meeting Notes\n`
      content += `**Date:** ${dateStr} at ${timeStr}\n`
      content += `**Call ID:** ${callId}\n\n`

      if (summaryText) {
        content += `## Summary\n${summaryText}\n\n`

        if (keyPoints.length > 0) {
          content += `## Key Points\n`
          keyPoints.forEach(point => {
            content += `- ${point}\n`
          })
          content += '\n'
        }

        if (decisions.length > 0) {
          content += `## Decisions Made\n`
          decisions.forEach(decision => {
            content += `- ${decision}\n`
          })
          content += '\n'
        }

        if (actionItems.length > 0) {
          content += `## Action Items\n`
          actionItems.forEach((item: any) => {
            const task = typeof item === 'string' ? item : item.task
            content += `- [ ] ${task}`
            if (item.assignee) content += ` (Assigned to: ${item.assignee})`
            if (item.deadline) content += ` - Due: ${item.deadline}`
            content += '\n'
          })
          content += '\n'
        }
      }

      // Add transcripts
      const transcripts = liveTranscripts.length > 0 ? liveTranscripts : meetingTranscript?.segments || []
      if (transcripts.length > 0) {
        content += `## Transcript\n`
        transcripts.forEach((t: any) => {
          const time = formatTime(t.timestamp)
          const speaker = t.speakerName || 'Speaker'
          content += `**${time} - ${speaker}:** ${t.text}\n\n`
        })
      }
    } else {
      // Plain text format
      content += `MEETING NOTES\n`
      content += `${'='.repeat(50)}\n`
      content += `Date: ${dateStr} at ${timeStr}\n`
      content += `Call ID: ${callId}\n\n`

      if (summaryText) {
        content += `SUMMARY\n${'-'.repeat(30)}\n${summaryText}\n\n`

        if (keyPoints.length > 0) {
          content += `KEY POINTS\n${'-'.repeat(30)}\n`
          keyPoints.forEach(point => {
            content += `• ${point}\n`
          })
          content += '\n'
        }

        if (actionItems.length > 0) {
          content += `ACTION ITEMS\n${'-'.repeat(30)}\n`
          actionItems.forEach((item: any) => {
            const task = typeof item === 'string' ? item : item.task
            content += `□ ${task}`
            if (item.assignee) content += ` (${item.assignee})`
            content += '\n'
          })
          content += '\n'
        }
      }

      const transcripts = liveTranscripts.length > 0 ? liveTranscripts : meetingTranscript?.segments || []
      if (transcripts.length > 0) {
        content += `TRANSCRIPT\n${'-'.repeat(30)}\n`
        transcripts.forEach((t: any) => {
          const time = formatTime(t.timestamp)
          const speaker = t.speakerName || 'Speaker'
          content += `[${time}] ${speaker}: ${t.text}\n`
        })
      }
    }

    return content
  }

  // Download file helper
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Sentiment icon
  const SentimentIcon = ({ sentiment }: { sentiment?: string }) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  // Check if we have any content
  const hasLiveContent = liveTranscripts.length > 0
  const hasSavedContent = !!meetingSummary || !!meetingTranscript
  const hasLocalSummary = !!localSummary
  const hasAnyContent = hasLiveContent || hasSavedContent || hasLocalSummary
  const isActive = isLiveTranscribing || hasAnyContent

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          <h3 className="text-sm font-medium">AI Meeting Assistant</h3>
          {isLiveTranscribing && (
            <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30 animate-pulse">
              <Mic className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-4 gap-2 mx-4 mt-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={() => setActiveTab('live')}
            className={cn(
              "text-xs flex items-center justify-center gap-1 h-9",
              activeTab === 'live'
                ? "bg-green-600 hover:bg-green-500 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            )}
          >
            <Mic className="h-3 w-3" />
            Live
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab('summary')}
            className={cn(
              "text-xs flex items-center justify-center gap-1 h-9",
              activeTab === 'summary'
                ? "bg-purple-600 hover:bg-purple-500 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            )}
          >
            <FileText className="h-3 w-3" />
            Summary
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab('actions')}
            className={cn(
              "text-xs flex items-center justify-center gap-1 h-9",
              activeTab === 'actions'
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            )}
          >
            <CheckSquare className="h-3 w-3" />
            Actions
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab('insights')}
            className={cn(
              "text-xs flex items-center justify-center gap-1 h-9",
              activeTab === 'insights'
                ? "bg-orange-600 hover:bg-orange-500 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            )}
          >
            <Sparkles className="h-3 w-3" />
            Insights
          </Button>
        </div>
        <TabsList className="hidden">
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Live Tab - Real-time transcription */}
        <TabsContent value="live" className="flex-1 mt-0 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 flex-shrink-0">
            <span className="text-xs text-gray-400">
              {liveTranscripts.length} segments
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Auto-scroll</span>
              <Switch
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
                className="scale-75"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden" ref={scrollRef}>
            {liveTranscripts.length > 0 ? (
              <div className="space-y-2 px-3 py-2 max-w-full">
                {liveTranscripts.map((transcript, index) => (
                  <div key={transcript.id || index} className="group max-w-full">
                    <div className="flex items-start gap-3 max-w-full">
                      <div className="text-xs text-gray-500 mt-1 min-w-[60px] flex-shrink-0">
                        {formatTime(transcript.timestamp)}
                      </div>
                      <div className="flex-1 min-w-0 max-w-full overflow-hidden pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-blue-400 truncate">
                            {transcript.speakerName || 'Speaker'}
                          </span>
                        </div>
                        <p
                          className="text-sm text-gray-200 leading-relaxed"
                          style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {transcript.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-4">
                {isLiveTranscribing ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-3">
                      <Mic className="h-10 w-10 text-green-500" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <p className="text-sm text-green-400 mb-1">Transcription Active</p>
                    <p className="text-xs text-gray-500">
                      Speak to see real-time transcription here
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs text-green-400">Listening...</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <Mic className="h-10 w-10 text-gray-600 mb-2" />
                    <p className="text-sm text-gray-400 mb-1">Transcription not active</p>
                    <p className="text-xs text-gray-500">
                      Transcription will start automatically
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="flex-1 mt-0 flex flex-col min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 overflow-x-hidden">
            <div className="px-4 max-w-full space-y-4 py-4">
              {(loadingSummary || isGeneratingSummary) ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 text-purple-500 animate-spin mb-2" />
                  <p className="text-xs text-gray-400">
                    {isGeneratingSummary ? 'Generating AI summary...' : 'Loading...'}
                  </p>
                </div>
              ) : (meetingSummary || localSummary) ? (
                <>
                  {/* Summary */}
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Meeting Summary
                      {localSummary && !meetingSummary && (
                        <Badge variant="outline" className="text-xs bg-purple-500/20 border-purple-500/30 text-purple-300">
                          AI Generated
                        </Badge>
                      )}
                    </h4>
                    <p className="text-sm text-gray-200 leading-relaxed">
                      {meetingSummary?.summary || localSummary?.summary}
                    </p>
                  </div>

                  {/* Key Points - only show if backend has them */}
                  {(meetingSummary?.key_points?.length ?? 0) > 0 && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-300 mb-2">Key Points</h4>
                      <ul className="space-y-1">
                        {meetingSummary!.key_points!.map((point, i) => (
                          <li key={i} className="text-sm text-gray-200 flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Items from local summary */}
                  {(localSummary?.actionItems?.length ?? 0) > 0 && !meetingSummary && (
                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <h4 className="text-sm font-medium text-orange-300 mb-2">Action Items</h4>
                      <ul className="space-y-1">
                        {localSummary!.actionItems.map((item, i) => (
                          <li key={i} className="text-sm text-gray-200 flex items-start gap-2">
                            <CheckSquare className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Decisions */}
                  {(meetingSummary?.decisions?.length ?? 0) > 0 && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <h4 className="text-sm font-medium text-green-300 mb-2">Decisions Made</h4>
                      <ul className="space-y-1">
                        {meetingSummary!.decisions!.map((decision, i) => (
                          <li key={i} className="text-sm text-gray-200 flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            {decision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Topics Discussed */}
                  {(meetingSummary?.topics_discussed?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {meetingSummary!.topics_discussed!.map((topic, i) => (
                        <Badge key={i} variant="outline" className="text-xs text-gray-300 border-gray-600">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Summary Export Buttons */}
                  <Separator className="my-3 bg-gray-700" />
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      size="sm"
                      onClick={handleCopyToClipboard}
                      className="text-xs flex flex-col items-center gap-1 h-auto py-2 bg-gray-700 hover:bg-gray-600 text-white"
                      title="Copy summary"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="text-[10px]">Copy</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleExportText}
                      className="text-xs flex flex-col items-center gap-1 h-auto py-2 bg-blue-600 hover:bg-blue-500 text-white"
                      title="Export as text"
                    >
                      <FileDown className="h-4 w-4" />
                      <span className="text-[10px]">Text</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleExportMarkdown}
                      className="text-xs flex flex-col items-center gap-1 h-auto py-2 bg-purple-600 hover:bg-purple-500 text-white"
                      title="Export as markdown"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="text-[10px]">MD</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveToNotes}
                      className="text-xs flex flex-col items-center gap-1 h-auto py-2 bg-green-600 hover:bg-green-500 text-white"
                      title="Save to Notes"
                    >
                      <StickyNote className="h-4 w-4" />
                      <span className="text-[10px]">Notes</span>
                    </Button>
                  </div>

                  {/* Regenerate Button */}
                  {hasLiveContent && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary || regenerateMutation.isPending}
                      className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate Summary
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <FileText className="h-12 w-12 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-400 mb-2">No summary available yet</p>
                  <p className="text-xs text-gray-500 mb-4">
                    {hasLiveContent
                      ? 'Generate a summary from the live transcription'
                      : 'Start transcription to generate a summary'}
                  </p>
                  {hasLiveContent && (
                    <Button
                      size="sm"
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary || regenerateMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {(isGeneratingSummary || regenerateMutation.isPending) ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Generate Summary
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="flex-1 mt-0 flex flex-col min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 overflow-x-hidden">
            <div className="space-y-3 py-4 px-4 max-w-full">
              {/* Show backend action items OR local action items */}
              {((meetingSummary?.action_items?.length ?? 0) > 0 || (localSummary?.actionItems?.length ?? 0) > 0) ? (
                <>
                  {/* Backend action items */}
                  {meetingSummary?.action_items?.map((item, index) => (
                    <div key={`backend-${index}`} className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                          item.status === 'completed'
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-500"
                        )}>
                          {item.status === 'completed' && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm",
                            item.status === 'completed' ? "line-through text-gray-500" : "text-gray-200"
                          )}>
                            {item.task}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            {item.assignee && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {item.assignee}
                              </span>
                            )}
                            {item.deadline && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.deadline}
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                item.priority === 'high' && "border-red-500/30 text-red-300",
                                item.priority === 'medium' && "border-yellow-500/30 text-yellow-300",
                                item.priority === 'low' && "border-green-500/30 text-green-300"
                              )}
                            >
                              {item.priority || 'medium'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Local action items (from AI summary) */}
                  {!meetingSummary && localSummary?.actionItems?.map((item, index) => (
                    <div key={`local-${index}`} className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-5 h-5 rounded border-2 border-blue-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-blue-400 font-medium">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-200">{item}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Create Tasks Button - only for backend items */}
                  {meetingSummary?.action_items && meetingSummary.action_items.length > 0 && (
                    <div className="pt-4">
                      <Button
                        size="sm"
                        onClick={handleCreateTasks}
                        disabled={createTasksMutation.isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {createTasksMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Creating Tasks...
                          </>
                        ) : (
                          <>
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Create Tasks in Project
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <CheckSquare className="h-12 w-12 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-400 mb-1">No action items found</p>
                  <p className="text-xs text-gray-500">
                    {(meetingSummary || localSummary)
                      ? 'No action items were identified in this meeting'
                      : 'Generate a summary to extract action items'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="flex-1 mt-0 flex flex-col min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 overflow-x-hidden">
            <div className="space-y-4 py-4 px-4 max-w-full">
              {hasAnyContent ? (
                <>
                  {/* Meeting Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">Segments</div>
                      <div className="text-lg font-medium text-white">
                        {liveTranscripts.length || meetingTranscript?.segments?.length || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">Word Count</div>
                      <div className="text-lg font-medium text-white">
                        {meetingTranscript?.word_count || liveTranscripts.reduce((acc, t) => acc + t.text.split(' ').length, 0)} words
                      </div>
                    </div>
                  </div>

                  {/* Participants from live transcripts */}
                  {liveTranscripts.length > 0 && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Participants
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[...new Set(liveTranscripts.map(t => t.speakerName))].map((speaker, i) => (
                          <Badge key={i} variant="outline" className="text-xs text-gray-300 border-purple-500/30">
                            {speaker}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Backend Participants */}
                  {!liveTranscripts.length && (meetingSummary?.participants?.length ?? 0) > 0 && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Participants ({meetingSummary!.participants!.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {meetingSummary!.participants!.map((p, i) => (
                          <Badge key={i} variant="outline" className="text-xs text-gray-300">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary Status */}
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Summary Status</h4>
                    <div className="flex items-center gap-2">
                      {(meetingSummary || localSummary) ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-sm text-green-400">
                            {localSummary && !meetingSummary ? 'AI Summary Generated' : 'Summary Available'}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                          <span className="text-sm text-yellow-400">No summary yet</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Items Count - Backend or Local */}
                  {((meetingSummary?.action_items?.length ?? 0) > 0 || (localSummary?.actionItems?.length ?? 0) > 0) && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-300">Action Items</span>
                        <Badge className="bg-blue-600">
                          {meetingSummary?.action_items?.length ?? localSummary?.actionItems?.length ?? 0}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        {(meetingSummary?.action_items || localSummary?.actionItems?.map(a => ({ task: a })) || []).slice(0, 3).map((item: any, i) => (
                          <p key={i} className="text-xs text-gray-300 truncate">
                            • {typeof item === 'string' ? item : item.task}
                          </p>
                        ))}
                        {((meetingSummary?.action_items?.length ?? localSummary?.actionItems?.length ?? 0) > 3) && (
                          <p className="text-xs text-gray-500">
                            +{(meetingSummary?.action_items?.length ?? localSummary?.actionItems?.length ?? 0) - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Meeting Duration indicator */}
                  {liveTranscripts.length > 0 && (
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">Recording Since</div>
                      <div className="text-sm text-white">
                        {new Date(liveTranscripts[0]?.timestamp || Date.now()).toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Sparkles className="h-12 w-12 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-400 mb-1">No insights available yet</p>
                  <p className="text-xs text-gray-500 mb-4">
                    Start speaking to generate meeting insights
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-700 bg-gray-900/50 space-y-3 flex-shrink-0">
        {/* Status indicator */}
        {isLiveTranscribing && (
          <div className="flex items-center justify-center gap-2 py-2 px-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">Live transcription active - speak to capture</span>
          </div>
        )}

        {/* Export Options */}
        <div className="grid grid-cols-4 gap-2">
          <Button
            size="sm"
            onClick={handleCopyToClipboard}
            disabled={!hasAnyContent}
            className={cn(
              "text-xs flex flex-col items-center gap-1 h-auto py-2",
              hasAnyContent
                ? "bg-gray-700 hover:bg-gray-600 text-white border-gray-500"
                : "bg-gray-800/50 text-gray-500 border-gray-700"
            )}
            title="Copy to clipboard"
          >
            <Copy className="h-4 w-4" />
            <span className="text-[10px]">Copy</span>
          </Button>
          <Button
            size="sm"
            onClick={handleExportText}
            disabled={!hasAnyContent}
            className={cn(
              "text-xs flex flex-col items-center gap-1 h-auto py-2",
              hasAnyContent
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-gray-800/50 text-gray-500 border-gray-700"
            )}
            title="Export as text file"
          >
            <FileDown className="h-4 w-4" />
            <span className="text-[10px]">Text</span>
          </Button>
          <Button
            size="sm"
            onClick={handleExportMarkdown}
            disabled={!hasAnyContent}
            className={cn(
              "text-xs flex flex-col items-center gap-1 h-auto py-2",
              hasAnyContent
                ? "bg-purple-600 hover:bg-purple-500 text-white"
                : "bg-gray-800/50 text-gray-500 border-gray-700"
            )}
            title="Export as markdown file"
          >
            <FileText className="h-4 w-4" />
            <span className="text-[10px]">MD</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSaveToNotes}
            disabled={!hasAnyContent}
            className={cn(
              "text-xs flex flex-col items-center gap-1 h-auto py-2",
              hasAnyContent
                ? "bg-green-600 hover:bg-green-500 text-white"
                : "bg-gray-800/50 text-gray-500 border-gray-700"
            )}
            title="Save to Notes"
          >
            <StickyNote className="h-4 w-4" />
            <span className="text-[10px]">Notes</span>
          </Button>
        </div>

        {/* Generate Summary Button */}
        {hasLiveContent && !meetingSummary && !localSummary && (
          <Button
            size="sm"
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary || regenerateMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {(isGeneratingSummary || regenerateMutation.isPending) ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating Summary...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate AI Summary
              </>
            )}
          </Button>
        )}

        {/* Help text when no content yet */}
        {!hasAnyContent && !isLiveTranscribing && (
          <p className="text-xs text-center text-gray-500">
            Export buttons will be enabled after transcription starts
          </p>
        )}
      </div>
    </div>
  )
}
