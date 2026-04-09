import { useRef, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { ChevronLeft, ChevronRight, Calendar, Plus, Search, Filter, MoreHorizontal, Brain, BarChart3, Upload, Download, Printer, X, FilterX } from 'lucide-react'
import type { CalendarView } from '../../types/calendar'
import { useCalendarStore } from '../../stores/calendarStore'
import { formatCalendarViewTitle } from '../../lib/calendar-utils'
import { Input } from '../ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '../../lib/utils'
import { format as formatDate } from 'date-fns'
import { toast } from 'sonner'

interface CalendarHeaderProps {
  onCreateEvent: () => void
  onShowFilters: () => void
  onShowSettings: () => void
  onShowSchedulingAssistant: () => void
  onShowAnalytics: () => void
  showAnalytics: boolean
}

export function CalendarHeader({
  onCreateEvent,
  onShowFilters,
  onShowSettings,
  onShowSchedulingAssistant,
  onShowAnalytics,
  showAnalytics
}: CalendarHeaderProps) {
  const intl = useIntl()

  const {
    currentView,
    currentDate,
    setCurrentView,
    navigatePrevious,
    navigateNext,
    navigateToToday,
    updateFilters,
    resetFilters,
    filters,
    events,
    categories
  } = useCalendarStore()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
    { value: 'day', label: intl.formatMessage({ id: 'modules.calendar.header.viewDay' }) },
    { value: 'week', label: intl.formatMessage({ id: 'modules.calendar.header.viewWeek' }) },
    { value: 'month', label: intl.formatMessage({ id: 'modules.calendar.header.viewMonth' }) },
    { value: 'year', label: intl.formatMessage({ id: 'modules.calendar.header.viewYear' }) },
    { value: 'agenda', label: intl.formatMessage({ id: 'modules.calendar.header.viewAgenda' }) },
    { value: 'timeline', label: intl.formatMessage({ id: 'modules.calendar.header.viewTimeline' }) },
  ]

  // Helper function to check if any filters are active
  const hasActiveFilters = () => {
    return (
      filters.categories.length > 0 ||
      filters.priorities?.length > 0 ||
      filters.searchQuery?.trim() ||
      filters.dateRange ||
      (filters.tags?.length || 0) > 0 ||
      (filters.attendees?.length || 0) > 0
    )
  }

  // Get active filter count for badge
  const getActiveFilterCount = () => {
    let count = 0
    if (filters.categories.length > 0) count++
    if (filters.priorities?.length > 0) count++
    if (filters.searchQuery?.trim()) count++
    if (filters.dateRange) count++
    if ((filters.tags?.length || 0) > 0) count++
    if ((filters.attendees?.length || 0) > 0) count++
    return count
  }

  // Handle clearing all filters
  const handleClearAllFilters = () => {
    resetFilters()
    toast.success(intl.formatMessage({ id: 'modules.calendar.header.filtersClearedSuccess' }))
  }

  // Debounced search to avoid too many API calls
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined)
  
  const handleSearchChange = useCallback((value: string) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    // Set new timer for 300ms delay
    debounceTimer.current = setTimeout(() => {
      updateFilters({ searchQuery: value })
    }, 300)
  }, [updateFilters])

  const handleImportCalendar = () => {
    fileInputRef.current?.click()
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileType = file.name.split('.').pop()?.toLowerCase()

    if (fileType !== 'ics' && fileType !== 'csv' && fileType !== 'json') {
      toast.error(intl.formatMessage({ id: 'modules.calendar.header.importInvalidFileType' }))
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        
        if (fileType === 'json') {
          const importedData = JSON.parse(content)
          if (importedData.events && Array.isArray(importedData.events)) {
            toast.success(intl.formatMessage({ id: 'modules.calendar.header.importSuccessEvents' }, { count: importedData.events.length }))
          } else {
            toast.error(intl.formatMessage({ id: 'modules.calendar.header.importInvalidJson' }))
          }
        } else if (fileType === 'ics') {
          const eventCount = (content.match(/BEGIN:VEVENT/g) || []).length
          toast.success(intl.formatMessage({ id: 'modules.calendar.header.importSuccessIcs' }, { count: eventCount }))
        } else if (fileType === 'csv') {
          const lines = content.split('\n').filter(line => line.trim())
          const eventCount = Math.max(0, lines.length - 1)
          toast.success(intl.formatMessage({ id: 'modules.calendar.header.importSuccessCsv' }, { count: eventCount }))
        }
      } catch (error) {
        toast.error(intl.formatMessage({ id: 'modules.calendar.header.importError' }))
        console.error('Import error:', error)
      }
    }

    reader.readAsText(file)
    if (event.target) {
      event.target.value = ''
    }
  }

  const handleExportCalendar = (format: 'ics' | 'csv' | 'json') => {
    try {
      let content = ''
      let filename = `calendar-export-${formatDate(new Date(), 'yyyy-MM-dd')}`
      let mimeType = ''

      if (format === 'json') {
        const exportData = {
          exportDate: new Date().toISOString(),
          calendarName: 'Deskive Calendar',
          events: events.map(event => ({
            ...event,
            category: categories.find(c => c.id === event.categoryId)?.name || 'Uncategorized'
          })),
          categories: categories
        }
        content = JSON.stringify(exportData, null, 2)
        filename += '.json'
        mimeType = 'application/json'
      } else if (format === 'ics') {
        content = generateICSContent(events)
        filename += '.ics'
        mimeType = 'text/calendar'
      } else if (format === 'csv') {
        content = generateCSVContent(events, categories)
        filename += '.csv'
        mimeType = 'text/csv'
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(intl.formatMessage({ id: 'modules.calendar.header.exportSuccess' }, { format: format.toUpperCase() }))
    } catch (error) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.header.exportError' }))
      console.error('Export error:', error)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.header.printError' }))
      return
    }

    const printContent = generatePrintContent(events, currentView, currentDate, categories)
    
    printWindow.document.write(printContent)
    printWindow.document.close()
    
    printWindow.onload = () => {
      printWindow.print()
      printWindow.onafterprint = () => {
        printWindow.close()
      }
    }
  }

  const generateICSContent = (events: any[]) => {
    const icsEvents = events.map(event => {
      const startDate = formatDate(new Date(event.startTime), "yyyyMMdd'T'HHmmss")
      const endDate = formatDate(new Date(event.endTime), "yyyyMMdd'T'HHmmss")
      
      return `BEGIN:VEVENT
UID:${event.id}@deskive.com
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${typeof event.location === 'string' ? event.location : event.location?.name || ''}
STATUS:${event.status.toUpperCase()}
PRIORITY:${event.priority === 'urgent' ? 1 : event.priority === 'high' ? 2 : event.priority === 'normal' ? 3 : 4}
END:VEVENT`
    }).join('\n')

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Deskive//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${icsEvents}
END:VCALENDAR`
  }

  const generateCSVContent = (events: any[], categories: any[]) => {
    const headers = [
      intl.formatMessage({ id: 'modules.calendar.header.csvHeaderTitle' }),
      intl.formatMessage({ id: 'modules.calendar.header.csvHeaderStartDate' }),
      intl.formatMessage({ id: 'modules.calendar.header.csvHeaderStartTime' }),
      intl.formatMessage({ id: 'modules.calendar.header.csvHeaderEndDate' }),
      intl.formatMessage({ id: 'modules.calendar.header.csvHeaderEndTime' }),
      intl.formatMessage({ id: 'modules.calendar.header.csvHeaderCategory' }),
      intl.formatMessage({ id: 'modules.calendar.header.csvHeaderPriority' }),
      intl.formatMessage({ id: 'modules.calendar.header.csvHeaderStatus' }),
      intl.formatMessage({ id: 'modules.calendar.header.csvHeaderLocation' }),
      intl.formatMessage({ id: 'modules.calendar.header.csvHeaderDescription' })
    ]
    const rows = events.map(event => {
      const startDate = new Date(event.startTime)
      const endDate = new Date(event.endTime)
      const category = categories.find(c => c.id === event.categoryId)?.name || 'Uncategorized'
      
      return [
        event.title,
        formatDate(startDate, 'yyyy-MM-dd'),
        formatDate(startDate, 'HH:mm'),
        formatDate(endDate, 'yyyy-MM-dd'),
        formatDate(endDate, 'HH:mm'),
        category,
        event.priority,
        event.status,
        typeof event.location === 'string' ? event.location : event.location?.name || '',
        event.description || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`)
    })

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
  }

  const generatePrintContent = (events: any[], view: CalendarView, date: Date, categories: any[]) => {
    const title = formatCalendarViewTitle(view, date)
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    const eventsList = sortedEvents.map(event => {
      const category = categories.find(c => c.id === event.categoryId)
      return `
        <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          <h3 style="margin: 0 0 5px 0; color: ${category?.color || '#333'};">${event.title}</h3>
          <p style="margin: 5px 0; font-size: 14px;">
            <strong>Date:</strong> ${formatDate(new Date(event.startTime), 'PPP')} <br>
            <strong>Time:</strong> ${formatDate(new Date(event.startTime), 'p')} - ${formatDate(new Date(event.endTime), 'p')} <br>
            ${event.location ? `<strong>Location:</strong> ${typeof event.location === 'string' ? event.location : event.location.name} <br>` : ''}
            ${event.description ? `<strong>Description:</strong> ${event.description} <br>` : ''}
            <strong>Category:</strong> ${category?.name || 'Uncategorized'} <br>
            <strong>Priority:</strong> ${event.priority}
          </p>
        </div>
      `
    }).join('')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Deskive Calendar</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            @media print {
              body { margin: 10mm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p style="margin-bottom: 20px;">Total Events: ${events.length}</p>
          ${eventsList}
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            Printed from Deskive Calendar on ${formatDate(new Date(), 'PPP')}
          </p>
        </body>
      </html>
    `
  }

  return (
    <div className="flex items-center justify-between p-2 sm:p-4 border-b border-border bg-background min-h-[60px] sm:min-h-[72px]">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        {/* Navigation - Hidden in analytics mode */}
        {!showAnalytics && (
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={navigatePrevious}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={navigateToToday}
              className="px-2 sm:px-3 text-xs sm:text-sm"
            >
              {intl.formatMessage({ id: 'modules.calendar.header.today' })}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={navigateNext}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Current Date/Period */}
        {/* <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <h1 className="text-sm sm:text-lg font-semibold truncate">
            {showAnalytics ? 'Calendar Analytics' : formatCalendarViewTitle(currentView, currentDate)}
          </h1>
        </div> */}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Search */}
        <div className="relative hidden xl:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={intl.formatMessage({ id: 'modules.calendar.header.searchPlaceholder' })}
            defaultValue={filters.searchQuery || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 w-32 2xl:w-48"
          />
          {filters.searchQuery && (
            <button
              onClick={() => updateFilters({ searchQuery: '' })}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* View Selector - Hidden in analytics mode */}
        {!showAnalytics && (
          <Select value={currentView} onValueChange={(value: CalendarView) => setCurrentView(value)}>
            <SelectTrigger className="w-20 sm:w-24 lg:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Actions */}
        <Button
          variant="outline"
          size="sm"
          onClick={onShowSchedulingAssistant}
          className="hidden lg:flex items-center gap-2 flex-shrink-0"
        >
          <Brain className="h-4 w-4" />
          <span className="hidden xl:inline">{intl.formatMessage({ id: 'modules.calendar.header.aiSchedule' })}</span>
        </Button>

        <Button
          variant={showAnalytics ? "default" : "outline"}
          size="sm"
          onClick={onShowAnalytics}
          className={cn(
            "hidden sm:flex items-center gap-2 flex-shrink-0",
            showAnalytics && "gradient-primary-active border-0"
          )}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="hidden xl:inline">{intl.formatMessage({ id: 'modules.calendar.header.analytics' })}</span>
        </Button>

        <Button
          variant={hasActiveFilters() ? "default" : "outline"}
          size="sm"
          onClick={onShowFilters}
          className={cn(
            "hidden sm:flex items-center gap-2 flex-shrink-0 relative",
            hasActiveFilters() && "bg-blue-500 hover:bg-blue-600 text-white border-0"
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden lg:inline">{intl.formatMessage({ id: 'modules.calendar.header.filters' })}</span>
          {hasActiveFilters() && (
            <div className="absolute -top-2 -right-2 h-6 w-6 bg-orange-500 text-white border-0 rounded-full flex items-center justify-center text-xs group">
              <span className="group-hover:hidden">{getActiveFilterCount()}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClearAllFilters()
                }}
                className="hidden group-hover:flex h-full w-full p-0 hover:bg-red-600 rounded-full items-center justify-center"
                title={intl.formatMessage({ id: 'modules.calendar.header.clearAllFilters' })}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </Button>

        <Button
          onClick={onCreateEvent}
          className="flex items-center gap-2 flex-shrink-0 btn-gradient-primary border-0"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">{intl.formatMessage({ id: 'modules.calendar.header.newEvent' })}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onShowSettings}>
              {intl.formatMessage({ id: 'modules.calendar.header.settings' })}
            </DropdownMenuItem>
            {hasActiveFilters() && (
              <DropdownMenuItem onClick={handleClearAllFilters} className="text-destructive">
                <FilterX className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: 'modules.calendar.header.clearAllFilters' })}
              </DropdownMenuItem>
            )}
            {hasActiveFilters() && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={onShowFilters} className="sm:hidden">
              <Filter className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.calendar.header.filters' })}
              {hasActiveFilters() && (
                <Badge variant="secondary" className="ml-auto">
                  {getActiveFilterCount()}
                </Badge>
              )}
            </DropdownMenuItem>
            {hasActiveFilters() && (
              <DropdownMenuItem onClick={handleClearAllFilters} className="sm:hidden text-destructive">
                <FilterX className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: 'modules.calendar.header.clearFilters' })}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onShowSchedulingAssistant} className="lg:hidden">
              <Brain className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.calendar.header.aiSchedule' })}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImportCalendar}>
              <Upload className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.calendar.header.importCalendar' })}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExportCalendar('ics')}>
              <Download className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.calendar.header.exportAsIcs' })}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportCalendar('csv')}>
              <Download className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.calendar.header.exportAsCsv' })}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportCalendar('json')}>
              <Download className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.calendar.header.exportAsJson' })}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.calendar.header.printCalendar' })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".ics,.csv,.json"
        onChange={handleFileImport}
      />
    </div>
  )
}