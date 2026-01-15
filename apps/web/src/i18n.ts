import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'hi'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  zh: '中文',
  ja: '日本語',
  hi: 'हिन्दी',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  zh: '🇨🇳',
  ja: '🇯🇵',
  hi: '🇮🇳',
};

export function getLocaleFromCookie(): Locale {
  try {
    const cookieStore = cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE');
    const locale = localeCookie?.value as Locale;
    
    if (locale && locales.includes(locale)) {
      return locale;
    }
  } catch {
    // Ignore errors
  }
  
  return defaultLocale;
}

export function getLocaleFromHeader(): Locale {
  try {
    const headersList = headers();
    const acceptLanguage = headersList.get('accept-language');
    
    if (acceptLanguage) {
      const languages = acceptLanguage.split(',').map((lang) => {
        const [code] = lang.split(';');
        return code.trim().split('-')[0] as Locale;
      });
      
      const matchedLocale = languages.find((lang) => locales.includes(lang));
      if (matchedLocale) {
        return matchedLocale;
      }
    }
  } catch {
    // Ignore errors
  }
  
  return defaultLocale;
}

export default getRequestConfig(async () => {
  // Try to get locale from cookie first, then from header
  const locale = getLocaleFromCookie() || getLocaleFromHeader();
  
  // Load messages for the locale
  let messages;
  try {
    messages = (await import(`./messages/${locale}.json`)).default;
  } catch {
    // Fallback to English if locale file not found
    messages = (await import('./messages/en.json')).default;
  }
  
  return {
    locale,
    messages,
    timeZone: 'UTC',
    now: new Date(),
  };
});
