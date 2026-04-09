import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, subDays, startOfToday } from 'date-fns';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card } from '../ui/card';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface DashboardFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  aggregationPeriod: string;
  onAggregationPeriodChange: (period: string) => void;
}

const SimpleDashboardFilters: React.FC<DashboardFiltersProps> = ({
  dateRange,
  onDateRangeChange,
  aggregationPeriod,
  onAggregationPeriodChange,
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Quick date range presets
  const datePresets = [
    {
      label: "Last 7 days",
      value: () => ({
        from: subDays(startOfToday(), 6),
        to: startOfToday(),
      }),
    },
    {
      label: "Last 30 days",
      value: () => ({
        from: subDays(startOfToday(), 29),
        to: startOfToday(),
      }),
    },
    {
      label: "Last 90 days",
      value: () => ({
        from: subDays(startOfToday(), 89),
        to: startOfToday(),
      }),
    },
  ];

  const formatDateRange = (range: DateRange) => {
    if (!range.from) return "Pick a date";
    if (!range.to) return format(range.from, "LLL dd, y");
    if (range.from.getTime() === range.to.getTime()) {
      return format(range.from, "LLL dd, y");
    }
    return `${format(range.from, "LLL dd, y")} - ${format(range.to, "LLL dd, y")}`;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white border-b border-gray-200">
      <div className="flex flex-col sm:flex-row gap-4 flex-1">
        {/* Date Range Picker */}
        <div className="relative">
          <Button
            variant="outline"
            className="w-full sm:w-[280px] justify-start text-left font-normal"
            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {formatDateRange(dateRange)}
            <ChevronDown className="ml-auto h-4 w-4" />
          </Button>
          
          {isDatePickerOpen && (
            <Card className="absolute top-full mt-2 z-50 w-full sm:w-[300px]">
              <div className="p-4 space-y-2">
                <div className="text-sm font-medium text-gray-700 mb-2">Quick Select</div>
                {datePresets.map((preset, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      onDateRangeChange(preset.value());
                      setIsDatePickerOpen(false);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
                
                <div className="border-t pt-2 mt-2">
                  <div className="text-sm text-gray-500 mb-2">
                    Custom date range selection would go here with react-day-picker
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsDatePickerOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Aggregation Period Selector */}
        <div className="w-full sm:w-[180px]">
          <Select value={aggregationPeriod} onValueChange={onAggregationPeriodChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Apply/Reset Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onDateRangeChange({
              from: subDays(startOfToday(), 29),
              to: startOfToday(),
            });
            onAggregationPeriodChange('day');
          }}
        >
          Reset
        </Button>
        <Button size="sm">
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default SimpleDashboardFilters;