import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, X } from 'lucide-react';

interface ScheduleMessageModalProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (date: Date) => void;
}

export function ScheduleMessageModal({ open, onClose, onSchedule }: ScheduleMessageModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');

  const quickScheduleOptions = [
    { id: '30min', title: 'In 30 minutes', subtitle: 'Quick schedule', minutes: 30 },
    { id: '1hour', title: 'In 1 hour', subtitle: 'Quick schedule', minutes: 60 },
    { id: '2hours', title: 'In 2 hours', subtitle: 'Quick schedule', minutes: 120 },
    { id: 'tomorrow', title: 'Tomorrow 9 AM', subtitle: 'Next day', getDate: () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }},
  ];

  const handleQuickSchedule = (option: typeof quickScheduleOptions[0]) => {
    setSelectedOption(option.id);
    let scheduledDate: Date;

    if ('minutes' in option && option.minutes !== undefined) {
      scheduledDate = new Date(Date.now() + option.minutes * 60 * 1000);
    } else {
      scheduledDate = option.getDate();
    }

    onSchedule(scheduledDate);
    onClose();
  };

  const handleCustomSchedule = () => {
    if (!customDate || !customTime) return;

    const [year, month, day] = customDate.split('-').map(Number);
    const [hours, minutes] = customTime.split(':').map(Number);

    const scheduledDate = new Date(year, month - 1, day, hours, minutes);
    onSchedule(scheduledDate);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-6 w-6" />
            Schedule message
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 pb-6 space-y-6">
          {/* Quick Schedule Options */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Choose a time</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickScheduleOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleQuickSchedule(option)}
                  className="text-left p-4 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                >
                  <div className="font-semibold text-foreground">{option.title}</div>
                  <div className="text-sm text-muted-foreground">{option.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">
                OR PICK A CUSTOM TIME
              </span>
            </div>
          </div>

          {/* Custom Date/Time Picker */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-base font-semibold">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="text-base font-semibold">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-8"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCustomSchedule}
              disabled={!customDate || !customTime}
              className="px-8 btn-gradient-primary"
            >
              Schedule message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
