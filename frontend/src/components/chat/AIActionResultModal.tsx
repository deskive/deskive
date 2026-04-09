/**
 * AI Action Result Modal
 * Displays results from AI actions on selected messages
 */

import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X,
  Copy,
  Check,
  FileText,
  MessageSquareText,
  Languages,
  ListChecks,
  Mail,
  Wand2,
  Loader2,
  Send,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { AIAction, SelectedMessage } from './MessageSelectionAIToolbar';

interface AIActionResultModalProps {
  open: boolean;
  onClose: () => void;
  action: AIAction | null;
  result: string | null;
  isLoading?: boolean;
  selectedMessages: SelectedMessage[];
  onCreateNote?: (content: string, title: string) => Promise<void>;
  onSendCustomPrompt?: (prompt: string) => Promise<void>;
  error?: string | null;
}

const ACTION_CONFIG: Record<AIAction, { icon: React.ComponentType<{ className?: string }>; title: string; color: string }> = {
  create_note: { icon: FileText, title: 'Create Note', color: 'text-emerald-500' },
  summarize: { icon: MessageSquareText, title: 'Summary', color: 'text-green-500' },
  translate: { icon: Languages, title: 'Translation', color: 'text-orange-500' },
  save_bookmark: { icon: FileText, title: 'Saved Messages', color: 'text-yellow-500' },
  extract_tasks: { icon: ListChecks, title: 'Extracted Tasks', color: 'text-cyan-500' },
  create_email: { icon: Mail, title: 'Email Draft', color: 'text-red-500' },
  copy_formatted: { icon: Copy, title: 'Formatted Messages', color: 'text-gray-500' },
  custom_prompt: { icon: Wand2, title: 'AI Response', color: 'text-teal-500' },
};

export const AIActionResultModal: React.FC<AIActionResultModalProps> = ({
  open,
  onClose,
  action,
  result,
  isLoading = false,
  selectedMessages,
  onCreateNote,
  onSendCustomPrompt,
  error,
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [copied, setCopied] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const config = action ? ACTION_CONFIG[action] : null;
  const Icon = config?.icon || Sparkles;

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateNote = async () => {
    if (!result || !onCreateNote) return;
    setIsSaving(true);
    try {
      await onCreateNote(result, noteTitle || 'AI Generated Note');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomPromptSubmit = async () => {
    if (!customPrompt.trim() || !onSendCustomPrompt) return;
    await onSendCustomPrompt(customPrompt);
    setCustomPrompt('');
  };

  const renderContent = () => {
    // Custom prompt input mode
    if (action === 'custom_prompt' && !result && !isLoading) {
      return (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <MessageSquareText className="w-4 h-4" />
              Selected Messages ({selectedMessages.length})
            </h4>
            <ScrollArea className="max-h-32">
              <div className="space-y-2 text-sm text-muted-foreground">
                {selectedMessages.map((msg) => (
                  <div key={msg.id} className="flex gap-2">
                    <span className="font-medium text-foreground">{msg.user.name}:</span>
                    <span className="line-clamp-1">{msg.body.replace(/<[^>]*>/g, '')}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ask AI about these messages:</label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., 'What are the key decisions made?', 'Find any deadlines mentioned', 'Rewrite as meeting minutes'..."
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            <span>AI will analyze the selected messages based on your prompt</span>
          </div>
        </div>
      );
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          {/* Animated AI Loading Indicator */}
          <div className="relative w-24 h-24">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 border-r-cyan-500 animate-spin" style={{ animationDuration: '2s' }} />

            {/* Middle pulsing ring */}
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-yellow-500 border-l-teal-500 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />

            {/* Inner gradient circle */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-emerald-500 via-cyan-400 to-yellow-400 animate-pulse opacity-80" />

            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white animate-pulse drop-shadow-lg" style={{ animationDuration: '1s' }} />
            </div>

            {/* Floating particles */}
            <div className="absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDuration: '1.2s', animationDelay: '0s' }} />
            <div className="absolute top-1/2 -right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDuration: '1.4s', animationDelay: '0.2s' }} />
            <div className="absolute -bottom-1 left-1/2 w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDuration: '1.3s', animationDelay: '0.4s' }} />
            <div className="absolute top-1/2 -left-1 w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDuration: '1.5s', animationDelay: '0.6s' }} />
          </div>

          {/* Loading text with gradient */}
          <p className="mt-6 text-base font-medium bg-gradient-to-r from-emerald-600 via-cyan-600 to-yellow-600 bg-clip-text text-transparent animate-pulse">
            {action === 'summarize' && 'Summarizing messages...'}
            {action === 'translate' && 'Translating messages...'}
            {action === 'extract_tasks' && 'Extracting action items...'}
            {action === 'create_note' && 'Creating note...'}
            {action === 'create_email' && 'Drafting email...'}
            {action === 'custom_prompt' && 'Processing your request...'}
            {!action && `Processing ${selectedMessages.length} messages...`}
          </p>

          {/* Animated dots */}
          <div className="flex items-center gap-1 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>

          <p className="text-xs text-muted-foreground mt-3">This may take a moment</p>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <p className="mt-4 font-medium text-red-600 dark:text-red-400">Failed to process</p>
          <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">{error}</p>
        </div>
      );
    }

    // Result display
    if (result) {
      return (
        <div className="space-y-4">
          {/* Result content */}
          <ScrollArea className="max-h-[400px]">
            <div className="bg-muted/30 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                {result}
              </pre>
            </div>
          </ScrollArea>

          {/* Note title input for create_note action */}
          {action === 'create_note' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Note Title:</label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Enter a title for your note..."
                className="w-full px-3 py-2 rounded-md border bg-background text-sm"
              />
            </div>
          )}

          {/* Source messages preview */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
              <MessageSquareText className="w-4 h-4" />
              View source messages ({selectedMessages.length})
            </summary>
            <div className="mt-2 space-y-2 pl-6 border-l-2 border-muted">
              {selectedMessages.map((msg) => (
                <div key={msg.id} className="text-sm">
                  <span className="font-medium">{msg.user.name}:</span>{' '}
                  <span className="text-muted-foreground line-clamp-2">
                    {msg.body.replace(/<[^>]*>/g, '')}
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn('w-5 h-5', config?.color)} />
            {config?.title || 'AI Action'}
          </DialogTitle>
          <DialogDescription>
            {action === 'custom_prompt' && !result
              ? 'Enter a custom prompt to analyze the selected messages'
              : `Results from processing ${selectedMessages.length} selected message${selectedMessages.length !== 1 ? 's' : ''}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {renderContent()}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2">
          {/* Custom prompt submit button */}
          {action === 'custom_prompt' && !result && !isLoading && (
            <Button
              onClick={handleCustomPromptSubmit}
              disabled={!customPrompt.trim()}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Send to AI
            </Button>
          )}

          {/* Result action buttons */}
          {result && (
            <>
              <Button
                variant="outline"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>

              {action === 'create_note' && onCreateNote && (
                <Button
                  onClick={handleCreateNote}
                  disabled={isSaving}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Save as Note
                </Button>
              )}

              {(action === 'summarize' || action === 'extract_tasks' || action === 'translate') && onCreateNote && (
                <Button
                  variant="outline"
                  onClick={() => {
                    let title = 'AI Generated Note';
                    if (action === 'summarize') title = 'Message Summary';
                    else if (action === 'extract_tasks') title = 'Extracted Tasks';
                    else if (action === 'translate') title = 'Translated Messages';
                    setNoteTitle(title);
                    handleCreateNote();
                  }}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Save as Note
                </Button>
              )}
            </>
          )}

          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIActionResultModal;
