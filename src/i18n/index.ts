import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.json';
import ur from './ur.json';

// Language configuration
export const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  ur: { name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = 'fast-haazir-language';

// Get stored language or default
const getStoredLanguage = (): LanguageCode => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && (stored === 'en' || stored === 'ur')) {
      return stored;
    }
  } catch (e) {
    console.warn('Could not access localStorage for language');
  }
  return 'en';
};

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ur: { translation: ur },
    },
    lng: getStoredLanguage(),
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  });

// Function to change language and update document direction
export const changeLanguage = (lang: LanguageCode) => {
  i18n.changeLanguage(lang);
  
  // Store preference
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (e) {
    console.warn('Could not save language preference');
  }
  
  // Update document direction for RTL support
  const dir = LANGUAGES[lang].dir;
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
  
  // Add/remove RTL class for additional styling hooks
  if (dir === 'rtl') {
    document.documentElement.classList.add('rtl');
    document.documentElement.classList.remove('ltr');
  } else {
    document.documentElement.classList.add('ltr');
    document.documentElement.classList.remove('rtl');
  }
};

// Initialize direction on load
const initialLang = getStoredLanguage();
changeLanguage(initialLang);

// Function to get current language
export const getCurrentLanguage = (): LanguageCode => {
  return (i18n.language || 'en') as LanguageCode;
};

// Function to check if current language is RTL
export const isRTL = (): boolean => {
  const lang = getCurrentLanguage();
  return LANGUAGES[lang]?.dir === 'rtl';
};

// Function to toggle between languages
export const toggleLanguage = () => {
  const current = getCurrentLanguage();
  const next = current === 'en' ? 'ur' : 'en';
  changeLanguage(next);
  return next;
};

export default i18n;
