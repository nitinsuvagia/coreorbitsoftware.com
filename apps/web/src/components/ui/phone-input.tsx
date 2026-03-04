'use client';

import * as React from 'react';
import { Check, ChevronDown, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

// Country data with flag emoji, dial code, and country code
const countries = [
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
].sort((a, b) => a.name.localeCompare(b.name));

export interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  defaultCountry?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

// Countries that share the same dial code - prefer these in order
const dialCodePreference: Record<string, string[]> = {
  '+1': ['US', 'CA'], // Prefer USA over Canada for +1
  '+7': ['RU'],       // Prefer Russia for +7
};

// Parse phone number to extract country code and number
function parsePhoneNumber(value: string, preferredCountry?: string): { countryCode: string; number: string } {
  if (!value) return { countryCode: preferredCountry || 'IN', number: '' };
  
  // Try to find matching country by dial code
  const cleanValue = value.replace(/\s/g, '');
  
  // Find all countries matching the dial code
  for (const country of countries) {
    if (cleanValue.startsWith(country.dialCode)) {
      const dialCode = country.dialCode;
      const number = cleanValue.slice(dialCode.length);
      
      // Check if there are multiple countries with this dial code
      const countriesWithSameCode = countries.filter(c => c.dialCode === dialCode);
      
      if (countriesWithSameCode.length > 1) {
        // If preferred country matches one of them, use it
        if (preferredCountry && countriesWithSameCode.some(c => c.code === preferredCountry)) {
          return { countryCode: preferredCountry, number };
        }
        // Otherwise use the preference order (e.g., USA before Canada for +1)
        const preferred = dialCodePreference[dialCode];
        if (preferred) {
          const preferredMatch = preferred.find(code => countriesWithSameCode.some(c => c.code === code));
          if (preferredMatch) {
            return { countryCode: preferredMatch, number };
          }
        }
      }
      
      return { countryCode: country.code, number };
    }
  }
  
  // Default to preferred country or India if no match
  return { countryCode: preferredCountry || 'IN', number: value.replace(/^\+/, '') };
}

// Format phone number with country code
function formatPhoneNumber(countryCode: string, number: string): string {
  const country = countries.find(c => c.code === countryCode);
  if (!country || !number) return '';
  return `${country.dialCode}${number}`;
}

export function PhoneInput({
  value = '',
  onChange,
  defaultCountry = 'IN',
  placeholder = 'Enter phone number',
  disabled = false,
  className,
  error = false,
}: PhoneInputProps) {
  const [open, setOpen] = React.useState(false);
  const { countryCode: initialCountry, number: initialNumber } = parsePhoneNumber(value, defaultCountry);
  const [selectedCountry, setSelectedCountry] = React.useState(initialCountry || defaultCountry);
  const [phoneNumber, setPhoneNumber] = React.useState(initialNumber);

  const country = countries.find(c => c.code === selectedCountry) || countries.find(c => c.code === 'IN')!;

  // Update internal state when value prop changes
  React.useEffect(() => {
    const { countryCode, number } = parsePhoneNumber(value, selectedCountry);
    if (countryCode !== selectedCountry || number !== phoneNumber) {
      setSelectedCountry(countryCode);
      setPhoneNumber(number);
    }
  }, [value]);

  const handleCountryChange = (code: string) => {
    setSelectedCountry(code);
    setOpen(false);
    const newValue = formatPhoneNumber(code, phoneNumber);
    onChange?.(newValue);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const newNumber = e.target.value.replace(/[^\d]/g, '');
    setPhoneNumber(newNumber);
    const newValue = formatPhoneNumber(selectedCountry, newNumber);
    onChange?.(newValue);
  };

  return (
    <div className={cn('flex', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-[110px] justify-between rounded-r-none border-r-0 px-3',
              error && 'border-destructive focus:ring-destructive'
            )}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">{country.flag}</span>
              <span className="text-sm text-muted-foreground">{country.dialCode}</span>
            </span>
            <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search country..." />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                <ScrollArea className="h-[300px]">
                  {countries.map((c) => (
                    <CommandItem
                      key={c.code}
                      value={`${c.name} ${c.dialCode}`}
                      onSelect={() => handleCountryChange(c.code)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedCountry === c.code ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="text-lg mr-2">{c.flag}</span>
                      <span className="flex-1">{c.name}</span>
                      <span className="text-muted-foreground text-sm">{c.dialCode}</span>
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        type="tel"
        value={phoneNumber}
        onChange={handleNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'rounded-l-none flex-1',
          error && 'border-destructive focus:ring-destructive'
        )}
      />
    </div>
  );
}

// Simple display component for showing phone numbers with flag
// Only shows flag/country code if the number already has a valid country code prefix
export function PhoneDisplay({ value, className }: { value?: string; className?: string }) {
  if (!value) return <span className={className}>-</span>;
  
  // Clean the value
  const cleanValue = value.replace(/\s/g, '');
  
  // Only try to parse if it starts with + (indicating it has a country code)
  if (cleanValue.startsWith('+')) {
    // Try to find matching country by dial code
    for (const country of countries) {
      if (cleanValue.startsWith(country.dialCode)) {
        const number = cleanValue.slice(country.dialCode.length);
        return (
          <span className={cn('inline-flex items-center gap-1.5', className)}>
            <span className="text-base">{country.flag}</span>
            <span>{country.dialCode} {number}</span>
          </span>
        );
      }
    }
  }
  
  // No country code detected - display as-is
  return <span className={className}>{value}</span>;
}
