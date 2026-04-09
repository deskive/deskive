/**
 * MeetingSummaryView Component
 * Displays AI-generated meeting summary, transcript, and action items after a call ends
 */

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Brain,
  FileText,
  CheckSquare,
  Sparkles,
  Download,
  Copy,
  RefreshCw,
  ListTodo,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Clock,
  Users,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useMeetingSummary,
  useMeetingTranscript,
  useRegenerateMeetingSummary,
  useCreateTasksFromMeeting,
  type MeetingSummary,
  type MeetingTranscript,
  type MeetingActionItem,
} from '@/lib/api/video-call-api'

interface MeetingSummaryViewProps {
  callId: string
  callTitle?: string
  className?: string
}

export const MeetingSummaryView: React.FC<MeetingSummaryViewProps> = ({
  callId,
  callTitle,
  className,
}) => {
  const [activeTab, setActiveTab] = useState('summary')

  // Fetch data
  const { data: summaryResponse, isLoading: loadingSummary } = useMeetingSummary(callId)
  const { data: transcriptResponse, isLoading: loadingTranscript } = useMeetingTranscript(callId)

  // Mutations
  const regenerateMutation = useRegenerateMeetingSummary()
  const createTasksMutation = useCreateTasksFromMeeting()

  const summary = summaryResponse?.data
  const transcript = transcriptResponse?.data

  // Handle regenerate summary
  const handleRegenerate = async () => {
    try {
      await regenerateMutation.mutateAsync(callId)
      toast.success('Meeting summary regenerated successfully')
    } catch (error) {
      toast.error('Failed to regenerate summary')
    }
  }

  // Handle create tasks from action items
  const handleCreateTasks = async () => {
    try {
      const result = await createTasksMutation.mutateAsync({ callId })
      toast.success(result.message)
    } catch (error) {
      toast.error('Failed to create tasks')
    }
  }

  // Export to clipboard
  const exportToClipboard = () => {
    let content = `Meeting Summary - ${callTitle || 'Meeting'}\n`
    content += `Generated on: ${new Date().toLocaleDateString()}\n\n`

    if (summary) {
      content += `SUMMARY:\n${summary.summary}\n\n`

      if (summary.key_points.length > 0) {
        content += `KEY POINTS:\n`
        summary.key_points.forEach((point, i) => {
          content += `${i + 1}. ${point}\n`
        })
        content += '\n'
      }

      if (summary.decisions.length > 0) {
        content += `DECISIONS:\n`
        summary.decisions.forEach((decision, i) => {
          content += `${i + 1}. ${decision}\n`
        })
        content += '\n'
      }

      if (summary.action_items.length > 0) {
        content += `ACTION ITEMS:\n`
        summary.action_items.forEach((item, i) => {
          content += `${i + 1}. ${item.task}`
          if (item.assignee) content += ` (Assigned: ${item.assignee})`
          if (item.priority) content += ` [${item.priority}]`
          content += '\n'
        })
        content += '\n'
      }
    }

    if (transcript?.full_text) {
      content += `TRANSCRIPT:\n${transcript.full_text}\n`
    }

    navigator.clipboard.writeText(content)
    toast.success('Meeting summary copied to clipboard')
  }

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // Sentiment icon
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 text-green-400" />
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-red-400" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  // Loading state
  if (loadingSummary && loadingTranscript) {
    return (
      <Card className={cn('bg-gray-900 border-gray-800', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-gray-800" />
          <Skeleton className="h-4 w-32 bg-gray-800" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full bg-gray-800" />
          <Skeleton className="h-16 w-full bg-gray-800" />
          <Skeleton className="h-16 w-full bg-gray-800" />
        </CardContent>
      </Card>
    )
  }

  // No data state
  if (!summary && !transcript) {
    return (
      <Card className={cn('bg-gray-900 border-gray-800', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Brain className="h-12 w-12 text-gray-600 mb-4" />
          <p className="text-gray-400 mb-2">No meeting insights available yet</p>
          <p className="text-sm text-gray-500">
            AI summary will be generated after the call ends with transcription enabled
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('bg-gray-900 border-gray-800', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Brain className="h-5 w-5 text-purple-500" />
              Meeting Insights
            </CardTitle>
            <CardDescription className="text-gray-400">
              {callTitle || 'AI-generated summary and action items'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToClipboard}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Copy className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending || !transcript}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              {regenerateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="summary" className="data-[state=active]:bg-gray-700">
              <Sparkles className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="actions" className="data-[state=active]:bg-gray-700">
              <CheckSquare className="h-4 w-4 mr-2" />
              Actions
            </TabsTrigger>
            <TabsTrigger value="transcript" className="data-[state=active]:bg-gray-700">
              <MessageSquare className="h-4 w-4 mr-2" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-gray-700">
              <Brain className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {summary ? (
                  <>
                    {/* Executive Summary */}
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-400" />
                        Executive Summary
                      </h4>
                      <p className="text-gray-200">{summary.summary}</p>
                    </div>

                    {/* Key Points */}
                    {summary.key_points.length > 0 && (
                      <div className="p-4 bg-gray-800/50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                          <ListTodo className="h-4 w-4 text-green-400" />
                          Key Points ({summary.key_points.length})
                        </h4>
                        <ul className="space-y-2">
                          {summary.key_points.map((point, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-green-400 mt-1">•</span>
                              <span className="text-gray-200">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Decisions */}
                    {summary.decisions.length > 0 && (
                      <div className="p-4 bg-gray-800/50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-purple-400" />
                          Decisions Made ({summary.decisions.length})
                        </h4>
                        <ul className="space-y-2">
                          {summary.decisions.map((decision, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-purple-400 mt-1">✓</span>
                              <span className="text-gray-200">{decision}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Topics */}
                    {summary.topics_discussed.length > 0 && (
                      <div className="p-4 bg-gray-800/50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">
                          Topics Discussed
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {summary.topics_discussed.map((topic, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-gray-700 border-gray-600 text-gray-200"
                            >
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Sparkles className="h-12 w-12 text-gray-600 mb-4" />
                    <p className="text-gray-400">No summary available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {summary?.action_items && summary.action_items.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-400">
                        {summary.action_items.length} action items extracted
                      </span>
                      <Button
                        size="sm"
                        onClick={handleCreateTasks}
                        disabled={createTasksMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {createTasksMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ListTodo className="h-4 w-4 mr-2" />
                        )}
                        Create Tasks
                      </Button>
                    </div>

                    {summary.action_items.map((item) => (
                      <ActionItemCard key={item.id} item={item} />
                    ))}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <CheckSquare className="h-12 w-12 text-gray-600 mb-4" />
                    <p className="text-gray-400">No action items found</p>
                    <p className="text-sm text-gray-500">
                      Action items are extracted from explicit tasks mentioned in the meeting
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Transcript Tab */}
          <TabsContent value="transcript" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {transcript?.segments && transcript.segments.length > 0 ? (
                  transcript.segments.map((segment, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-xs text-gray-500 min-w-[60px] mt-1">
                        {formatTime(segment.timestamp)}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-blue-400">
                          {segment.speakerName}:
                        </span>
                        <p className="text-gray-200">{segment.text}</p>
                      </div>
                    </div>
                  ))
                ) : transcript?.full_text ? (
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-200 whitespace-pre-wrap">{transcript.full_text}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-600 mb-4" />
                    <p className="text-gray-400">No transcript available</p>
                    <p className="text-sm text-gray-500">
                      Enable live captions during calls to generate transcripts
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {summary ? (
                  <>
                    {/* Meeting Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-800/50 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-2">
                          {getSentimentIcon(summary.sentiment)}
                        </div>
                        <p className="text-xs text-gray-400">Sentiment</p>
                        <p className="text-sm font-medium text-gray-200 capitalize">
                          {summary.sentiment}
                        </p>
                      </div>

                      <div className="p-4 bg-gray-800/50 rounded-lg text-center">
                        <Users className="h-4 w-4 text-blue-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Participants</p>
                        <p className="text-sm font-medium text-gray-200">
                          {summary.participants.length}
                        </p>
                      </div>

                      <div className="p-4 bg-gray-800/50 rounded-lg text-center">
                        <CheckSquare className="h-4 w-4 text-green-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Action Items</p>
                        <p className="text-sm font-medium text-gray-200">
                          {summary.action_items.length}
                        </p>
                      </div>
                    </div>

                    {/* Transcript Stats */}
                    {transcript && (
                      <div className="p-4 bg-gray-800/50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">
                          Transcript Statistics
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-400">Duration</p>
                            <p className="text-sm text-gray-200">
                              {Math.floor(transcript.duration_seconds / 60)}m{' '}
                              {transcript.duration_seconds % 60}s
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Word Count</p>
                            <p className="text-sm text-gray-200">{transcript.word_count} words</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Language</p>
                            <p className="text-sm text-gray-200 uppercase">{transcript.language}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Segments</p>
                            <p className="text-sm text-gray-200">
                              {transcript.segments?.length || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Participants List */}
                    {summary.participants.length > 0 && (
                      <div className="p-4 bg-gray-800/50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Participants</h4>
                        <div className="flex flex-wrap gap-2">
                          {summary.participants.map((participant, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-blue-500/10 border-blue-500/30 text-blue-300"
                            >
                              {participant}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Brain className="h-12 w-12 text-gray-600 mb-4" />
                    <p className="text-gray-400">No insights available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Action Item Card Component
const ActionItemCard: React.FC<{ item: MeetingActionItem }> = ({ item }) => {
  const priorityColors = {
    high: 'bg-red-500/10 border-red-500/30 text-red-300',
    medium: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    low: 'bg-green-500/10 border-green-500/30 text-green-300',
  }

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-1 w-4 h-4 rounded border-2 flex-shrink-0',
            item.status === 'completed'
              ? 'bg-green-500 border-green-500'
              : 'border-gray-500'
          )}
        />
        <div className="flex-1">
          <p className={cn(
            'text-gray-200',
            item.status === 'completed' && 'line-through text-gray-500'
          )}>
            {item.task}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            {item.assignee && (
              <span className="text-gray-400">
                <Users className="h-3 w-3 inline mr-1" />
                {item.assignee}
              </span>
            )}
            {item.deadline && (
              <span className="text-gray-400">
                <Calendar className="h-3 w-3 inline mr-1" />
                {item.deadline}
              </span>
            )}
            <Badge
              variant="outline"
              className={cn('text-xs', priorityColors[item.priority])}
            >
              {item.priority}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MeetingSummaryView
