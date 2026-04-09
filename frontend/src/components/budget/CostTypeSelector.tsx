import type { FC } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CostTypeSelectorProps {
  value: 'fixed' | 'variable';
  onChange: (value: 'fixed' | 'variable') => void;
}

const CostTypeSelector: FC<CostTypeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>Cost Nature</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Fixed Costs:</strong> Remain constant regardless of activity
                  (e.g., rent, subscriptions, insurance)
                </p>
                <p>
                  <strong>Variable Costs:</strong> Change with activity levels
                  (e.g., labor, materials, usage-based services)
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <RadioGroup value={value} onValueChange={onChange} className="flex gap-4">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="fixed" id="fixed" />
          <Label htmlFor="fixed" className="font-normal cursor-pointer">
            <span className="font-medium text-blue-700 dark:text-blue-400">Fixed</span>
            <span className="text-xs text-muted-foreground ml-1">(constant)</span>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="variable" id="variable" />
          <Label htmlFor="variable" className="font-normal cursor-pointer">
            <span className="font-medium text-green-700 dark:text-green-400">Variable</span>
            <span className="text-xs text-muted-foreground ml-1">(changes)</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};

export default CostTypeSelector;
