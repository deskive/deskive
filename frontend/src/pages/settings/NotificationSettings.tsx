/**
 * Notification Settings Component
 * Notification preferences and settings
 */

import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  Bell,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  Users,
  Briefcase,
  Volume2,
  VolumeX,
  Clock,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// Components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Separator } from '../../components/ui/separator';
import { Checkbox } from '../../components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';

// Services
import { settingsService } from '@/lib/api/settings-api';

// Types
interface NotificationCategoryWithIcon {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  settings: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
}

interface NotificationPreferencesWithIcons {
  categories: NotificationCategoryWithIcon[];
  generalSettings: {
    doNotDisturb: boolean;
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
    frequency: 'immediate' | 'digest' | 'daily' | 'weekly';
    sound: boolean;
  };
}

const NotificationSettings: React.FC = () => {
  const intl = useIntl();

  // State - Initial state with translation keys that will be replaced by API data
  const [preferences, setPreferences] = useState<NotificationPreferencesWithIcons>({
    categories: [
      {
        id: 'messages',
        label: intl.formatMessage({ id: 'settings.notifications.categories.messages.label' }),
        description: intl.formatMessage({ id: 'settings.notifications.categories.messages.description' }),
        icon: MessageSquare,
        settings: { email: true, push: true, inApp: true }
      },
      {
        id: 'calendar',
        label: intl.formatMessage({ id: 'settings.notifications.categories.calendar.label' }),
        description: intl.formatMessage({ id: 'settings.notifications.categories.calendar.description' }),
        icon: Calendar,
        settings: { email: true, push: true, inApp: true }
      },
      {
        id: 'tasks',
        label: intl.formatMessage({ id: 'settings.notifications.categories.tasks.label' }),
        description: intl.formatMessage({ id: 'settings.notifications.categories.tasks.description' }),
        icon: FileText,
        settings: { email: false, push: true, inApp: true }
      },
      {
        id: 'team',
        label: intl.formatMessage({ id: 'settings.notifications.categories.team.label' }),
        description: intl.formatMessage({ id: 'settings.notifications.categories.team.description' }),
        icon: Users,
        settings: { email: false, push: false, inApp: true }
      },
      {
        id: 'workspace',
        label: intl.formatMessage({ id: 'settings.notifications.categories.workspace.label' }),
        description: intl.formatMessage({ id: 'settings.notifications.categories.workspace.description' }),
        icon: Briefcase,
        settings: { email: true, push: false, inApp: true }
      },
      {
        id: 'email',
        label: intl.formatMessage({ id: 'settings.notifications.categories.email.label' }),
        description: intl.formatMessage({ id: 'settings.notifications.categories.email.description' }),
        icon: Mail,
        settings: { email: false, push: true, inApp: true }
      }
    ],
    generalSettings: {
      doNotDisturb: false,
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00'
      },
      frequency: 'immediate',
      sound: true
    }
  });
  
  // Loading and status states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load notification settings on mount
  useEffect(() => {
    loadNotificationSettings();
  }, []);

  // Load notification settings
  const loadNotificationSettings = async () => {
    setLoading(true);
    try {
      const settings = await settingsService.getNotificationSettings();
      if (settings) {
        // Map the service categories to include icons and translations
        const categoriesWithIcons = settings.categories.map(category => {
          const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
            messages: MessageSquare,
            calendar: Calendar,
            tasks: FileText,
            team: Users,
            workspace: Briefcase,
            email: Mail
          };

          return {
            ...category,
            // Use translations for label and description
            label: intl.formatMessage({ id: `settings.notifications.categories.${category.id}.label` }),
            description: intl.formatMessage({ id: `settings.notifications.categories.${category.id}.description` }),
            icon: iconMap[category.id] || MessageSquare
          };
        });

        setPreferences({
          categories: categoriesWithIcons,
          generalSettings: settings.generalSettings ?? {
            doNotDisturb: false,
            quietHours: {
              enabled: false,
              startTime: '22:00',
              endTime: '08:00'
            },
            frequency: 'immediate',
            sound: true
          }
        });
      }
    } catch (err) {
      console.error('Failed to load notification settings:', err);
      setError('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  // Handle category notification toggle
  const handleCategoryToggle = (
    categoryId: string, 
    type: 'email' | 'push' | 'inApp'
  ) => {
    setPreferences(prev => ({
      ...prev,
      categories: prev.categories.map(category =>
        category.id === categoryId
          ? {
              ...category,
              settings: {
                ...category.settings,
                [type]: !category.settings[type]
              }
            }
          : category
      )
    }));
    
    // Clear success message when user makes changes
    if (success) setSuccess(null);
  };

  // Handle general settings toggle
  const handleGeneralSettingToggle = (setting: keyof typeof preferences.generalSettings) => {
    if (setting === 'quietHours') return; // Handle separately
    
    setPreferences(prev => ({
      ...prev,
      generalSettings: {
        ...prev.generalSettings,
        [setting]: !prev.generalSettings[setting as keyof typeof prev.generalSettings]
      }
    }));
    
    if (success) setSuccess(null);
  };

  // Handle quiet hours toggle
  const handleQuietHoursToggle = () => {
    setPreferences(prev => ({
      ...prev,
      generalSettings: {
        ...prev.generalSettings,
        quietHours: {
          ...prev.generalSettings.quietHours,
          enabled: !prev.generalSettings.quietHours.enabled
        }
      }
    }));
    
    if (success) setSuccess(null);
  };

  // Handle quiet hours time change
  const handleQuietHoursTimeChange = (timeType: 'startTime' | 'endTime', value: string) => {
    setPreferences(prev => ({
      ...prev,
      generalSettings: {
        ...prev.generalSettings,
        quietHours: {
          ...prev.generalSettings.quietHours,
          [timeType]: value
        }
      }
    }));
    
    if (success) setSuccess(null);
  };

  // Handle frequency change
  const handleFrequencyChange = (frequency: string) => {
    setPreferences(prev => ({
      ...prev,
      generalSettings: {
        ...prev.generalSettings,
        frequency: frequency as typeof prev.generalSettings.frequency
      }
    }));
    
    if (success) setSuccess(null);
  };

  // Save notification settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Get user's browser timezone automatically
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('💾 Saving notification settings with timezone:', userTimezone);

      // Convert preferences to service format (remove icons)
      const preferencesForService = {
        ...preferences,
        categories: preferences.categories.map(({ icon, ...category }) => category),
        timezone: userTimezone, // Include user's timezone
      };

      await settingsService.updateNotificationSettings(preferencesForService);
      setSuccess('Notification settings saved successfully');
    } catch (err) {
      console.error('Failed to save notification settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  // Clear status messages after a delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{intl.formatMessage({ id: 'settings.notifications.loading' })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>{intl.formatMessage({ id: 'settings.notifications.general.title' })}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Do Not Disturb */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="font-medium">{intl.formatMessage({ id: 'settings.notifications.general.dnd.label' })}</Label>
              <p className="text-sm text-gray-600">
                {intl.formatMessage({ id: 'settings.notifications.general.dnd.description' })}
              </p>
            </div>
            <Checkbox
              checked={preferences.generalSettings.doNotDisturb}
              onCheckedChange={() => handleGeneralSettingToggle('doNotDisturb')}
            />
          </div>

          <Separator />

          {/* Notification Frequency - Commented out for future use */}
          {/* <div className="space-y-3">
            <Label className="font-medium">Notification Frequency</Label>
            <Select
              value={preferences.generalSettings.frequency}
              onValueChange={handleFrequencyChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="digest">5-minute digest</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="weekly">Weekly digest</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600">
              Choose how frequently you want to receive notifications
            </p>
          </div>

          <Separator /> */}

          {/* Sound */}
          <div className="flex items-center justify-between">
            <div className="space-y-1 flex items-center space-x-3">
              {preferences.generalSettings.sound ? (
                <Volume2 className="w-4 h-4 text-gray-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-gray-600" />
              )}
              <div>
                <Label className="font-medium">{intl.formatMessage({ id: 'settings.notifications.general.sound.label' })}</Label>
                <p className="text-sm text-gray-600">
                  {intl.formatMessage({ id: 'settings.notifications.general.sound.description' })}
                </p>
              </div>
            </div>
            <Checkbox
              checked={preferences.generalSettings.sound}
              onCheckedChange={() => handleGeneralSettingToggle('sound')}
            />
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex items-center space-x-3">
                <Clock className="w-4 h-4 text-gray-600" />
                <div>
                  <Label className="font-medium">{intl.formatMessage({ id: 'settings.notifications.general.quietHours.label' })}</Label>
                  <p className="text-sm text-gray-600">
                    {intl.formatMessage({ id: 'settings.notifications.general.quietHours.description' })}
                  </p>
                </div>
              </div>
              <Checkbox
                checked={preferences.generalSettings.quietHours.enabled}
                onCheckedChange={handleQuietHoursToggle}
              />
            </div>
            
            {preferences.generalSettings.quietHours.enabled && (
              <div className="ml-7 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">{intl.formatMessage({ id: 'settings.notifications.general.quietHours.startTime' })}</Label>
                  <Select
                    value={preferences.generalSettings.quietHours.startTime}
                    onValueChange={(value) => handleQuietHoursTimeChange('startTime', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {`${hour}:00`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{intl.formatMessage({ id: 'settings.notifications.general.quietHours.endTime' })}</Label>
                  <Select
                    value={preferences.generalSettings.quietHours.endTime}
                    onValueChange={(value) => handleQuietHoursTimeChange('endTime', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {`${hour}:00`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <Card>
        <CardHeader>
          <CardTitle>{intl.formatMessage({ id: 'settings.notifications.types.title' })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Headers */}
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700 border-b pb-2">
            <div className="col-span-6">{intl.formatMessage({ id: 'settings.notifications.types.category' })}</div>
            {/* Email column - Commented out for future use */}
            {/* <div className="col-span-2 text-center">
              <Mail className="w-4 h-4 mx-auto mb-1" />
              Email
            </div> */}
            <div className="col-span-3 text-center">
              <Bell className="w-4 h-4 mx-auto mb-1" />
              {intl.formatMessage({ id: 'settings.notifications.types.push' })}
            </div>
            <div className="col-span-3 text-center">
              <MessageSquare className="w-4 h-4 mx-auto mb-1" />
              {intl.formatMessage({ id: 'settings.notifications.types.inApp' })}
            </div>
          </div>

          {/* Notification Categories */}
          {preferences.categories.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.id} className="grid grid-cols-12 gap-4 items-center py-3">
                <div className="col-span-6 space-y-1">
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    <div>
                      <Label className="font-medium">{category.label}</Label>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </div>
                </div>

                {/* Email Notification - Commented out for future use */}
                {/* <div className="col-span-2 flex justify-center">
                  <Checkbox
                    checked={category.settings.email}
                    onCheckedChange={() => handleCategoryToggle(category.id, 'email')}
                    disabled={preferences.generalSettings.doNotDisturb}
                  />
                </div> */}

                {/* Push Notification */}
                <div className="col-span-3 flex justify-center">
                  <Checkbox
                    checked={category.settings.push}
                    onCheckedChange={() => handleCategoryToggle(category.id, 'push')}
                    disabled={preferences.generalSettings.doNotDisturb}
                  />
                </div>

                {/* In-App Notification */}
                <div className="col-span-3 flex justify-center">
                  <Checkbox
                    checked={category.settings.inApp}
                    onCheckedChange={() => handleCategoryToggle(category.id, 'inApp')}
                    disabled={preferences.generalSettings.doNotDisturb}
                  />
                </div>
              </div>
            );
          })}

          {preferences.generalSettings.doNotDisturb && (
            <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-md">
              {intl.formatMessage({ id: 'settings.notifications.types.dndActive' })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-md">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{intl.formatMessage({ id: 'settings.notifications.actions.saving' })}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{intl.formatMessage({ id: 'settings.notifications.actions.save' })}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;