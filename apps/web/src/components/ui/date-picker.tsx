"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useOrgSettings } from "@/hooks/use-org-settings"

// Convert org date format to date-fns format
const dateFormatMap: Record<string, string> = {
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
  'DD-MM-YYYY': 'dd-MM-yyyy',
  'DD.MM.YYYY': 'dd.MM.yyyy',
}

interface DatePickerProps {
  value?: string | Date
  onChange?: (date: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  error?: boolean
  id?: string
  /** Min date for the picker */
  minDate?: Date
  /** Max date for the picker */
  maxDate?: Date
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  error,
  id,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const orgSettings = useOrgSettings()
  
  // Get date-fns format from org settings
  const dateFormat = dateFormatMap[orgSettings.dateFormat] || 'dd/MM/yyyy'
  
  // Parse the value to Date object
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    // Try parsing as ISO date first (YYYY-MM-DD)
    const isoDate = new Date(value)
    if (!isNaN(isoDate.getTime())) return isoDate
    return undefined
  }, [value])
  
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Return as ISO format for form handling
      onChange?.(format(date, 'yyyy-MM-dd'))
    } else {
      onChange?.(undefined)
    }
    setOpen(false)
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            error && "border-destructive",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, dateFormat) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate}
          disabled={(date) => {
            if (minDate && date < minDate) return true
            if (maxDate && date > maxDate) return true
            return false
          }}
          captionLayout="dropdown"
          fromYear={1940}
          toYear={new Date().getFullYear()}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
