'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setCookie } from 'cookies-next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Languages, Check } from 'lucide-react';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n';

interface LanguageSwitcherProps {
  currentLocale?: Locale;
}

export function LanguageSwitcher({ currentLocale = 'en' }: LanguageSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLocaleChange(locale: Locale) {
    // Set cookie for 1 year
    setCookie('NEXT_LOCALE', locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    // Refresh the page to load new locale
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <Languages className="h-5 w-5" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span>{localeFlags[locale]}</span>
              <span>{localeNames[locale]}</span>
            </span>
            {locale === currentLocale && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
