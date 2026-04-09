/**
 * LiveAIOverlay Component - Live AI insights during calls
 * Clean React+Vite+TypeScript implementation
 */

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  X, 
  Minimize2, 
  Maximize2,
  Volume2,
  Languages,
  FileText,
  Lightbulb
} from 'lucide-react'
import type { LiveAIOverlayProps } from '@/types/video'

interface LiveInsight {
  id: string
  type: 'transcription' | 'translation' | 'suggestion' | 'summary'
  content: string
  timestamp: number
  confidence?: number
  speaker?: string
  language?: string
}

export const LiveAIOverlay: React.FC<LiveAIOverlayProps> = ({
  sessionId,
  isVisible,
  onToggle
}) => {
  const [isMinimized, setIsMinimized] = useState(false)
  const [liveInsights, setLiveInsights] = useState<LiveInsight[]>([])
  const [currentTranscription, setCurrentTranscription] = useState<string>('')
  const [isListening, setIsListening] = useState(true)

  // Mock live insights
  useEffect(() => {
    if (!isVisible) return

    const mockInsights: LiveInsight[] = [
      {
        id: 'insight-1',
        type: 'transcription',
        content: 'Let\'s focus on the Q4 deliverables and resource allocation.',
        timestamp: Date.now() - 5000,
        confidence: 0.92,
        speaker: 'John Smith'
      },
      {
        id: 'insight-2', 
        type: 'suggestion',
        content: 'Consider scheduling a follow-up meeting to discuss budget details.',
        timestamp: Date.now() - 3000
      },
      {
        id: 'insight-3',
        type: 'summary',
        content: 'Key decision: Mobile redesign is top priority for Q4.',
        timestamp: Date.now() - 1000
      }
    ]

    setLiveInsights(mockInsights)

    // Simulate live transcription updates
    const transcriptionTexts = [
      'We need to prioritize the mobile experience...',
      'I think the budget allocation looks good...',
      'Let me share my screen to show the mockups...',
      'The timeline seems realistic if we get the resources...',
      'Should we schedule a follow-up meeting?'
    ]

    let textIndex = 0
    const interval = setInterval(() => {
      if (isListening && textIndex < transcriptionTexts.length) {
        setCurrentTranscription(transcriptionTexts[textIndex])
        textIndex++
        
        // Add to insights after 2 seconds
        setTimeout(() => {
          const newInsight: LiveInsight = {
            id: `live-${Date.now()}`,
            type: 'transcription',
            content: transcriptionTexts[textIndex - 1],
            timestamp: Date.now(),
            confidence: 0.85 + Math.random() * 0.1,
            speaker: Math.random() > 0.5 ? 'John Smith' : 'Maria Johnson'
          }
          setLiveInsights(prev => [...prev.slice(-4), newInsight]) // Keep only last 5
        }, 2000)
      }
    }, 8000)

    return () => clearInterval(interval)
  }, [isVisible, isListening])

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const seconds = Math.floor(diff / 1000)
    if (seconds < 10) return 'now'
    if (seconds < 60) return `${seconds}s ago`
    return `${Math.floor(seconds / 60)}m ago`
  }

  // Get insight icon
  const getInsightIcon = (type: LiveInsight['type']) => {
    switch (type) {
      case 'transcription':
        return <Volume2 className="h-3 w-3" />
      case 'translation':
        return <Languages className="h-3 w-3" />
      case 'suggestion':
        return <Lightbulb className="h-3 w-3" />
      case 'summary':
        return <FileText className="h-3 w-3" />
      default:
        return <Brain className="h-3 w-3" />
    }
  }

  // Get insight color
  const getInsightColor = (type: LiveInsight['type']) => {
    switch (type) {
      case 'transcription':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'translation':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'suggestion':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'summary':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  if (!isVisible) return null

  if (isMinimized) {
    return (
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="bg-black/80 backdrop-blur-sm text-white hover:bg-black/90 border border-gray-700"
        >
          <Brain className="h-4 w-4 mr-2 text-purple-400" />
          AI Assistant
          {isListening && (
            <div className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="absolute top-4 left-4 w-80 z-10">
      <div className="bg-black/90 backdrop-blur-sm border border-gray-700 rounded-lg text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium">AI Assistant</span>
            {isListening && (
              <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30 animate-pulse text-xs">
                Live
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Live Transcription */}
        {currentTranscription && isListening && (
          <div className="p-3 border-b border-gray-700 bg-blue-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="h-3 w-3 text-blue-400" />
              <span className="text-xs font-medium text-blue-300">Live Transcription</span>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
            <p className="text-sm text-gray-200 italic">
              "{currentTranscription}"
            </p>
          </div>
        )}

        {/* Insights */}
        <div className="max-h-64 overflow-y-auto">
          <div className="p-3 space-y-3">
            {liveInsights.length === 0 ? (
              <div className="text-center py-4">
                <Brain className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500">AI insights will appear here</p>
              </div>
            ) : (
              liveInsights.slice().reverse().map((insight) => (
                <div key={insight.id} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "p-1 rounded border text-xs flex items-center gap-1",
                      getInsightColor(insight.type)
                    )}>
                      {getInsightIcon(insight.type)}
                      <span className="capitalize">{insight.type}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-200 leading-relaxed">
                        {insight.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(insight.timestamp)}
                        </span>
                        {insight.speaker && (
                          <>
                            <span className="text-xs text-gray-600">•</span>
                            <span className="text-xs text-gray-500">
                              {insight.speaker}
                            </span>
                          </>
                        )}
                        {insight.confidence && (
                          <>
                            <span className="text-xs text-gray-600">•</span>
                            <span className="text-xs text-gray-500">
                              {Math.round(insight.confidence * 100)}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsListening(!isListening)}
                className={cn(
                  "h-6 text-xs",
                  isListening 
                    ? "text-green-400 hover:text-green-300" 
                    : "text-gray-400 hover:text-gray-300"
                )}
              >
                {isListening ? 'Listening' : 'Paused'}
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              Session: {sessionId?.slice(-8)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}