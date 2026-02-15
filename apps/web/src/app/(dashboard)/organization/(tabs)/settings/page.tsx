'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganizationContext } from '../../layout';
import { useEmployeeCodeSettings } from '../../hooks/useEmployeeCodeSettings';
import { useLeaveTypes, useUpdateLeaveType, LeaveType } from '@/hooks/use-attendance';
import { Loader2, Globe, Calendar, Clock, Coins, Save, RotateCcw, Hash, Eye, Palmtree, PartyPopper } from 'lucide-react';
import { DATE_FORMATS, TIME_FORMATS, CURRENCIES, TIMEZONES, formatDate, formatCurrency, formatTime } from '@/lib/format';
import { toast } from 'sonner';

// Local state type for leave type edits
interface LeaveTypeEdit {
  defaultDaysPerYear: number;
  carryForwardAllowed: boolean;
  maxCarryForwardDays: number | null;
  isActive: boolean;
}

export default function OrganizationSettingsPage() {
  const {
    orgSettingsForm,
    orgSettingsErrors,
    loadingSettings,
    savingSettings,
    saveOrgSettings,
    saveRegionalSettings,
    saveWorkingEnvironmentSettings,
    updateOrgSettingsField,
    resetOrgSettingsForm,
    resetRegionalSettings,
    resetWorkingEnvironmentSettings,
  } = useOrganizationContext();

  // Employee Code Settings hook
  const empCodeSettings = useEmployeeCodeSettings();
  
  // Leave Types hook - get all leave types including inactive
  const { data: leaveTypesData, isLoading: loadingLeaveTypes } = useLeaveTypes(false);
  const leaveTypes = (leaveTypesData as any)?.data || leaveTypesData || [];
  const updateLeaveTypeMutation = useUpdateLeaveType();
  
  // Local state for leave type edits (batch save)
  const [leaveTypeEdits, setLeaveTypeEdits] = useState<Record<string, LeaveTypeEdit>>({});
  
  // Initialize local edits when leave types load
  useEffect(() => {
    if (leaveTypes.length > 0 && Object.keys(leaveTypeEdits).length === 0) {
      const edits: Record<string, LeaveTypeEdit> = {};
      leaveTypes.forEach((lt: LeaveType) => {
        edits[lt.id] = {
          defaultDaysPerYear: lt.defaultDaysPerYear,
          carryForwardAllowed: lt.carryForwardAllowed,
          maxCarryForwardDays: lt.maxCarryForwardDays ?? null,
          isActive: lt.isActive,
        };
      });
      setLeaveTypeEdits(edits);
    }
  }, [leaveTypes]);
  
  // Update local leave type edit
  const updateLeaveTypeEdit = (id: string, field: keyof LeaveTypeEdit, value: any) => {
    setLeaveTypeEdits(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      }
    }));
  };
  
  // Get current value for a leave type (from edits or original)
  const getLeaveTypeValue = (lt: LeaveType, field: keyof LeaveTypeEdit) => {
    if (leaveTypeEdits[lt.id]) {
      return leaveTypeEdits[lt.id][field];
    }
    return lt[field];
  };
  
  // Check if there are unsaved leave type changes
  const hasLeaveTypeChanges = () => {
    return leaveTypes.some((lt: LeaveType) => {
      const edit = leaveTypeEdits[lt.id];
      if (!edit) return false;
      return (
        edit.defaultDaysPerYear !== lt.defaultDaysPerYear ||
        edit.carryForwardAllowed !== lt.carryForwardAllowed ||
        edit.maxCarryForwardDays !== (lt.maxCarryForwardDays ?? null) ||
        edit.isActive !== lt.isActive
      );
    });
  };
  
  // Save all leave type changes
  const saveLeaveTypeChanges = async () => {
    const changedTypes = leaveTypes.filter((lt: LeaveType) => {
      const edit = leaveTypeEdits[lt.id];
      if (!edit) return false;
      return (
        edit.defaultDaysPerYear !== lt.defaultDaysPerYear ||
        edit.carryForwardAllowed !== lt.carryForwardAllowed ||
        edit.maxCarryForwardDays !== (lt.maxCarryForwardDays ?? null) ||
        edit.isActive !== lt.isActive
      );
    });
    
    for (const lt of changedTypes) {
      const edit = leaveTypeEdits[lt.id];
      await updateLeaveTypeMutation.mutateAsync({
        id: lt.id,
        data: {
          defaultDaysPerYear: edit.defaultDaysPerYear,
          carryForwardAllowed: edit.carryForwardAllowed,
          maxCarryForwardDays: edit.carryForwardAllowed && edit.maxCarryForwardDays != null ? edit.maxCarryForwardDays : undefined,
          isActive: edit.isActive,
        }
      });
    }
    
    if (changedTypes.length > 0) {
      toast.success(`Updated ${changedTypes.length} leave type(s)`);
    }
  };
  
  // Fetch employee code settings on mount
  useEffect(() => {
    empCodeSettings.fetchSettings();
    empCodeSettings.fetchPreview();
  }, []);

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
      {/* Employee Code Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Employee Code Settings
          </CardTitle>
          <CardDescription>
            Configure how employee codes are automatically generated.
            Format: <code className="bg-muted px-1 rounded">{'{PREFIX}-{YYYY}-{YEAR_SEQ}-{TOTAL_SEQ}'}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Generate Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Generate Employee Codes</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, employee codes will be automatically generated when adding new employees.
              </p>
            </div>
            <Switch
              checked={empCodeSettings.settingsForm.autoGenerate}
              onCheckedChange={(checked) => empCodeSettings.updateFormField('autoGenerate', checked)}
            />
          </div>

          {empCodeSettings.settingsForm.autoGenerate && (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Prefix */}
                <div className="space-y-2">
                  <Label htmlFor="empCodePrefix">Prefix</Label>
                  <Input
                    id="empCodePrefix"
                    value={empCodeSettings.settingsForm.prefix}
                    onChange={(e) => empCodeSettings.updateFormField('prefix', e.target.value.toUpperCase())}
                    placeholder="e.g., EMP, SQ, ABC"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Organization prefix (max 10 characters)
                  </p>
                </div>

                {/* Separator */}
                <div className="space-y-2">
                  <Label htmlFor="empCodeSeparator">Separator</Label>
                  <Select
                    value={empCodeSettings.settingsForm.separator || 'none'}
                    onValueChange={(value) => empCodeSettings.updateFormField('separator', value === 'none' ? '' : value as '-' | '_' | '')}
                  >
                    <SelectTrigger id="empCodeSeparator">
                      <SelectValue placeholder="Select separator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">Hyphen (-)</SelectItem>
                      <SelectItem value="_">Underscore (_)</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Sequence Digits */}
                <div className="space-y-2">
                  <Label htmlFor="yearSeqDigits">Year Sequence Digits</Label>
                  <Select
                    value={String(empCodeSettings.settingsForm.yearSeqDigits)}
                    onValueChange={(value) => empCodeSettings.updateFormField('yearSeqDigits', parseInt(value))}
                  >
                    <SelectTrigger id="yearSeqDigits">
                      <SelectValue placeholder="Select digits" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 digits (001)</SelectItem>
                      <SelectItem value="4">4 digits (0001)</SelectItem>
                      <SelectItem value="5">5 digits (00001)</SelectItem>
                      <SelectItem value="6">6 digits (000001)</SelectItem>
                      <SelectItem value="7">7 digits (0000001)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Count of employees joined in the current year
                  </p>
                </div>

                {/* Total Sequence Digits */}
                <div className="space-y-2">
                  <Label htmlFor="totalSeqDigits">Total Sequence Digits</Label>
                  <Select
                    value={String(empCodeSettings.settingsForm.totalSeqDigits)}
                    onValueChange={(value) => empCodeSettings.updateFormField('totalSeqDigits', parseInt(value))}
                  >
                    <SelectTrigger id="totalSeqDigits">
                      <SelectValue placeholder="Select digits" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 digits (001)</SelectItem>
                      <SelectItem value="4">4 digits (0001)</SelectItem>
                      <SelectItem value="5">5 digits (00001)</SelectItem>
                      <SelectItem value="6">6 digits (000001)</SelectItem>
                      <SelectItem value="7">7 digits (0000001)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Total count of all employees in the organization
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <h4 className="font-medium text-sm">Next Employee Code Preview</h4>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="text-lg font-mono px-4 py-2">
                    {empCodeSettings.generateLivePreview()}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">{empCodeSettings.settingsForm.prefix}</span> = Prefix
                    {empCodeSettings.settingsForm.separator && (
                      <span> • <span className="font-medium">{empCodeSettings.settingsForm.separator}</span> = Separator</span>
                    )}
                  </p>
                  <p>
                    <span className="font-medium">{new Date().getFullYear()}</span> = Current Year
                    • <span className="font-medium">{String(empCodeSettings.preview?.breakdown.yearSequence || 1).padStart(empCodeSettings.settingsForm.yearSeqDigits, '0')}</span> = {empCodeSettings.preview?.breakdown.yearSequence || 1}st employee this year
                    • <span className="font-medium">{String(empCodeSettings.preview?.breakdown.totalSequence || 1).padStart(empCodeSettings.settingsForm.totalSeqDigits, '0')}</span> = {empCodeSettings.preview?.breakdown.totalSequence || 1}st employee total
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons for Employee Code Settings */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={empCodeSettings.resetForm}
              disabled={empCodeSettings.saving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={empCodeSettings.saveSettings} 
              disabled={empCodeSettings.saving}
            >
              {empCodeSettings.saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Employee Code Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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

          {/* Action Buttons for Regional Settings */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={resetRegionalSettings} disabled={savingSettings}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={saveRegionalSettings} disabled={savingSettings}>
              {savingSettings ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Regional Settings
                </>
              )}
            </Button>
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
            Configure working hours for each day of the week. Set half-days and holidays for weekends.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Weekly Working Hours Configuration */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
                <div className="col-span-2">Day</div>
                <div className="col-span-2 text-center">Working Day</div>
                <div className="col-span-2 text-center">Half Day</div>
                <div className="col-span-3 text-center">Start Time</div>
                <div className="col-span-3 text-center">End Time</div>
              </div>
              
              {[
                { key: 'sunday', label: 'Sunday' },
                { key: 'monday', label: 'Monday' },
                { key: 'tuesday', label: 'Tuesday' },
                { key: 'wednesday', label: 'Wednesday' },
                { key: 'thursday', label: 'Thursday' },
                { key: 'friday', label: 'Friday' },
                { key: 'saturday', label: 'Saturday' },
              ].map(({ key, label }) => {
                const dayKey = key as keyof typeof orgSettingsForm.weeklyWorkingHours;
                const daySettings = orgSettingsForm.weeklyWorkingHours?.[dayKey] || {
                  isWorkingDay: key !== 'sunday' && key !== 'saturday',
                  isHalfDay: false,
                  startTime: '09:00',
                  endTime: '18:00',
                };
                
                const updateDaySettings = (updates: Partial<typeof daySettings>) => {
                  const currentWeekly = orgSettingsForm.weeklyWorkingHours || {
                    sunday: { isWorkingDay: false, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
                    monday: { isWorkingDay: true, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
                    tuesday: { isWorkingDay: true, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
                    wednesday: { isWorkingDay: true, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
                    thursday: { isWorkingDay: true, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
                    friday: { isWorkingDay: true, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
                    saturday: { isWorkingDay: false, isHalfDay: false, startTime: '09:00', endTime: '18:00' },
                  };
                  const currentDaySettings = currentWeekly[dayKey] as Record<string, unknown> || {};
                  updateOrgSettingsField('weeklyWorkingHours', {
                    ...currentWeekly,
                    [dayKey]: {
                      ...currentDaySettings,
                      ...updates,
                    },
                  });
                };
                
                return (
                  <div 
                    key={key} 
                    className={`grid grid-cols-12 gap-2 items-center py-2 ${
                      !daySettings.isWorkingDay ? 'bg-muted/30 rounded-md px-2 -mx-2' : ''
                    }`}
                  >
                    <div className="col-span-2 font-medium">{label}</div>
                    <div className="col-span-2 flex justify-center">
                      <Switch
                        checked={daySettings.isWorkingDay}
                        onCheckedChange={(checked) => {
                          if (!checked) {
                            // When disabling working day, also disable half day
                            updateDaySettings({ isWorkingDay: false, isHalfDay: false });
                          } else {
                            updateDaySettings({ isWorkingDay: true });
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <Switch
                        checked={daySettings.isHalfDay}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            // When enabling half day, set end time to 13:00
                            updateDaySettings({ isHalfDay: true, endTime: '13:00' });
                          } else {
                            // When disabling half day, set end time to 18:00
                            updateDaySettings({ isHalfDay: false, endTime: '18:00' });
                          }
                        }}
                        disabled={!daySettings.isWorkingDay}
                      />
                    </div>
                    <div className="col-span-3">
                      <Select
                        value={daySettings.startTime}
                        onValueChange={(value) => updateDaySettings({ startTime: value })}
                        disabled={!daySettings.isWorkingDay}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
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
                    <div className="col-span-3">
                      <Select
                        value={daySettings.endTime}
                        onValueChange={(value) => updateDaySettings({ endTime: value })}
                        disabled={!daySettings.isWorkingDay}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
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
                );
              })}
            </div>
          </div>

          {/* Leave Calculation Settings */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Calculation Settings
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure how leave days are calculated based on holidays and weekends.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exclude Holidays from Leave Count</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, declared holidays (from Holidays page) will not be counted in leave duration.
                  </p>
                </div>
                <Switch
                  checked={orgSettingsForm.excludeHolidaysFromLeave ?? true}
                  onCheckedChange={(checked) => updateOrgSettingsField('excludeHolidaysFromLeave', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exclude Non-Working Days from Leave Count</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, non-working days (weekends/holidays as per weekly schedule above) will not be counted.
                  </p>
                </div>
                <Switch
                  checked={orgSettingsForm.excludeWeekendsFromLeave ?? true}
                  onCheckedChange={(checked) => updateOrgSettingsField('excludeWeekendsFromLeave', checked)}
                />
              </div>
            </div>
          </div>

          {/* Holiday Types Configuration */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <PartyPopper className="h-5 w-5" />
              Holiday Types
            </h3>
            <p className="text-sm text-muted-foreground">
              Enable or disable holiday types that your organization provides. Only enabled types will be available when creating holidays.
            </p>
            
            <div className="flex flex-wrap gap-3">
              {/* Public Holiday */}
              <Badge
                variant={orgSettingsForm.enabledHolidayTypes?.public !== false ? 'default' : 'outline'}
                className={`cursor-pointer px-4 py-2 text-sm transition-all ${
                  orgSettingsForm.enabledHolidayTypes?.public !== false
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'hover:bg-rose-50 text-muted-foreground'
                }`}
                onClick={() => {
                  const current = orgSettingsForm.enabledHolidayTypes || { public: true, optional: true, restricted: true };
                  updateOrgSettingsField('enabledHolidayTypes', {
                    ...current,
                    public: !current.public,
                  });
                }}
              >
                {orgSettingsForm.enabledHolidayTypes?.public !== false ? '✓ ' : ''}Public Holiday
              </Badge>

              {/* Optional Holiday */}
              <Badge
                variant={orgSettingsForm.enabledHolidayTypes?.optional !== false ? 'default' : 'outline'}
                className={`cursor-pointer px-4 py-2 text-sm transition-all ${
                  orgSettingsForm.enabledHolidayTypes?.optional !== false
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'hover:bg-yellow-50 text-muted-foreground'
                }`}
                onClick={() => {
                  const current = orgSettingsForm.enabledHolidayTypes || { public: true, optional: true, restricted: true };
                  updateOrgSettingsField('enabledHolidayTypes', {
                    ...current,
                    optional: !current.optional,
                  });
                }}
              >
                {orgSettingsForm.enabledHolidayTypes?.optional !== false ? '✓ ' : ''}Optional Holiday
              </Badge>

              {/* Restricted Holiday */}
              <Badge
                variant={orgSettingsForm.enabledHolidayTypes?.restricted !== false ? 'default' : 'outline'}
                className={`cursor-pointer px-4 py-2 text-sm transition-all ${
                  orgSettingsForm.enabledHolidayTypes?.restricted !== false
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'hover:bg-orange-50 text-muted-foreground'
                }`}
                onClick={() => {
                  const current = orgSettingsForm.enabledHolidayTypes || { public: true, optional: true, restricted: true };
                  updateOrgSettingsField('enabledHolidayTypes', {
                    ...current,
                    restricted: !current.restricted,
                  });
                }}
              >
                {orgSettingsForm.enabledHolidayTypes?.restricted !== false ? '✓ ' : ''}Restricted Holiday
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              Click on a chip to enable/disable that holiday type. Changes will be reflected in the Holidays page.
            </p>
            
            {/* Optional Holiday Quota - only show when optional holidays are enabled */}
            {orgSettingsForm.enabledHolidayTypes?.optional !== false && (
              <div className="flex items-center justify-between mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Optional Holiday Quota</Label>
                  <p className="text-sm text-muted-foreground">
                    Maximum number of optional holidays each employee can avail per year.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={orgSettingsForm.optionalHolidayQuota ?? 2}
                    onChange={(e) => updateOrgSettingsField('optionalHolidayQuota', parseInt(e.target.value) || 2)}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">per year</span>
                </div>
              </div>
            )}
          </div>

          {/* Leave Types Configuration */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Palmtree className="h-5 w-5" />
              Leave Types & Policies
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure leave types, annual quotas, and carry forward policies. All changes will be saved when you click "Save Working Environment".
            </p>
            
            {loadingLeaveTypes ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : leaveTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No leave types configured yet.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
                  <div className="col-span-4">Leave Type</div>
                  <div className="col-span-2 text-center">Status</div>
                  <div className="col-span-2 text-center">Days/Year</div>
                  <div className="col-span-4 text-center">Carry Forward</div>
                </div>
                
                {/* Leave Type Rows */}
                {leaveTypes.map((lt: LeaveType, index: number) => {
                  const isActive = getLeaveTypeValue(lt, 'isActive') as boolean;
                  const carryForward = getLeaveTypeValue(lt, 'carryForwardAllowed') as boolean;
                  const daysPerYear = getLeaveTypeValue(lt, 'defaultDaysPerYear') as number;
                  const maxCarryDays = getLeaveTypeValue(lt, 'maxCarryForwardDays') as number | null;
                  
                  return (
                    <div 
                      key={lt.id}
                      className={`grid grid-cols-12 gap-4 px-4 py-3 items-center transition-all ${
                        index !== leaveTypes.length - 1 ? 'border-b' : ''
                      } ${!isActive ? 'bg-muted/30 opacity-60' : 'bg-background'}`}
                    >
                      {/* Leave Type Name */}
                      <div className="col-span-4 flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: lt.color || '#3B82F6' }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{lt.name}</span>
                            <Badge variant="secondary" className="text-xs">{lt.code}</Badge>
                            {!lt.isPaid && <Badge variant="outline" className="text-xs text-orange-600">Unpaid</Badge>}
                          </div>
                        </div>
                      </div>

                      {/* Status Toggle */}
                      <div className="col-span-2 flex justify-center items-center gap-2">
                        <Switch
                          checked={isActive}
                          onCheckedChange={(checked) => updateLeaveTypeEdit(lt.id, 'isActive', checked)}
                        />
                        <span className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Days Per Year */}
                      <div className="col-span-2 flex justify-center">
                        <Input
                          type="number"
                          min={0}
                          max={365}
                          value={daysPerYear}
                          onChange={(e) => updateLeaveTypeEdit(lt.id, 'defaultDaysPerYear', parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-center text-sm"
                          disabled={!isActive}
                        />
                      </div>

                      {/* Carry Forward */}
                      <div className="col-span-4 flex justify-center items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={carryForward}
                            onCheckedChange={(checked) => {
                              updateLeaveTypeEdit(lt.id, 'carryForwardAllowed', checked);
                              if (checked && !maxCarryDays) {
                                updateLeaveTypeEdit(lt.id, 'maxCarryForwardDays', daysPerYear);
                              }
                            }}
                            disabled={!isActive}
                          />
                          <span className={`text-xs font-medium w-16 ${carryForward ? 'text-blue-600' : 'text-muted-foreground'}`}>
                            {carryForward ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        {carryForward && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Max:</span>
                            <Input
                              type="number"
                              min={0}
                              max={daysPerYear}
                              value={maxCarryDays || 0}
                              onChange={(e) => updateLeaveTypeEdit(lt.id, 'maxCarryForwardDays', parseInt(e.target.value) || 0)}
                              className="w-14 h-7 text-center text-xs"
                              disabled={!isActive}
                            />
                            <span className="text-xs text-muted-foreground">days</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              💡 Tip: Set annual quota to 0 for unlimited leave types like "Leave Without Pay". Carry forward allows unused leaves to roll over to next year.
            </p>
          </div>

          {/* Action Buttons for Working Environment Settings */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={resetWorkingEnvironmentSettings} disabled={savingSettings}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={async () => {
                await saveLeaveTypeChanges();
                await saveWorkingEnvironmentSettings();
              }} 
              disabled={savingSettings || updateLeaveTypeMutation.isPending}
            >
              {(savingSettings || updateLeaveTypeMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Working Environment
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bottom spacing to match space-y-6 standard */}
      <div className="h-6" />
    </div>
  );
}
