'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Globe,
  Loader2,
  Sparkles,
  Calendar,
  AlertTriangle,
  Settings,
  Download,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import {
  useAIHolidayStatus,
  useAIHolidayCountries,
  useGenerateAIHolidays,
  useImportAIHolidays,
  AIGeneratedHoliday,
} from '@/hooks/use-holidays';

interface AIHolidayImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
  defaultYear?: number;
}

const HOLIDAY_TYPE_COLORS: Record<string, string> = {
  public: 'bg-rose-100 text-rose-700',
  optional: 'bg-amber-100 text-amber-700',
  restricted: 'bg-purple-100 text-purple-700',
};

export function AIHolidayImportDialog({ 
  open, 
  onOpenChange, 
  onImportSuccess,
  defaultYear = new Date().getFullYear(),
}: AIHolidayImportDialogProps) {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedYear, setSelectedYear] = useState(defaultYear.toString());
  const [includeOptional, setIncludeOptional] = useState(true);
  const [generatedHolidays, setGeneratedHolidays] = useState<AIGeneratedHoliday[]>([]);
  const [selectedHolidays, setSelectedHolidays] = useState<Set<number>>(new Set());

  // Queries
  const { data: statusData, isLoading: loadingStatus } = useAIHolidayStatus();
  const { data: countriesData, isLoading: loadingCountries } = useAIHolidayCountries();
  
  // Mutations
  const generateMutation = useGenerateAIHolidays();
  const importMutation = useImportAIHolidays();

  const isConfigured = statusData?.configured ?? false;
  const countries = countriesData?.countries ?? [];

  // Generate year options (current year - 1 to current year + 2)
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    (currentYear - 1).toString(),
    currentYear.toString(),
    (currentYear + 1).toString(),
    (currentYear + 2).toString(),
  ];

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setGeneratedHolidays([]);
      setSelectedHolidays(new Set());
    }
  }, [open]);

  // Set default country on load
  useEffect(() => {
    if (countries.length > 0 && !selectedCountry) {
      // Default to India (IN) if available, otherwise first country
      const defaultCountry = countries.find(c => c.code === 'IN') || countries[0];
      setSelectedCountry(defaultCountry.code);
    }
  }, [countries, selectedCountry]);

  const handleGenerate = async () => {
    if (!selectedCountry) {
      toast.error('Please select a country');
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        country: selectedCountry,
        year: parseInt(selectedYear),
        includeOptional,
      });
      
      const holidays = result.holidays || [];
      setGeneratedHolidays(holidays);
      // Don't select any by default - user selects manually
      setSelectedHolidays(new Set());
      
      if (holidays.length === 0) {
        toast.info('No holidays found for this country and year.');
      } else {
        toast.success(`Generated ${holidays.length} holidays for ${result.country}`);
      }
    } catch (error: any) {
      console.error('Failed to generate holidays:', error);
      toast.error(error?.message || 'Failed to generate holidays');
    }
  };

  const handleImport = async () => {
    const holidaysToImport = generatedHolidays.filter((_, i) => selectedHolidays.has(i));
    
    if (holidaysToImport.length === 0) {
      toast.error('Please select at least one holiday to import');
      return;
    }

    try {
      const result = await importMutation.mutateAsync(holidaysToImport);
      
      if (result.skipped > 0) {
        toast.success(
          `Imported ${result.created} holidays. ${result.skipped} duplicates were skipped.`,
          { icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> }
        );
      } else {
        toast.success(`Successfully imported ${result.created} holidays`);
      }
      
      onImportSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to import holidays:', error);
      toast.error(error?.message || 'Failed to import holidays');
    }
  };

  const toggleHoliday = (index: number) => {
    const newSelected = new Set(selectedHolidays);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedHolidays(newSelected);
  };

  const toggleAll = () => {
    if (selectedHolidays.size === generatedHolidays.length) {
      setSelectedHolidays(new Set());
    } else {
      setSelectedHolidays(new Set(generatedHolidays.map((_, i) => i)));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCountryName = (code: string) => {
    return countries.find(c => c.code === code)?.name || code;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Holiday Import
            {loadingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : isConfigured ? (
              <Badge className="bg-green-100 text-green-700 ml-2">
                <Zap className="h-3 w-3 mr-1" />
                AI Enabled
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-2">
                Not Configured
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Generate public holidays for any country using AI. Select the holidays you want to import.
          </DialogDescription>
        </DialogHeader>

        {/* Not Configured Banner */}
        {!loadingStatus && !isConfigured && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <Sparkles className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-blue-800">AI not configured</span>
              <span className="text-blue-600 ml-1">
                Configure your OpenAI API key in Organization Settings to use AI holiday generation.
              </span>
            </div>
            <Link href="/organization?tab=integrations">
              <Button variant="outline" size="sm" className="shrink-0">
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
            </Link>
          </div>
        )}

        {/* Generation Controls */}
        {isConfigured && (
          <div className="flex flex-wrap gap-4 py-4 border-b">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-sm font-medium mb-2 block">Country</Label>
              <Select 
                value={selectedCountry} 
                onValueChange={setSelectedCountry}
                disabled={loadingCountries}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingCountries ? "Loading..." : "Select country"} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {country.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[120px]">
              <Label className="text-sm font-medium mb-2 block">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end pb-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="include-optional"
                  checked={includeOptional}
                  onCheckedChange={setIncludeOptional}
                />
                <Label htmlFor="include-optional" className="text-sm cursor-pointer">
                  Include optional holidays
                </Label>
              </div>
            </div>

            <div className="flex items-end ml-auto">
              <Button 
                onClick={handleGenerate} 
                disabled={generateMutation.isPending || !selectedCountry}
                className="gap-2"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Generated Holidays Preview */}
        {isConfigured && (
          <div className="flex-1 min-h-0 flex flex-col">
            {generatedHolidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No holidays generated yet</p>
                <p className="text-sm">Select a country and year, then click Generate</p>
              </div>
            ) : (
              <>
                {/* Select All Header */}
                <div className="flex items-center gap-3 py-3 border-b">
                  <Checkbox
                    checked={selectedHolidays.size === generatedHolidays.length}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedHolidays.size === generatedHolidays.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {selectedHolidays.size} of {generatedHolidays.length} selected
                  </span>
                </div>

                {/* Scrollable Holiday List */}
                <div className="flex-1 overflow-hidden -mx-6">
                  <ScrollArea className="h-[350px] px-6">
                    <div className="space-y-2 py-4 pr-4">
                      {generatedHolidays.map((holiday, index) => (
                        <div
                          key={index}
                          onClick={() => toggleHoliday(index)}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedHolidays.has(index)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedHolidays.has(index)}
                              onCheckedChange={() => toggleHoliday(index)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{holiday.name}</span>
                                <Badge className={HOLIDAY_TYPE_COLORS[holiday.type]}>
                                  {holiday.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(holiday.date)}</span>
                              </div>
                              {holiday.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {holiday.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={importMutation.isPending || selectedHolidays.size === 0 || !isConfigured}
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Import {selectedHolidays.size > 0 ? `(${selectedHolidays.size})` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
