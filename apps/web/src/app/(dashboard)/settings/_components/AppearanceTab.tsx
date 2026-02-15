'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Sun, 
  Moon, 
  Monitor, 
  Check, 
  Save, 
  RefreshCw,
  Type,
  Minimize2,
  Sparkles,
  RotateCcw,
  Eye,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppearancePreferences, Theme, FontSize, FontFamily, AccentColor } from '../types';

interface AppearanceTabProps {
  preferences: AppearancePreferences;
  saving: boolean;
  loading: boolean;
  onUpdatePreference: <K extends keyof AppearancePreferences>(key: K, value: AppearancePreferences[K]) => void;
  onSavePreferences: () => Promise<void>;
  onResetToDefaults: () => void;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun; description: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Clean and bright' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Match your device' },
];

const ACCENT_COLORS: { value: AccentColor; label: string; class: string; bgClass: string }[] = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500', bgClass: 'bg-blue-500/10 ring-blue-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500', bgClass: 'bg-purple-500/10 ring-purple-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500', bgClass: 'bg-green-500/10 ring-green-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500', bgClass: 'bg-orange-500/10 ring-orange-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500', bgClass: 'bg-red-500/10 ring-red-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500', bgClass: 'bg-pink-500/10 ring-pink-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500', bgClass: 'bg-teal-500/10 ring-teal-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500', bgClass: 'bg-indigo-500/10 ring-indigo-500' },
];

const FONT_FAMILY_OPTIONS: { value: FontFamily; label: string; fontClass: string }[] = [
  { value: 'inter', label: 'Inter', fontClass: 'Inter' },
  { value: 'roboto', label: 'Roboto', fontClass: 'Roboto' },
  { value: 'open-sans', label: 'Open Sans', fontClass: 'Open Sans' },
  { value: 'lato', label: 'Lato', fontClass: 'Lato' },
  { value: 'poppins', label: 'Poppins', fontClass: 'Poppins' },
  { value: 'montserrat', label: 'Montserrat', fontClass: 'Montserrat' },
  { value: 'nunito', label: 'Nunito', fontClass: 'Nunito' },
  { value: 'raleway', label: 'Raleway', fontClass: 'Raleway' },
  { value: 'source-sans', label: 'Source Sans', fontClass: 'Source Sans 3' },
  { value: 'work-sans', label: 'Work Sans', fontClass: 'Work Sans' },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; size: string }[] = [
  { value: 'small', label: 'Small', size: 'text-xs' },
  { value: 'medium', label: 'Medium', size: 'text-sm' },
  { value: 'large', label: 'Large', size: 'text-base' },
];

export function AppearanceTab({
  preferences,
  saving,
  loading,
  onUpdatePreference,
  onSavePreferences,
  onResetToDefaults,
}: AppearanceTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme
              </CardTitle>
              <CardDescription>
                Choose your preferred color scheme
              </CardDescription>
            </div>
            <Badge variant="secondary" className="hidden sm:flex">
              <Sparkles className="h-3 w-3 mr-1" />
              Live Preview
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onUpdatePreference('theme', option.value)}
                className={cn(
                  'group relative flex flex-col items-center gap-2 p-3 border-2 rounded-xl transition-all duration-200 w-[150px]',
                  preferences.theme === option.value
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                )}
              >
                {/* Theme Preview */}
                <div
                  className={cn(
                    'w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden relative',
                    option.value === 'light' && 'bg-white border shadow-sm',
                    option.value === 'dark' && 'bg-gray-900 border border-gray-800',
                    option.value === 'system' && 'bg-gradient-to-r from-white via-gray-300 to-gray-900'
                  )}
                >
                  <option.icon
                    className={cn(
                      'h-6 w-6 transition-transform group-hover:scale-110',
                      option.value === 'light' && 'text-amber-500',
                      option.value === 'dark' && 'text-blue-400',
                      option.value === 'system' && 'text-gray-500'
                    )}
                  />
                  {preferences.theme === option.value && (
                    <div className="absolute top-1 right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Accent Color
          </CardTitle>
          <CardDescription>
            Personalize your interface with your favorite color
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => onUpdatePreference('accentColor', color.value)}
                className={cn(
                  'group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200',
                  preferences.accentColor === color.value
                    ? `ring-2 ${color.bgClass}`
                    : 'hover:bg-accent'
                )}
                title={color.label}
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-full shadow-lg transition-transform group-hover:scale-110',
                    color.class
                  )}
                >
                  {preferences.accentColor === color.value && (
                    <div className="h-full w-full flex items-center justify-center">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium hidden sm:block">{color.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Typography & Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Typography & Display
          </CardTitle>
          <CardDescription>
            Adjust text size and layout preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Font Size */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Font Size</Label>
            <div className="flex gap-2">
              {FONT_SIZE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onUpdatePreference('fontSize', option.value)}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-lg border-2 transition-all',
                    preferences.fontSize === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className={cn('font-medium', option.size)}>{option.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Preview: <span className={cn(
                preferences.fontSize === 'small' && 'text-xs',
                preferences.fontSize === 'medium' && 'text-sm',
                preferences.fontSize === 'large' && 'text-base'
              )}>This is how text will appear</span>
            </p>
          </div>

          <Separator />

          {/* Font Family */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Font Family</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {FONT_FAMILY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onUpdatePreference('fontFamily', option.value)}
                  className={cn(
                    'py-3 px-3 rounded-lg border-2 transition-all text-center',
                    preferences.fontFamily === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span 
                    className="font-medium text-sm"
                    style={{ fontFamily: option.fontClass }}
                  >
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Preview: <span style={{ fontFamily: FONT_FAMILY_OPTIONS.find(f => f.value === preferences.fontFamily)?.fontClass }}>
                The quick brown fox jumps over the lazy dog
              </span>
            </p>
          </div>

          <Separator />

          {/* Compact Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Minimize2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Compact Mode</p>
                <p className="text-sm text-muted-foreground">
                  Reduce spacing for a denser layout
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.compactMode}
              onCheckedChange={(checked) => onUpdatePreference('compactMode', checked)}
            />
          </div>

          <Separator />

          {/* Reduced Motion */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Reduce Motion</p>
                <p className="text-sm text-muted-foreground">
                  Minimize animations and transitions
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.reducedMotion}
              onCheckedChange={(checked) => onUpdatePreference('reducedMotion', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={onSavePreferences} disabled={saving} className="flex-1">
              {saving ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Preferences
            </Button>
            <Button variant="outline" onClick={onResetToDefaults} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
