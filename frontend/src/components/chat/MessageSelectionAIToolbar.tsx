/**
 * Message Selection AI Toolbar
 * Provides AI-powered actions for selected messages in chat
 */

import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Sparkles,
  FileText,
  Languages,
  BookmarkPlus,
  Loader2,
  ChevronDown,
  MessageSquareText,
  ListChecks,
  Mail,
  Copy,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface SelectedMessage {
  id: string;
  body: string;
  user: {
    id: string;
    name: string;
  };
  timestamp: Date;
}

export type AIAction =
  | 'create_note'
  | 'summarize'
  | 'translate'
  | 'save_bookmark'
  | 'extract_tasks'
  | 'create_email'
  | 'copy_formatted'
  | 'custom_prompt';

export interface AIActionResult {
  action: AIAction;
  content: string;
  metadata?: Record<string, any>;
}

interface MessageSelectionAIToolbarProps {
  selectedMessages: SelectedMessage[];
  onAIAction: (action: AIAction, options?: { language?: string; customPrompt?: string }) => Promise<void>;
  isProcessing?: boolean;
  className?: string;
}

const TRANSLATE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
];

export const MessageSelectionAIToolbar: React.FC<MessageSelectionAIToolbarProps> = ({
  selectedMessages,
  onAIAction,
  isProcessing = false,
  className,
}) => {
  const intl = useIntl();
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);

  const handleAction = async (action: AIAction, options?: { language?: string; customPrompt?: string }) => {
    setActiveAction(action);
    try {
      await onAIAction(action, options);
    } finally {
      setActiveAction(null);
    }
  };

  const messageCount = selectedMessages.length;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* AI Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="sm"
            disabled={isProcessing}
            className="btn-ai-gradient gap-1.5"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">AI Actions</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 max-h-[50vh] overflow-y-auto">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            AI Actions ({messageCount} {messageCount === 1 ? 'message' : 'messages'})
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Create Note */}
          <DropdownMenuItem
            onClick={() => handleAction('create_note')}
            disabled={isProcessing}
            className="gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <div className="flex flex-col">
              <span>Create Note</span>
              <span className="text-xs text-muted-foreground">
                Turn messages into a formatted note
              </span>
            </div>
            {activeAction === 'create_note' && (
              <Loader2 className="w-4 h-4 animate-spin ml-auto" />
            )}
          </DropdownMenuItem>

          {/* Summarize */}
          <DropdownMenuItem
            onClick={() => handleAction('summarize')}
            disabled={isProcessing}
            className="gap-2 cursor-pointer"
          >
            <MessageSquareText className="w-4 h-4 text-green-500" />
            <div className="flex flex-col">
              <span>Summarize</span>
              <span className="text-xs text-muted-foreground">
                Get a concise summary
              </span>
            </div>
            {activeAction === 'summarize' && (
              <Loader2 className="w-4 h-4 animate-spin ml-auto" />
            )}
          </DropdownMenuItem>

          {/* Translate - with sub-menu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
              <Languages className="w-4 h-4 text-orange-500" />
              <div className="flex flex-col">
                <span>Translate</span>
                <span className="text-xs text-muted-foreground">
                  Translate to another language
                </span>
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
              {TRANSLATE_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleAction('translate', { language: lang.code })}
                  disabled={isProcessing}
                  className="cursor-pointer"
                >
                  {lang.name}
                  {activeAction === 'translate' && (
                    <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Extract Tasks */}
          <DropdownMenuItem
            onClick={() => handleAction('extract_tasks')}
            disabled={isProcessing}
            className="gap-2 cursor-pointer"
          >
            <ListChecks className="w-4 h-4 text-purple-500" />
            <div className="flex flex-col">
              <span>Extract Tasks</span>
              <span className="text-xs text-muted-foreground">
                Find action items in messages
              </span>
            </div>
            {activeAction === 'extract_tasks' && (
              <Loader2 className="w-4 h-4 animate-spin ml-auto" />
            )}
          </DropdownMenuItem>

          {/* Custom Prompt */}
          <DropdownMenuItem
            onClick={() => handleAction('custom_prompt')}
            disabled={isProcessing}
            className="gap-2 cursor-pointer"
          >
            <Wand2 className="w-4 h-4 text-indigo-500" />
            <div className="flex flex-col">
              <span>Custom AI Prompt</span>
              <span className="text-xs text-muted-foreground">
                Ask AI anything about these messages
              </span>
            </div>
            {activeAction === 'custom_prompt' && (
              <Loader2 className="w-4 h-4 animate-spin ml-auto" />
            )}
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick Action Buttons (visible on larger screens) */}
      <div className="hidden md:flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAction('create_email')}
          disabled={isProcessing}
          className="gap-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
          title="Create Email"
        >
          <Mail className="w-4 h-4" />
          <span className="hidden lg:inline">Email</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAction('copy_formatted')}
          disabled={isProcessing}
          className="gap-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-950/50"
          title="Copy Formatted"
        >
          <Copy className="w-4 h-4" />
          <span className="hidden lg:inline">Copy</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAction('save_bookmark')}
          disabled={isProcessing}
          className="gap-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/50"
          title="Save All"
        >
          <BookmarkPlus className="w-4 h-4" />
          <span className="hidden lg:inline">Bookmark</span>
        </Button>
      </div>
    </div>
  );
};

export default MessageSelectionAIToolbar;
