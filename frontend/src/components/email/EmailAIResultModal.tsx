/**
 * Email AI Result Modal
 * Displays results from AI actions on emails (Summarize, Translate, Extract Tasks)
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  MessageSquareText,
  Languages,
  ListChecks,
  Loader2,
  Sparkles,
  FileText,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { notesApi } from '@/lib/api/notes-api';
import { toast } from 'sonner';

// Simple markdown to HTML converter
const renderMarkdown = (text: string): string => {
  if (!text) return '';

  return text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-base mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold text-lg mt-3 mb-1">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="font-bold text-xl mt-3 mb-2">$1</h2>')
    // Bullet points
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br/>');
};

export type EmailAIAction = 'summarize' | 'translate' | 'extract_tasks';

interface EmailAIResultModalProps {
  open: boolean;
  onClose: () => void;
  action: EmailAIAction | null;
  result: string | null;
  isLoading?: boolean;
  error?: string | null;
  emailSubject?: string;
  targetLanguage?: string;
  workspaceId?: string;
}

const ACTION_CONFIG: Record<EmailAIAction, { icon: React.ComponentType<{ className?: string }>; title: string; color: string; description: string }> = {
  summarize: {
    icon: MessageSquareText,
    title: 'Email Summary',
    color: 'text-emerald-500',
    description: 'AI-generated summary of the email'
  },
  translate: {
    icon: Languages,
    title: 'Translation',
    color: 'text-teal-500',
    description: 'Translated email content'
  },
  extract_tasks: {
    icon: ListChecks,
    title: 'Action Items',
    color: 'text-cyan-500',
    description: 'Tasks and action items extracted from the email'
  },
};

export const EmailAIResultModal: React.FC<EmailAIResultModalProps> = ({
  open,
  onClose,
  action,
  result,
  isLoading = false,
  error,
  emailSubject,
  targetLanguage,
  workspaceId,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const config = action ? ACTION_CONFIG[action] : null;
  const Icon = config?.icon || Sparkles;

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save as Note
  const handleSaveAsNote = async () => {
    if (!result || !workspaceId) {
      toast.error('Unable to save note');
      return;
    }

    setIsSavingNote(true);

    try {
      // Generate note title based on action
      let noteTitle = '';
      if (action === 'summarize') {
        noteTitle = `Summary: ${emailSubject || 'Email'}`;
      } else if (action === 'translate') {
        noteTitle = `Translation (${targetLanguage}): ${emailSubject || 'Email'}`;
      } else if (action === 'extract_tasks') {
        noteTitle = `Tasks from: ${emailSubject || 'Email'}`;
      }

      // Convert result to plain text string
      let plainTextContent = '';
      if (typeof result === 'string') {
        plainTextContent = result;
      } else if (typeof result === 'object') {
        // Handle object responses (like summary with key_points)
        plainTextContent = JSON.stringify(result, null, 2);
      }

      // Convert markdown to HTML for the notes editor
      const markdownToHtml = (text: string): string => {
        return text
          // Bold: **text** or __text__
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/__(.+?)__/g, '<strong>$1</strong>')
          // Italic: *text* or _text_
          .replace(/\*([^*]+)\*/g, '<em>$1</em>')
          .replace(/_([^_]+)_/g, '<em>$1</em>')
          // Links: [text](url)
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      };

      // Convert to HTML paragraphs with markdown formatting
      const lines = plainTextContent.split('\n').filter(line => line.trim());
      const htmlContent = lines.map(line => `<p>${markdownToHtml(line.trim())}</p>`).join('');

      await notesApi.createNote(workspaceId, {
        title: noteTitle,
        content: htmlContent || '<p></p>',
        tags: ['ai-generated', action || 'email'],
      });

      toast.success('Saved as note successfully!', {
        description: noteTitle,
      });
    } catch (error: any) {
      console.error('Failed to save note:', error);
      toast.error('Failed to save note', {
        description: error?.message || 'Please try again',
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const renderContent = () => {
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
            {action === 'summarize' && 'Analyzing email content...'}
            {action === 'translate' && `Translating to ${targetLanguage}...`}
            {action === 'extract_tasks' && 'Extracting action items...'}
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
      // Render markdown for summary, plain text for others
      const renderedContent = action === 'summarize'
        ? renderMarkdown(result)
        : result;

      return (
        <div className="space-y-4">
          {/* Email subject reference */}
          {emailSubject && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{emailSubject}</span>
            </div>
          )}

          {/* Result content */}
          <div className="bg-muted/30 rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {action === 'summarize' ? (
                <div
                  className="text-sm font-sans leading-relaxed prose prose-sm dark:prose-invert max-w-none break-words [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-1"
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  dangerouslySetInnerHTML={{ __html: renderedContent }}
                />
              ) : (
                <div
                  className="text-sm font-sans leading-relaxed whitespace-pre-wrap break-words"
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                >
                  {result}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn('w-5 h-5', config?.color)} />
            {config?.title || 'AI Action'}
          </DialogTitle>
          <DialogDescription>
            {config?.description}
            {action === 'translate' && targetLanguage && ` (${targetLanguage})`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {renderContent()}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2">
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
              {workspaceId && (
                <Button
                  variant="outline"
                  onClick={handleSaveAsNote}
                  disabled={isSavingNote}
                  className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950"
                >
                  {isSavingNote ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <StickyNote className="w-4 h-4" />
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

export default EmailAIResultModal;
