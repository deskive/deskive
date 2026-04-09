import { useIntl } from 'react-intl'
import { Button } from '../ui/button'
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
} from '../ui/dropdown-menu'
import {
  Loader2,
  Sparkles,
  Languages,
  FileText,
  Wand2,
  CheckCheck,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
} from 'lucide-react'

interface AIToolsMenuProps {
  selectedText: string
  getPlainTextContent: () => string
  translateLoading?: boolean
  summaryLoading?: boolean
  textGenerationLoading?: boolean
  onTranslate?: (language: string) => void
  onSummarize?: () => void
  onImproveWriting?: () => void
  onFixGrammar?: () => void
  onMakeLonger?: () => void
  onMakeShorter?: () => void
}

const TRANSLATION_LANGUAGES = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Spanish' },
  { code: 'fr', flag: '🇫🇷', name: 'French' },
  { code: 'de', flag: '🇩🇪', name: 'German' },
  { code: 'zh-cn', flag: '🇨🇳', name: 'Chinese (Simplified)' },
  { code: 'zh-tw', flag: '🇹🇼', name: 'Chinese (Traditional)' },
  { code: 'ja', flag: '🇯🇵', name: 'Japanese' },
  { code: 'ko', flag: '🇰🇷', name: 'Korean' },
  { code: 'pt', flag: '🇵🇹', name: 'Portuguese' },
  { code: 'it', flag: '🇮🇹', name: 'Italian' },
  { code: 'ru', flag: '🇷🇺', name: 'Russian' },
  { code: 'ar', flag: '🇸🇦', name: 'Arabic' },
  { code: 'hi', flag: '🇮🇳', name: 'Hindi' },
  { code: 'nl', flag: '🇳🇱', name: 'Dutch' },
  { code: 'sv', flag: '🇸🇪', name: 'Swedish' },
  { code: 'no', flag: '🇳🇴', name: 'Norwegian' },
  { code: 'da', flag: '🇩🇰', name: 'Danish' },
  { code: 'fi', flag: '🇫🇮', name: 'Finnish' },
  { code: 'pl', flag: '🇵🇱', name: 'Polish' },
  { code: 'tr', flag: '🇹🇷', name: 'Turkish' },
  { code: 'he', flag: '🇮🇱', name: 'Hebrew' },
  { code: 'th', flag: '🇹🇭', name: 'Thai' },
  { code: 'vi', flag: '🇻🇳', name: 'Vietnamese' },
  { code: 'uk', flag: '🇺🇦', name: 'Ukrainian' },
]

export function AIToolsMenu({
  selectedText,
  getPlainTextContent: _getPlainTextContent,
  translateLoading = false,
  summaryLoading = false,
  textGenerationLoading = false,
  onTranslate,
  onSummarize,
  onImproveWriting,
  onFixGrammar,
  onMakeLonger,
  onMakeShorter
}: AIToolsMenuProps) {
  // Note: _getPlainTextContent is available if needed for future AI features
  const intl = useIntl()
  const isLoading = translateLoading || summaryLoading || textGenerationLoading

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          size="sm"
          disabled={isLoading}
          className="btn-ai-gradient gap-1.5"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {intl.formatMessage({ id: 'modules.notes.aiToolsMenu.aiTools' })}
          <ChevronDown className="w-3 h-3 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          {intl.formatMessage({ id: 'modules.notes.aiToolsMenu.aiActions' })}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Translate - with sub-menu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
            <Languages className="w-4 h-4 text-orange-500" />
            <div className="flex flex-col">
              <span>{intl.formatMessage({ id: 'modules.notes.aiToolsMenu.translate' })}</span>
              <span className="text-xs text-muted-foreground">
                Translate to another language
              </span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
            {TRANSLATION_LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => onTranslate?.(lang.code)}
                disabled={translateLoading}
                className="cursor-pointer gap-2"
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Summarize */}
        <DropdownMenuItem
          onClick={() => onSummarize?.()}
          disabled={summaryLoading}
          className="gap-2 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-teal-500" />
          <div className="flex flex-col">
            <span>{intl.formatMessage({ id: 'modules.notes.aiToolsMenu.summarizeText' })}</span>
            <span className="text-xs text-muted-foreground">
              Get a concise summary
            </span>
          </div>
          {summaryLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Improve Writing */}
        <DropdownMenuItem
          onClick={() => onImproveWriting?.()}
          disabled={textGenerationLoading}
          className="gap-2 cursor-pointer"
        >
          <Wand2 className="w-4 h-4 text-cyan-500" />
          <div className="flex flex-col">
            <span>{intl.formatMessage({ id: 'modules.notes.aiToolsMenu.improveWriting' })}</span>
            <span className="text-xs text-muted-foreground">
              Enhance clarity and style
            </span>
          </div>
          {textGenerationLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
        </DropdownMenuItem>

        {/* Fix Grammar */}
        <DropdownMenuItem
          onClick={() => onFixGrammar?.()}
          disabled={textGenerationLoading}
          className="gap-2 cursor-pointer"
        >
          <CheckCheck className="w-4 h-4 text-green-500" />
          <div className="flex flex-col">
            <span>{intl.formatMessage({ id: 'modules.notes.aiToolsMenu.fixGrammar' })}</span>
            <span className="text-xs text-muted-foreground">
              Correct spelling and grammar
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Make Longer */}
        <DropdownMenuItem
          onClick={() => onMakeLonger?.()}
          disabled={textGenerationLoading}
          className="gap-2 cursor-pointer"
        >
          <ArrowUpRight className="w-4 h-4 text-teal-500" />
          <div className="flex flex-col">
            <span>{intl.formatMessage({ id: 'modules.notes.aiToolsMenu.makeLonger' })}</span>
            <span className="text-xs text-muted-foreground">
              Expand with more details
            </span>
          </div>
        </DropdownMenuItem>

        {/* Make Shorter */}
        <DropdownMenuItem
          onClick={() => onMakeShorter?.()}
          disabled={textGenerationLoading}
          className="gap-2 cursor-pointer"
        >
          <ArrowDownRight className="w-4 h-4 text-red-500" />
          <div className="flex flex-col">
            <span>{intl.formatMessage({ id: 'modules.notes.aiToolsMenu.makeShorter' })}</span>
            <span className="text-xs text-muted-foreground">
              Condense to key points
            </span>
          </div>
        </DropdownMenuItem>

        {/* Selected Text Info */}
        {selectedText && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                {intl.formatMessage({ id: 'modules.notes.aiToolsMenu.charactersSelected' }, { count: selectedText.length })}
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
