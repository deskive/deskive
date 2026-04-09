import { useState } from 'react';
import { useIntl } from 'react-intl';
import { X, AlertTriangle, Bug, Shield, Zap, Clock, Package, MoreHorizontal, ChevronLeft, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/fetch';
import { useNavigate } from 'react-router-dom';

/**
 * Deletion reasons matching backend enum
 */
export enum DeletionReason {
  FOUND_ALTERNATIVE = 'found_alternative',
  PRIVACY_CONCERNS = 'privacy_concerns',
  BUGS_ERRORS = 'bugs_errors',
  MISSING_FEATURES = 'missing_features',
  TOO_COMPLICATED = 'too_complicated',
  NOT_USING = 'not_using',
  OTHER = 'other',
}

interface DeletionReasonOption {
  value: DeletionReason;
  label: string;
  icon: typeof Bug;
  color: string;
}

const DELETION_REASONS: DeletionReasonOption[] = [
  {
    value: DeletionReason.FOUND_ALTERNATIVE,
    label: 'Found a better alternative',
    icon: Package,
    color: 'text-blue-500',
  },
  {
    value: DeletionReason.PRIVACY_CONCERNS,
    label: 'Privacy/security concerns',
    icon: Shield,
    color: 'text-orange-500',
  },
  {
    value: DeletionReason.BUGS_ERRORS,
    label: 'Too many bugs or errors',
    icon: Bug,
    color: 'text-red-500',
  },
  {
    value: DeletionReason.MISSING_FEATURES,
    label: 'Missing features I need',
    icon: Zap,
    color: 'text-purple-500',
  },
  {
    value: DeletionReason.TOO_COMPLICATED,
    label: 'App is too complicated',
    icon: MoreHorizontal,
    color: 'text-teal-500',
  },
  {
    value: DeletionReason.NOT_USING,
    label: 'Not using the app anymore',
    icon: Clock,
    color: 'text-gray-500',
  },
  {
    value: DeletionReason.OTHER,
    label: 'Other reason',
    icon: MoreHorizontal,
    color: 'text-gray-400',
  },
];

interface DeletionExitSurveyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogoutInstead?: () => void;
}

export function DeletionExitSurvey({ open, onOpenChange, onLogoutInstead }: DeletionExitSurveyProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedReason, setSelectedReason] = useState<DeletionReason | null>(null);
  const [feedback, setFeedback] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!isSubmitting) {
      // Submit retention feedback
      if (selectedReason) {
        submitFeedback(true, false).catch(console.error);
      }
      onOpenChange(false);
      // Reset form
      setTimeout(() => {
        setCurrentStep(0);
        setSelectedReason(null);
        setFeedback('');
        setPassword('');
        setError(null);
      }, 300);
    }
  };

  const handleLogout = () => {
    if (selectedReason) {
      submitFeedback(true, false).catch(console.error);
    }
    onLogoutInstead?.();
  };

  const submitFeedback = async (wasRetained: boolean, deletedAccount: boolean) => {
    if (!selectedReason) return;

    try {
      await api.post('/auth/deletion-feedback', {
        reason: selectedReason,
        reasonDetails: getReasonDetails(selectedReason),
        feedbackResponse: feedback.trim() || null,
        wasRetained,
        deletedAccount,
      });
    } catch (err) {
      console.error('Failed to submit deletion feedback:', err);
    }
  };

  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit feedback first
      await submitFeedback(false, true);

      // Delete account with password
      await api.delete('/auth/account', {
        body: JSON.stringify({ password }),
      });

      // Logout
      await api.post('/auth/logout', {});

      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Navigate to login
      navigate('/login');

      // Show success message
      // TODO: Add toast notification
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete account');
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedReason !== null;
      case 1:
        return true; // Feedback is optional
      case 2:
        return password.trim().length > 0;
      default:
        return false;
    }
  };

  const goToNextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0" onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">Account Deletion Survey</DialogTitle>

        {/* Progress indicator */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex gap-2">
            {[0, 1, 2].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  step <= currentStep
                    ? 'bg-primary shadow-sm'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {currentStep === 0 && <StepReason selectedReason={selectedReason} onSelectReason={setSelectedReason} />}
          {currentStep === 1 && (
            <StepFeedback
              selectedReason={selectedReason!}
              feedback={feedback}
              onFeedbackChange={setFeedback}
              onLogout={handleLogout}
              onCancel={handleClose}
            />
          )}
          {currentStep === 2 && (
            <StepConfirmation
              password={password}
              onPasswordChange={setPassword}
              error={error}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* Bottom actions */}
        <div className="border-t-2 border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          <div>
            {currentStep > 0 ? (
              <Button variant="ghost" onClick={goToPreviousStep} disabled={isSubmitting} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div className="w-24" />
            )}
          </div>
          <div>
            {currentStep < 2 ? (
              <Button onClick={goToNextStep} disabled={!canProceed()} size="lg" className="px-8">
                Continue
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={!canProceed() || isSubmitting}
                size="lg"
                className="px-8"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Account'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step 1: Reason Selection
function StepReason({
  selectedReason,
  onSelectReason,
}: {
  selectedReason: DeletionReason | null;
  onSelectReason: (reason: DeletionReason) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-8 w-8 text-orange-500 flex-shrink-0" />
        <div>
          <h2 className="text-2xl font-bold">We're sorry to see you go!</h2>
          <p className="text-muted-foreground mt-2">
            Help us improve by telling us why you're deleting your account.
          </p>
        </div>
      </div>

      <RadioGroup value={selectedReason || ''} onValueChange={(value) => onSelectReason(value as DeletionReason)}>
        <div className="space-y-3">
          {DELETION_REASONS.map((reason) => {
            const Icon = reason.icon;
            const isSelected = selectedReason === reason.value;
            return (
              <label
                key={reason.value}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <RadioGroupItem value={reason.value} id={reason.value} className="mt-0.5" />
                <Icon className={`h-6 w-6 flex-shrink-0 ${reason.color}`} />
                <span className={`flex-1 text-base ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                  {reason.label}
                </span>
              </label>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
}

// Step 2: Feedback & Retention
function StepFeedback({
  selectedReason,
  feedback,
  onFeedbackChange,
  onLogout,
  onCancel,
}: {
  selectedReason: DeletionReason;
  feedback: string;
  onFeedbackChange: (value: string) => void;
  onLogout: () => void;
  onCancel: () => void;
}) {
  const retention = getRetentionMessage(selectedReason);

  return (
    <div className="space-y-6">
      {/* Targeted retention message */}
      <Alert className={`border-2 ${retention.colorClass} shadow-sm`}>
        <retention.icon className={`h-6 w-6 ${retention.iconColor} flex-shrink-0`} />
        <div className="ml-2">
          <h3 className="font-semibold text-lg mb-2">{retention.title}</h3>
          <AlertDescription className="text-sm leading-relaxed">{retention.message}</AlertDescription>
          {retention.action && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={retention.action.onClick} className="font-medium">
                {retention.action.label}
              </Button>
            </div>
          )}
        </div>
      </Alert>

      {/* Feedback textarea */}
      <div className="space-y-3">
        <Label htmlFor="feedback" className="text-base font-medium">
          Any additional feedback? (Optional)
        </Label>
        <Textarea
          id="feedback"
          value={feedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          placeholder="Tell us more about your experience..."
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Alternative actions */}
      <Alert className="border-2">
        <AlertDescription>
          <p className="font-semibold text-base mb-3">Not ready to delete?</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onLogout} className="flex-1">
              Log Out Instead
            </Button>
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Step 3: Final Confirmation
function StepConfirmation({
  password,
  onPasswordChange,
  error,
  isSubmitting,
}: {
  password: string;
  onPasswordChange: (value: string) => void;
  error: string | null;
  isSubmitting: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Warning */}
      <Alert variant="destructive" className="border-2 border-red-300 shadow-sm">
        <AlertTriangle className="h-7 w-7 flex-shrink-0" />
        <div className="ml-2">
          <h3 className="font-bold text-xl mb-3">Final Confirmation</h3>
          <AlertDescription className="space-y-3">
            <p className="font-medium">
              This action cannot be undone. All your data will be permanently deleted including:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold mt-0.5">•</span>
                <span>Your profile and settings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold mt-0.5">•</span>
                <span>All messages and files</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold mt-0.5">•</span>
                <span>Your workspaces and projects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold mt-0.5">•</span>
                <span>Calendar events and notes</span>
              </li>
            </ul>
          </AlertDescription>
        </div>
      </Alert>

      {/* Password input */}
      <div className="space-y-3">
        <Label htmlFor="password" className="text-base font-medium">
          Enter your password to confirm deletion
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Enter your password"
          disabled={isSubmitting}
          className={`h-12 ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        />
        {error && (
          <p className="text-sm text-red-600 font-medium flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getReasonDetails(reason: DeletionReason): string {
  const details: Record<DeletionReason, string> = {
    [DeletionReason.BUGS_ERRORS]: 'User experienced bugs/errors',
    [DeletionReason.MISSING_FEATURES]: 'User needs additional features',
    [DeletionReason.PRIVACY_CONCERNS]: 'User has privacy concerns',
    [DeletionReason.TOO_COMPLICATED]: 'User found app too complicated',
    [DeletionReason.NOT_USING]: 'User not actively using the app',
    [DeletionReason.FOUND_ALTERNATIVE]: 'User found alternative solution',
    [DeletionReason.OTHER]: 'Other reason',
  };
  return details[reason];
}

function getRetentionMessage(reason: DeletionReason) {
  const messages: Record<
    DeletionReason,
    {
      title: string;
      message: string;
      icon: typeof Bug;
      colorClass: string;
      iconColor: string;
      action?: { label: string; onClick: () => void };
    }
  > = {
    [DeletionReason.BUGS_ERRORS]: {
      title: "We're sorry you experienced issues!",
      message:
        "Please report the bug and we'll fix it quickly. Our team typically resolves issues within 24-48 hours.",
      icon: Bug,
      colorClass: 'border-red-200 bg-red-50 dark:bg-red-950',
      iconColor: 'text-red-500',
      action: {
        label: 'Report Bug',
        onClick: () => {
          // TODO: Navigate to bug report
          console.log('Navigate to bug report');
        },
      },
    },
    [DeletionReason.MISSING_FEATURES]: {
      title: "We'd love to hear your ideas!",
      message: "What feature would make this app perfect for you? Let us know and we'll consider adding it!",
      icon: Zap,
      colorClass: 'border-amber-200 bg-amber-50 dark:bg-amber-950',
      iconColor: 'text-amber-500',
    },
    [DeletionReason.PRIVACY_CONCERNS]: {
      title: 'Your privacy matters to us',
      message: 'We take privacy seriously. Would you like to review our privacy settings or talk to our support team?',
      icon: Shield,
      colorClass: 'border-green-200 bg-green-50 dark:bg-green-950',
      iconColor: 'text-green-500',
      action: {
        label: 'Contact Support',
        onClick: () => {
          // TODO: Navigate to support
          console.log('Navigate to support');
        },
      },
    },
    [DeletionReason.TOO_COMPLICATED]: {
      title: "We're here to help!",
      message: 'Would you like a quick tutorial or to talk to our support team? We can help you get the most out of the app.',
      icon: MoreHorizontal,
      colorClass: 'border-blue-200 bg-blue-50 dark:bg-blue-950',
      iconColor: 'text-blue-500',
      action: {
        label: 'Get Help',
        onClick: () => {
          // TODO: Navigate to help
          console.log('Navigate to help');
        },
      },
    },
    [DeletionReason.NOT_USING]: {
      title: 'No problem!',
      message: 'Would you prefer to just log out instead? Your data will be saved if you return.',
      icon: Clock,
      colorClass: 'border-gray-200 bg-gray-50 dark:bg-gray-900',
      iconColor: 'text-gray-500',
    },
    [DeletionReason.FOUND_ALTERNATIVE]: {
      title: 'We understand',
      message: "We'd love to know what they offer that we don't. Your feedback helps us improve!",
      icon: Package,
      colorClass: 'border-blue-200 bg-blue-50 dark:bg-blue-950',
      iconColor: 'text-blue-500',
    },
    [DeletionReason.OTHER]: {
      title: 'Thank you for your feedback',
      message: 'Your input helps us improve the app for everyone.',
      icon: MoreHorizontal,
      colorClass: 'border-gray-200 bg-gray-50 dark:bg-gray-900',
      iconColor: 'text-gray-500',
    },
  };

  return messages[reason];
}
