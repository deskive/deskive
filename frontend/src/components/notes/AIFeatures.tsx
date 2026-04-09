import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Alert, AlertDescription } from '../ui/alert'
import { 
  Languages, 
  Wand2, 
  Brain, 
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  PenTool,
  FileText,
  Loader2,
  Zap,
  AlertCircle,
} from 'lucide-react'

interface AIFeaturesProps {
  onAIResponseReceived: (response: string) => void
  noteContent?: string
}

export function AIFeatures({ onAIResponseReceived, noteContent = '' }: AIFeaturesProps) {
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const [copiedText, setCopiedText] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('es')
  const [textToTranslate, setTextToTranslate] = useState(noteContent)
  const [translationResult, setTranslationResult] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Handle AI prompt
  const handleAIPrompt = async () => {
    if (!aiPrompt.trim()) return

    setIsProcessingAI(true)
    setAiError(null)
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock AI response based on prompt
      let mockResponse = ''
      const prompt = aiPrompt.toLowerCase()
      
      if (prompt.includes('summarize')) {
        mockResponse = `Here's a summary based on your request:

**Key Points:**
• Main topic discussed
• Important decisions made
• Action items identified
• Next steps outlined

**Summary:**
The content covers several important aspects that require attention. The discussion focused on strategic planning and implementation details that will impact future operations.`
      } else if (prompt.includes('bullet points') || prompt.includes('list')) {
        mockResponse = `Here are the key points in bullet format:

• **Primary objective:** Clear goal definition
• **Resource allocation:** Budget and team assignments
• **Timeline:** Milestone dates and deadlines
• **Risk assessment:** Potential challenges identified
• **Success metrics:** KPIs and measurement criteria
• **Follow-up actions:** Next steps and responsibilities`
      } else if (prompt.includes('improve') || prompt.includes('enhance')) {
        mockResponse = `Here are suggestions to improve your content:

**Structure Improvements:**
• Add clear headings and subheadings
• Include bullet points for better readability
• Add examples or case studies
• Consider visual elements or diagrams

**Content Enhancements:**
• Expand on key concepts with more detail
• Add relevant statistics or data
• Include actionable recommendations
• Provide concrete next steps`
      } else {
        mockResponse = `Based on your prompt: "${aiPrompt}"

Here's an AI-generated response tailored to your request. The AI has analyzed your input and provided relevant insights, suggestions, or content based on the context provided.

This response can be customized further based on specific requirements or additional context you'd like to provide.`
      }
      
      setAiResponse(mockResponse)
      onAIResponseReceived(mockResponse)
    } catch (error) {
      console.error('AI processing failed:', error)
      setAiError('AI processing failed. Please try again.')
    } finally {
      setIsProcessingAI(false)
    }
  }

  // Handle translation
  const handleTranslation = async () => {
    if (!textToTranslate.trim()) return

    setIsTranslating(true)
    setAiError(null)
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock translation based on selected language
      const languageNames: Record<string, string> = {
        es: 'Spanish',
        fr: 'French',
        de: 'German',
        it: 'Italian',
        pt: 'Portuguese',
        ru: 'Russian',
        ja: 'Japanese',
        ko: 'Korean',
        zh: 'Chinese',
        ar: 'Arabic',
        hi: 'Hindi',
        nl: 'Dutch',
        sv: 'Swedish',
        pl: 'Polish'
      }
      
      const mockTranslation = `[Translated to ${languageNames[selectedLanguage] || selectedLanguage}]

${textToTranslate}

---
Translation confidence: 98%
Alternative suggestions available for complex phrases.`
      
      setTranslationResult(mockTranslation)
      onAIResponseReceived(mockTranslation)
    } catch (error) {
      console.error('Translation failed:', error)
      setAiError('Translation failed. Please try again.')
    } finally {
      setIsTranslating(false)
    }
  }

  // Copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      setTimeout(() => setCopiedText(''), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Translation Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Translation</h3>
        </div>
        
        <div className="flex items-center gap-4">
          <Label className="text-sm font-medium">Translate to:</Label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">🇪🇸 Spanish</SelectItem>
              <SelectItem value="fr">🇫🇷 French</SelectItem>
              <SelectItem value="de">🇩🇪 German</SelectItem>
              <SelectItem value="it">🇮🇹 Italian</SelectItem>
              <SelectItem value="pt">🇵🇹 Portuguese</SelectItem>
              <SelectItem value="ru">🇷🇺 Russian</SelectItem>
              <SelectItem value="ja">🇯🇵 Japanese</SelectItem>
              <SelectItem value="ko">🇰🇷 Korean</SelectItem>
              <SelectItem value="zh">🇨🇳 Chinese</SelectItem>
              <SelectItem value="ar">🇸🇦 Arabic</SelectItem>
              <SelectItem value="hi">🇮🇳 Hindi</SelectItem>
              <SelectItem value="nl">🇳🇱 Dutch</SelectItem>
              <SelectItem value="sv">🇸🇪 Swedish</SelectItem>
              <SelectItem value="pl">🇵🇱 Polish</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="translate-text" className="text-sm font-medium">
            Text to translate
          </Label>
          <Textarea
            id="translate-text"
            value={textToTranslate}
            onChange={(e) => setTextToTranslate(e.target.value)}
            placeholder="Enter or paste the text you want to translate..."
            rows={4}
          />
          <Button
            onClick={handleTranslation}
            disabled={!textToTranslate.trim() || isTranslating}
            className="w-full flex items-center gap-2"
          >
            {isTranslating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Languages className="h-4 w-4" />
            )}
            {isTranslating ? 'Translating...' : 'Translate'}
          </Button>
        </div>
        
        {/* Translation Result */}
        {translationResult && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Translation Result</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(translationResult)}
                className="flex items-center gap-1"
              >
                {copiedText === translationResult ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Copy
              </Button>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm font-sans">
                {translationResult}
              </pre>
            </div>
          </div>
        )}
      </div>
      
      {/* AI Assistant Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Writing Assistant</h3>
        </div>
        
        {/* Quick Prompts */}
        <div>
          <Label className="text-sm font-medium">Quick Actions</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { text: 'Summarize content', icon: '📝' },
              { text: 'Create bullet points', icon: '📋' },
              { text: 'Improve writing', icon: '✨' },
              { text: 'Add more details', icon: '🔍' },
              { text: 'Generate ideas', icon: '💡' },
              { text: 'Create outline', icon: '📄' },
            ].map((prompt) => (
              <Button
                key={prompt.text}
                variant="outline"
                size="sm"
                className="justify-start h-auto p-2 text-left"
                onClick={() => setAiPrompt(prompt.text)}
              >
                <span className="mr-2">{prompt.icon}</span>
                <span className="text-xs">{prompt.text}</span>
              </Button>
            ))}
          </div>
        </div>
        
        {/* Custom Prompt */}
        <div className="space-y-2">
          <Label htmlFor="ai-prompt" className="text-sm font-medium">
            Custom Prompt
          </Label>
          <Textarea
            id="ai-prompt"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ask the AI to help with your content..."
            rows={3}
          />
          <Button
            onClick={handleAIPrompt}
            disabled={!aiPrompt.trim() || isProcessingAI}
            className="w-full flex items-center gap-2"
          >
            {isProcessingAI ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            {isProcessingAI ? 'Processing...' : 'Ask AI'}
          </Button>
        </div>
        
        {/* Error Display */}
        {aiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{aiError}</AlertDescription>
          </Alert>
        )}
        
        {/* AI Response */}
        {aiResponse && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">AI Response</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(aiResponse)}
                className="flex items-center gap-1"
              >
                {copiedText === aiResponse ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Copy
              </Button>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm font-sans">
                {aiResponse}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}