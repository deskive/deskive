import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BarChart2, Plus, X, Trash2 } from 'lucide-react';
import type { Poll, PollOption, LinkedContent } from '@/lib/api/chat-api';

// Generate UUID using crypto API
const generateId = () => crypto.randomUUID();

interface PollCreatorProps {
  open: boolean;
  onClose: () => void;
  onCreatePoll: (pollContent: LinkedContent) => void;
  creatorId: string;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

export function PollCreator({
  open,
  onClose,
  onCreatePoll,
  creatorId,
}: PollCreatorProps) {
  const intl = useIntl();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<{ id: string; text: string }[]>([
    { id: generateId(), text: '' },
    { id: generateId(), text: '' },
  ]);
  const [showResultsBeforeVoting, setShowResultsBeforeVoting] = useState(false);

  const addOption = () => {
    if (options.length < MAX_OPTIONS) {
      setOptions([...options, { id: generateId(), text: '' }]);
    }
  };

  const removeOption = (id: string) => {
    if (options.length > MIN_OPTIONS) {
      setOptions(options.filter((opt) => opt.id !== id));
    }
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  };

  const handleCreate = () => {
    // Validate
    if (!question.trim()) return;
    const validOptions = options.filter((opt) => opt.text.trim());
    if (validOptions.length < MIN_OPTIONS) return;

    const pollId = generateId();

    // Create poll data
    const poll: Poll = {
      id: pollId,
      question: question.trim(),
      options: validOptions.map((opt) => ({
        id: opt.id,
        text: opt.text.trim(),
        voteCount: 0,
      })),
      isOpen: true,
      showResultsBeforeVoting,
      createdBy: creatorId,
      totalVotes: 0,
    };

    // Create linked content with poll
    const pollContent: LinkedContent = {
      id: pollId,
      title: question.trim(),
      type: 'poll',
      poll,
    };

    onCreatePoll(pollContent);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setQuestion('');
    setOptions([
      { id: generateId(), text: '' },
      { id: generateId(), text: '' },
    ]);
    setShowResultsBeforeVoting(false);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const isValid =
    question.trim() &&
    options.filter((opt) => opt.text.trim()).length >= MIN_OPTIONS;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BarChart2 className="h-6 w-6" />
            {intl.formatMessage({
              id: 'modules.chat.poll.createTitle',
              defaultMessage: 'Create Poll',
            })}
          </DialogTitle>
        </DialogHeader>

        {/* Content - Scrollable */}
        <div className="px-6 pb-6 space-y-5 overflow-y-auto flex-1">
          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="poll-question" className="text-base font-medium">
              {intl.formatMessage({
                id: 'modules.chat.poll.question',
                defaultMessage: 'Question',
              })}
            </Label>
            <Input
              id="poll-question"
              placeholder={intl.formatMessage({
                id: 'modules.chat.poll.questionPlaceholder',
                defaultMessage: 'Ask a question...',
              })}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              {intl.formatMessage({
                id: 'modules.chat.poll.options',
                defaultMessage: 'Options',
              })}
            </Label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    placeholder={intl.formatMessage(
                      {
                        id: 'modules.chat.poll.optionPlaceholder',
                        defaultMessage: 'Option {number}',
                      },
                      { number: index + 1 }
                    )}
                    value={option.text}
                    onChange={(e) => updateOption(option.id, e.target.value)}
                    className="flex-1 h-10"
                  />
                  {options.length > MIN_OPTIONS && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(option.id)}
                      className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add option button */}
            {options.length < MAX_OPTIONS && (
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {intl.formatMessage({
                  id: 'modules.chat.poll.addOption',
                  defaultMessage: 'Add Option',
                })}
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              {intl.formatMessage(
                {
                  id: 'modules.chat.poll.optionsHint',
                  defaultMessage: '{min}-{max} options allowed',
                },
                { min: MIN_OPTIONS, max: MAX_OPTIONS }
              )}
            </p>
          </div>

          {/* Show results before voting toggle */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-1">
              <Label
                htmlFor="show-results"
                className="text-base font-medium cursor-pointer"
              >
                {intl.formatMessage({
                  id: 'modules.chat.poll.showResults',
                  defaultMessage: 'Show results before voting',
                })}
              </Label>
              <p className="text-sm text-muted-foreground">
                {showResultsBeforeVoting
                  ? intl.formatMessage({
                      id: 'modules.chat.poll.resultsVisible',
                      defaultMessage: 'Users can see results without voting',
                    })
                  : intl.formatMessage({
                      id: 'modules.chat.poll.resultsHidden',
                      defaultMessage: 'Results hidden until user votes',
                    })}
              </p>
            </div>
            <Switch
              id="show-results"
              checked={showResultsBeforeVoting}
              onCheckedChange={setShowResultsBeforeVoting}
            />
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="px-6 pb-6 pt-4 border-t shrink-0 flex items-center justify-end gap-3 bg-background">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="min-w-[100px]"
          >
            {intl.formatMessage({
              id: 'modules.chat.poll.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!isValid}
            className="min-w-[100px] btn-gradient-primary"
          >
            {intl.formatMessage({
              id: 'modules.chat.poll.create',
              defaultMessage: 'Create Poll',
            })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
