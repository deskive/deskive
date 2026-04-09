import React, { createContext, useContext, useState, useEffect } from 'react';
import { IntlProvider } from 'react-intl';
import enMessages from '../i18n/en.json';
import jaMessages from '../i18n/ja.json';

// Helper function to flatten nested messages
const flattenMessages = (nestedMessages: any, prefix = ''): Record<string, string> => {
  try {
    if (!nestedMessages || typeof nestedMessages !== 'object') {
      console.error('flattenMessages: Invalid input', nestedMessages);
      return {};
    }

    return Object.keys(nestedMessages).reduce((messages, key) => {
      const value = nestedMessages[key];
      const prefixedKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        messages[prefixedKey] = value;
      } else if (Array.isArray(value)) {
        // Handle arrays by converting to numbered keys
        value.forEach((item, index) => {
          messages[`${prefixedKey}.${index}`] = item;
        });
      } else if (value && typeof value === 'object') {
        Object.assign(messages, flattenMessages(value, prefixedKey));
      }

      return messages;
    }, {} as Record<string, string>);
  } catch (error) {
    console.error('Error in flattenMessages:', error);
    return {};
  }
};

const messages = {
  en: flattenMessages(enMessages),
  ja: flattenMessages(jaMessages),
};

// Validate that key messages exist
if (!messages.en['hero.title']) {
  console.error('Critical translation keys missing! hero.title not found in English messages.');
}

if (Object.keys(messages.en).length < 10) {
  console.error('Warning: Very few translation keys loaded. Expected 1000+, got:', Object.keys(messages.en).length);
}

// Debug workspace keys

// Debug workspace keys


export type SupportedLocale = keyof typeof messages;

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'ja'];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  ja: '日本語',
};

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // Get initial locale from localStorage or default to 'en'
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    const savedLocale = localStorage.getItem('deskive_locale');
    if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale as SupportedLocale)) {
      return savedLocale as SupportedLocale;
    }
    return 'en';
  });

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem('deskive_locale', newLocale);
  };

  useEffect(() => {
    // Update HTML lang attribute
    document.documentElement.lang = locale;
  }, [locale]);

  // Ensure we have valid messages for the locale
  const localeMessages = messages[locale] || messages.en || {};

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      <IntlProvider
        locale={locale}
        messages={localeMessages}
        defaultLocale="en"
        onError={(error) => {
          // Only log actual errors, not missing translation warnings
          if (error.code !== 'MISSING_TRANSLATION') {
            console.error('IntlProvider error:', error);
          }
        }}
      >
        {children}
      </IntlProvider>
    </LanguageContext.Provider>
  );
};
