'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganizationContext } from '../../layout';
import { Loader2, Globe, Calendar, Clock, Coins, Save, RotateCcw } from 'lucide-react';
import { DATE_FORMATS, TIME_FORMATS, CURRENCIES, TIMEZONES, formatDate, formatCurrency, formatTime } from '@/lib/format';

export default function OrganizationSettingsPage() {
  const {
    orgSettingsForm,
    orgSettingsErrors,
    loadingSettings,
    savingSettings,
    saveOrgSettings,
    updateOrgSettingsField,
    resetOrgSettingsForm,
  } = useOrganizationContext();

  // Preview date for format examples
  const previewDate = new Date();

  if (loadingSettings) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Locale Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regional Settings
          </CardTitle>
          <CardDescription>
            Configure the default timezone, date format, time format, and currency for your organization.
            These settings will be used across all modules and reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timezone
              </Label>
              <Select
                value={orgSettingsForm.timezone}
                onValueChange={(value) => updateOrgSettingsField('timezone', value)}
              >
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {orgSettingsErrors.timezone && (
                <p className="text-sm text-destructive">{orgSettingsErrors.timezone}</p>
              )}
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency" className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Currency
              </Label>
              <Select
                value={orgSettingsForm.currency}
                onValueChange={(value) => updateOrgSettingsField('currency', value)}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <span className="flex items-center gap-2">
                        <span className="w-6 text-center font-medium">{currency.symbol}</span>
                        <span>{currency.name} ({currency.code})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {orgSettingsErrors.currency && (
                <p className="text-sm text-destructive">{orgSettingsErrors.currency}</p>
              )}
            </div>

            {/* Date Format */}
            <div className="space-y-2">
              <Label htmlFor="dateFormat" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Format
              </Label>
              <Select
                value={orgSettingsForm.dateFormat}
                onValueChange={(value) => updateOrgSettingsField('dateFormat', value)}
              >
                <SelectTrigger id="dateFormat">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {orgSettingsErrors.dateFormat && (
                <p className="text-sm text-destructive">{orgSettingsErrors.dateFormat}</p>
              )}
            </div>

            {/* Time Format */}
            <div className="space-y-2">
              <Label htmlFor="timeFormat" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Format
              </Label>
              <Select
                value={orgSettingsForm.timeFormat}
                onValueChange={(value) => updateOrgSettingsField('timeFormat', value as '12h' | '24h')}
              >
                <SelectTrigger id="timeFormat">
                  <SelectValue placeholder="Select time format" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {orgSettingsErrors.timeFormat && (
                <p className="text-sm text-destructive">{orgSettingsErrors.timeFormat}</p>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <h4 className="font-medium text-sm">Preview with current settings</h4>
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div>
                <span className="text-muted-foreground">Date: </span>
                <span className="font-medium">
                  {formatDate(previewDate, {
                    timezone: orgSettingsForm.timezone,
                    dateFormat: orgSettingsForm.dateFormat,
                  })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Time: </span>
                <span className="font-medium">
                  {formatTime(previewDate, {
                    timezone: orgSettingsForm.timezone,
                    timeFormat: orgSettingsForm.timeFormat,
                  })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Currency: </span>
                <span className="font-medium">
                  {formatCurrency(125000, { currency: orgSettingsForm.currency })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours (Optional - can be expanded later) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Working Hours
          </CardTitle>
          <CardDescription>
            Set the standard working hours for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workStartTime">Work Start Time</Label>
              <Select
                value={orgSettingsForm.workStartTime}
                onValueChange={(value) => updateOrgSettingsField('workStartTime', value)}
              >
                <SelectTrigger id="workStartTime">
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0');
                    return (
                      <SelectItem key={hour} value={`${hour}:00`}>
                        {hour}:00
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workEndTime">Work End Time</Label>
              <Select
                value={orgSettingsForm.workEndTime}
                onValueChange={(value) => updateOrgSettingsField('workEndTime', value)}
              >
                <SelectTrigger id="workEndTime">
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0');
                    return (
                      <SelectItem key={hour} value={`${hour}:00`}>
                        {hour}:00
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={resetOrgSettingsForm}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button onClick={saveOrgSettings} disabled={savingSettings}>
          {savingSettings ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
