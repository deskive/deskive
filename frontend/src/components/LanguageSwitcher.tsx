import React from 'react';
import { Globe, Check } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useLanguage, LOCALE_LABELS, type SupportedLocale } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';

interface Language {
  code: SupportedLocale;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale } = useLanguage();

  const currentLang = languages.find(lang => lang.code === locale) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-semibold px-3 py-2 rounded-lg transition-all duration-200"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline-block">{currentLang.flag}</span>
          <span className="hidden md:inline-block">{currentLang.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-48 mr-2">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setLocale(language.code)}
            className={cn(
              "flex items-center gap-3 cursor-pointer",
              locale === language.code && "bg-gray-100"
            )}
          >
            <span className="text-lg">{language.flag}</span>
            <span className="font-medium flex-1">{language.name}</span>
            {locale === language.code && (
              <Check className="w-4 h-4 text-sky-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
