import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { translations } from './i18n';

type Language = 'en' | 'ar';
type TranslationOptions = { [key: string]: string | number };

interface LanguageContextType {
  lang: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en, options?: TranslationOptions) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    // Dynamically load font based on language
    const existingLink = document.getElementById('font-link');
    if (existingLink) {
        existingLink.remove();
    }

    const link = document.createElement('link');
    link.id = 'font-link';
    link.rel = 'preconnect';
    link.href = 'https://fonts.gstatic.com';
    document.head.appendChild(link);

    const fontLink = document.createElement('link');
    fontLink.id = 'font-stylesheet';
    fontLink.rel = 'stylesheet';
    if (lang === 'ar') {
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap';
        document.body.style.fontFamily = "'Tajawal', sans-serif";
    } else {
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
        document.body.style.fontFamily = "'Inter', sans-serif";
    }
    document.head.appendChild(fontLink);


  }, [lang]);

  const t = (key: keyof typeof translations.en, options?: TranslationOptions): string => {
    let text = translations[lang][key] || translations.en[key];
    if (options) {
      Object.keys(options).forEach((optionKey) => {
        const regex = new RegExp(`{${optionKey}}`, 'g');
        text = text.replace(regex, String(options[optionKey]));
      });
    }
    return text;
  };

  const value = useMemo(() => ({ lang, setLanguage: setLang, t }), [lang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};