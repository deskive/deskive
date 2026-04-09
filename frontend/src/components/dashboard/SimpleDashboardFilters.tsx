'use client'

import React, { useState } from 'react'
import { Calendar } from '../ui/calendar'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import {
  CalendarDays,
  Calendar as CalendarIcon,
  TrendingUp,
  ChevronDown,
  BarChart3,
  Settings
} from 'lucide-react'
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export type DateRange = {
  from: Date
  to: Date
}

export type DateFilterType = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom'

export interface SimpleDashboardFilters {
  dateRange: DateRange
  dateFilterType: DateFilterType
  aggregationPeriod: 'daily' | 'weekly' | 'monthly'
}

interface SimpleDashboardFiltersProps {
  onFiltersChange: (filters: SimpleDashboardFilters) => void
  currentFilters: SimpleDashboardFilters
  isLoading?: boolean
  className?: string
}

export function SimpleDashboardFilters({
  onFiltersChange,
  currentFilters,
  isLoading = false,
  className = ''
}: SimpleDashboardFiltersProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const dateRangeOptions = [
    { value: 'today', label: 'Today', icon: CalendarDays },
    { value: 'yesterday', label: 'Yesterday', icon: CalendarDays },
    { value: 'last7days', label: 'Last 7 Days', icon: TrendingUp },
    { value: 'last30days', label: 'Last 30 Days', icon: TrendingUp },
    { value: 'thisWeek', label: 'This Week', icon: CalendarDays },
    { value: 'lastWeek', label: 'Last Week', icon: CalendarDays },
    { value: 'thisMonth', label: 'This Month', icon: CalendarDays },
    { value: 'lastMonth', label: 'Last Month', icon: CalendarDays },
    { value: 'custom', label: 'Custom Range', icon: Settings },
  ]

  const getDateRange = (type: DateFilterType): DateRange => {
    const now = new Date()

    switch (type) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) }
      case 'yesterday':
        const yesterday = subDays(now, 1)
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
      case 'last7days':
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) }
      case 'last30days':
        return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) }
      case 'thisWeek':
        return { from: startOfWeek(now), to: endOfWeek(now) }
      case 'lastWeek':
        const lastWeek = subWeeks(now, 1)
        return { from: startOfWeek(lastWeek), to: endOfWeek(lastWeek) }
      case 'thisMonth':
        return { from: startOfMonth(now), to: endOfMonth(now) }
      case 'lastMonth':
        const lastMonth = subMonths(now, 1)
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
      case 'custom':
        return currentFilters.dateRange
      default:
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) }
    }
  }

  const handleDateRangeChange = (type: DateFilterType) => {
    const range = getDateRange(type)
    const newFilters = {
      ...currentFilters,
      dateRange: range,
      dateFilterType: type
    }
    onFiltersChange(newFilters)
  }

  const handleCustomDateChange = (range: DateRange) => {
    onFiltersChange({
      ...currentFilters,
      dateRange: range,
      dateFilterType: 'custom'
    })
  }

  const handleAggregationChange = (period: 'daily' | 'weekly' | 'monthly') => {
    const newFilters = {
      ...currentFilters,
      aggregationPeriod: period
    }
    onFiltersChange(newFilters)
  }

  const formatDateRange = (range: DateRange, type: DateFilterType): string => {
    const option = dateRangeOptions.find(opt => opt.value === type)
    if (option && type !== 'custom') {
      return option.label
    }
    return `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, yyyy')}`
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Dashboard Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Date Range Selection */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Date Range</span>
            </div>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>{formatDateRange(currentFilters.dateRange, currentFilters.dateFilterType)}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex">
                  <div className="w-48 border-r p-2">
                    <div className="space-y-1">
                      {dateRangeOptions.map((option) => {
                        const Icon = option.icon
                        return (
                          <Button
                            key={option.value}
                            variant={currentFilters.dateFilterType === option.value ? "default" : "ghost"}
                            className="w-full justify-start text-sm"
                            onClick={() => {
                              if (option.value === 'custom') {
                                // Keep popover open for custom range
                              } else {
                                handleDateRangeChange(option.value as DateFilterType)
                                setIsDatePickerOpen(false)
                              }
                            }}
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            {option.label}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                  {currentFilters.dateFilterType === 'custom' && (
                    <div className="p-2">
                      <Calendar
                        mode="range"
                        defaultMonth={currentFilters.dateRange.from}
                        selected={{
                          from: currentFilters.dateRange.from,
                          to: currentFilters.dateRange.to
                        }}
                        onSelect={(range) => {
                          if (range?.from && range?.to) {
                            handleCustomDateChange({
                              from: startOfDay(range.from),
                              to: endOfDay(range.to)
                            })
                            setIsDatePickerOpen(false)
                          }
                        }}
                        numberOfMonths={2}
                      />
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Aggregation Period */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">View</span>
            </div>
            <Select
              value={currentFilters.aggregationPeriod}
              onValueChange={(value: 'daily' | 'weekly' | 'monthly') => handleAggregationChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily View</SelectItem>
                <SelectItem value="weekly">Weekly View</SelectItem>
                <SelectItem value="monthly">Monthly View</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status Display */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing {currentFilters.aggregationPeriod} data from {format(currentFilters.dateRange.from, 'MMM d')} to {format(currentFilters.dateRange.to, 'MMM d, yyyy')}
            </span>
            {isLoading && (
              <Badge variant="secondary" className="animate-pulse">
                Loading...
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SimpleDashboardFilters
