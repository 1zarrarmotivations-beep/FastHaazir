import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LANGUAGES, 
  LanguageCode, 
  changeLanguage, 
  getCurrentLanguage 
} from '@/i18n';

interface LanguageToggleProps {
  variant?: 'default' | 'compact' | 'icon-only' | 'admin';
  className?: string;
}

const LanguageToggle = ({ variant = 'default', className = '' }: LanguageToggleProps) => {
  const { t } = useTranslation();
  const [currentLang, setCurrentLang] = useState<LanguageCode>(getCurrentLanguage());

  useEffect(() => {
    // Sync state when language changes externally
    const handleLanguageChange = () => {
      setCurrentLang(getCurrentLanguage());
    };
    
    // Listen for language changes
    window.addEventListener('languagechange', handleLanguageChange);
    return () => window.removeEventListener('languagechange', handleLanguageChange);
  }, []);

  const handleLanguageChange = (lang: LanguageCode) => {
    changeLanguage(lang);
    setCurrentLang(lang);
    
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new Event('languagechange'));
  };

  // Icon-only variant (for mobile headers)
  if (variant === 'icon-only') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={`shrink-0 ${className}`}>
            <Globe className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[120px]">
          {(Object.keys(LANGUAGES) as LanguageCode[]).map((lang) => (
            <DropdownMenuItem
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className="flex items-center justify-between"
            >
              <span className={lang === 'ur' ? 'font-urdu' : ''}>
                {LANGUAGES[lang].nativeName}
              </span>
              {currentLang === lang && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Compact toggle switch (EN | اردو)
  if (variant === 'compact') {
    return (
      <div className={`flex items-center bg-muted rounded-full p-1 ${className}`}>
        <AnimatePresence mode="wait">
          <motion.button
            key="en"
            onClick={() => handleLanguageChange('en')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              currentLang === 'en'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            EN
          </motion.button>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.button
            key="ur"
            onClick={() => handleLanguageChange('ur')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors font-urdu ${
              currentLang === 'ur'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            اردو
          </motion.button>
        </AnimatePresence>
      </div>
    );
  }

  // Admin panel variant
  if (variant === 'admin') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`gap-2 ${className}`}
          >
            <Globe className="w-4 h-4" />
            <span className={currentLang === 'ur' ? 'font-urdu' : ''}>
              {LANGUAGES[currentLang].nativeName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          {(Object.keys(LANGUAGES) as LanguageCode[]).map((lang) => (
            <DropdownMenuItem
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <span className={lang === 'ur' ? 'font-urdu' : ''}>
                  {LANGUAGES[lang].nativeName}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({LANGUAGES[lang].name})
                </span>
              </div>
              {currentLang === lang && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant with globe icon and dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`gap-2 ${className}`}>
          <Globe className="w-4 h-4" />
          <span className={currentLang === 'ur' ? 'font-urdu' : ''}>
            {LANGUAGES[currentLang].nativeName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {(Object.keys(LANGUAGES) as LanguageCode[]).map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className="flex items-center justify-between"
          >
            <span className={lang === 'ur' ? 'font-urdu' : ''}>
              {LANGUAGES[lang].nativeName}
            </span>
            {currentLang === lang && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageToggle;
