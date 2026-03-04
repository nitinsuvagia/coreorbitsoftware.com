"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

interface MonthPickerProps {
  value?: string // "MMM YYYY" format
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  error?: boolean
  id?: string
  /** Maximum selectable date (months after this are disabled) */
  maxDate?: Date
}

export function MonthPicker({
  value,
  onChange,
  placeholder = "Select month",
  disabled,
  className,
  error,
  id,
  maxDate,
}: MonthPickerProps) {
  const maxMonth = maxDate ? maxDate.getMonth() : undefined
  const maxYear = maxDate ? maxDate.getFullYear() : undefined
  const [open, setOpen] = React.useState(false)
  
  // Parse value to get month and year
  const parsedValue = React.useMemo(() => {
    if (!value) return null
    const match = value.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/)
    if (match) {
      return {
        month: MONTHS.indexOf(match[1]),
        year: parseInt(match[2])
      }
    }
    return null
  }, [value])
  
  const [viewYear, setViewYear] = React.useState(() => {
    return parsedValue?.year || new Date().getFullYear()
  })
  
  const handleMonthSelect = (monthIndex: number) => {
    const formatted = `${MONTHS[monthIndex]} ${viewYear}`
    onChange?.(formatted)
    setOpen(false)
  }
  
  const handlePrevYear = () => setViewYear(y => y - 1)
  const handleNextYear = () => {
    if (maxYear !== undefined && viewYear >= maxYear) return
    setViewYear(y => y + 1)
  }
  
  // Reset view year when opening
  React.useEffect(() => {
    if (open) {
      setViewYear(parsedValue?.year || new Date().getFullYear())
    }
  }, [open, parsedValue?.year])
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            error && "border-destructive",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        {/* Year Navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrevYear}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">{viewYear}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNextYear}
            disabled={maxYear !== undefined && viewYear >= maxYear}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Month Grid */}
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month, index) => {
            const isSelected = parsedValue?.month === index && parsedValue?.year === viewYear
            const isFuture = maxYear !== undefined && maxMonth !== undefined &&
              (viewYear > maxYear || (viewYear === maxYear && index > maxMonth))
            return (
              <Button
                key={month}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-9",
                  isSelected && "bg-primary text-primary-foreground",
                  isFuture && "opacity-40 cursor-not-allowed"
                )}
                onClick={() => !isFuture && handleMonthSelect(index)}
                disabled={isFuture}
              >
                {month}
              </Button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
