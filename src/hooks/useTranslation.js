import { useState, useEffect, useCallback } from 'react';
import { getTranslation, getSupportedLanguages } from '@/utils/i18n';

export function useTranslation() {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('dpi_language') || 'en';
  });

  const setLanguage = useCallback((newLang) => {
    setLanguageState(newLang);
    localStorage.setItem('dpi_language', newLang);
    window.dispatchEvent(new Event('dpi_language_changed'));
  }, []);

  useEffect(() => {
    const handleLanguageChange = () => {
      const stored = localStorage.getItem('dpi_language') || 'en';
      setLanguageState(stored);
    };
    window.addEventListener('dpi_language_changed', handleLanguageChange);
    return () => window.removeEventListener('dpi_language_changed', handleLanguageChange);
  }, []);

  const t = useCallback((key) => {
    return getTranslation(key, language);
  }, [language]);

  return {
    language,
    setLanguage,
    t,
    languages: getSupportedLanguages()
  };
}
