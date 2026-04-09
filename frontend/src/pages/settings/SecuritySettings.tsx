/**
 * Security Settings Component
 * Password and 2FA security settings
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  Shield,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Lock,
  AlertTriangle,
  Clock,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Separator } from '../../components/ui/separator';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

// Services
import { settingsService } from '@/lib/api/settings-api';
import { DeletionExitSurvey } from '@/components/account/deletion-exit-survey';

// Types
interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface TwoFactorSettings {
  enabled: boolean;
  backupCodes: string[];
  lastEnabledAt?: string;
}

const SecuritySettings: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Password form state
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Two-factor authentication state
  const [twoFactorSettings, setTwoFactorSettings] = useState<TwoFactorSettings>({
    enabled: false,
    backupCodes: []
  });
  
  // UI states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Loading and status states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Security preferences
  const [securityPreferences, setSecurityPreferences] = useState({
    requirePasswordForSensitiveActions: true,
    logoutInactiveDevices: false,
    emailSecurityAlerts: true
  });

  // Account deletion states
  const [showExitSurvey, setShowExitSurvey] = useState(false);

  // Load security settings on mount
  useEffect(() => {
    loadSecuritySettings();
  }, []);

  // Load security settings
  const loadSecuritySettings = async () => {
    setLoading(true);
    try {
      const settings = await settingsService.getSecuritySettings();
      setTwoFactorSettings(settings.twoFactor || { enabled: false, backupCodes: [] });
      setSecurityPreferences(settings.preferences || securityPreferences);
    } catch (err) {
      console.error('Failed to load security settings:', err);
      setError('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  // Calculate password strength
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;
    
    // Character variety checks
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 15;
    
    return Math.min(strength, 100);
  };

  // Handle password form changes
  const handlePasswordInputChange = (field: keyof PasswordFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (field === 'newPassword') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
    
    // Clear success message when user starts typing
    if (success) setSuccess(null);
  };

  // Handle password change submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError('All password fields are required');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (passwordStrength < 60) {
      setError('Password is too weak. Please choose a stronger password.');
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await settingsService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      });
      
      setSuccess('Password updated successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordStrength(0);
    } catch (err) {
      console.error('Failed to change password:', err);
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  // Handle 2FA toggle
  const handleTwoFactorToggle = async () => {
    setSaving(true);
    setError(null);
    
    try {
      if (twoFactorSettings.enabled) {
        await settingsService.disableTwoFactor();
        setTwoFactorSettings({ enabled: false, backupCodes: [] });
        setSuccess('Two-factor authentication disabled');
      } else {
        const result = await settingsService.enableTwoFactor();
        setTwoFactorSettings({
          enabled: true,
          backupCodes: result.backupCodes,
          lastEnabledAt: new Date().toISOString()
        });
        setSuccess('Two-factor authentication enabled');
      }
    } catch (err) {
      console.error('Failed to toggle 2FA:', err);
      setError(err instanceof Error ? err.message : 'Failed to update two-factor authentication');
    } finally {
      setSaving(false);
    }
  };

  // Handle security preferences update
  const handlePreferencesUpdate = async (preference: keyof typeof securityPreferences) => {
    const newPreferences = {
      ...securityPreferences,
      [preference]: !securityPreferences[preference]
    };
    
    setSecurityPreferences(newPreferences);
    
    try {
      await settingsService.updateSecurityPreferences(newPreferences);
    } catch (err) {
      console.error('Failed to update preferences:', err);
      // Revert the change
      setSecurityPreferences(securityPreferences);
      setError('Failed to update security preferences');
    }
  };

  // Get password strength color
  const getPasswordStrengthColor = (strength: number): string => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Get password strength text
  const getPasswordStrengthText = (strength: number): string => {
    if (strength < 40) return 'Weak';
    if (strength < 70) return 'Good';
    return 'Strong';
  };

  // Clear status messages after a delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Handle logout (used by exit survey)
  const handleLogoutInstead = async () => {
    setShowExitSurvey(false);
    await logout();
    navigate('/', { replace: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{intl.formatMessage({ id: 'settings.security.loading' })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <Key className="w-6 h-6 text-primary" />
            <span>{intl.formatMessage({ id: 'settings.security.password.title' })}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{intl.formatMessage({ id: 'settings.security.password.current.label' })}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordInputChange('currentPassword')}
                  placeholder={intl.formatMessage({ id: 'settings.security.password.current.placeholder' })}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Separator />

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">{intl.formatMessage({ id: 'settings.security.password.new.label' })}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInputChange('newPassword')}
                  placeholder={intl.formatMessage({ id: 'settings.security.password.new.placeholder' })}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {passwordForm.newPassword && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{intl.formatMessage({ id: 'settings.security.password.strength.label' })}</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength < 40 ? 'text-red-600' :
                      passwordStrength < 70 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {intl.formatMessage({ id: `settings.security.password.strength.${getPasswordStrengthText(passwordStrength).toLowerCase()}` })}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{intl.formatMessage({ id: 'settings.security.password.confirm.label' })}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInputChange('confirmPassword')}
                  placeholder={intl.formatMessage({ id: 'settings.security.password.confirm.placeholder' })}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

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

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving || passwordStrength < 60}
                className="flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{intl.formatMessage({ id: 'settings.security.password.actions.updating' })}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{intl.formatMessage({ id: 'settings.security.password.actions.update' })}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication - Hidden until implemented */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5" />
            <span>Two-Factor Authentication</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <h4 className="font-medium text-gray-900">
                Secure your account with 2FA
              </h4>
              <p className="text-sm text-gray-600">
                Add an extra layer of security by requiring a verification code from your authenticator app.
              </p>
              {twoFactorSettings.enabled && twoFactorSettings.lastEnabledAt && (
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    Enabled {new Date(twoFactorSettings.lastEnabledAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-4">
              <Button
                onClick={handleTwoFactorToggle}
                disabled={saving}
                variant={twoFactorSettings.enabled ? "destructive" : "default"}
                size="sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : twoFactorSettings.enabled ? (
                  <AlertTriangle className="w-4 h-4 mr-2" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                {twoFactorSettings.enabled ? 'Disable 2FA' : 'Enable 2FA'}
              </Button>
            </div>
          </div>
          
          {twoFactorSettings.enabled && twoFactorSettings.backupCodes.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h5 className="font-medium text-gray-900 mb-2">Backup Codes</h5>
              <p className="text-xs text-gray-600 mb-3">
                Store these codes in a safe place. You can use them to access your account if you lose your authenticator app.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {twoFactorSettings.backupCodes.map((code, index) => (
                  <div key={index} className="bg-white p-2 rounded border">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card> */}

      {/* Security Preferences - Hidden until implemented
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Security Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="requirePassword"
              checked={securityPreferences.requirePasswordForSensitiveActions}
              onCheckedChange={() => handlePreferencesUpdate('requirePasswordForSensitiveActions')}
            />
            <div className="space-y-1">
              <Label htmlFor="requirePassword" className="font-medium">
                Require password for sensitive actions
              </Label>
              <p className="text-sm text-gray-600">
                Require your password before changing security settings or deleting data.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="logoutDevices"
              checked={securityPreferences.logoutInactiveDevices}
              onCheckedChange={() => handlePreferencesUpdate('logoutInactiveDevices')}
            />
            <div className="space-y-1">
              <Label htmlFor="logoutDevices" className="font-medium">
                Auto-logout inactive devices
              </Label>
              <p className="text-sm text-gray-600">
                Automatically log out devices that haven't been used for 30 days.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="securityAlerts"
              checked={securityPreferences.emailSecurityAlerts}
              onCheckedChange={() => handlePreferencesUpdate('emailSecurityAlerts')}
            />
            <div className="space-y-1">
              <Label htmlFor="securityAlerts" className="font-medium">
                Email security alerts
              </Label>
              <p className="text-sm text-gray-600">
                Receive email notifications about important security events on your account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Danger Zone - Account Deletion */}
      <Card className="border-2 border-red-300 bg-red-50">
        <CardHeader className="bg-red-100/50 border-b-2 border-red-200">
          <CardTitle className="flex items-center space-x-2 text-red-700">
            <Trash2 className="w-6 h-6" />
            <span>{intl.formatMessage({ id: 'settings.security.deleteAccount.title' })}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-start space-x-3 p-4 bg-red-100 border-2 border-red-300 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-red-900">
                {intl.formatMessage({ id: 'settings.security.deleteAccount.warning.title' })}
              </h4>
              <p className="text-sm text-red-800">
                {intl.formatMessage({ id: 'settings.security.deleteAccount.warning.description' })}
              </p>
              <ul className="text-sm text-red-800 list-disc list-inside space-y-1 mt-2">
                <li>{intl.formatMessage({ id: 'settings.security.deleteAccount.warning.item1' })}</li>
                <li>{intl.formatMessage({ id: 'settings.security.deleteAccount.warning.item2' })}</li>
                <li>{intl.formatMessage({ id: 'settings.security.deleteAccount.warning.item3' })}</li>
                <li>{intl.formatMessage({ id: 'settings.security.deleteAccount.warning.item4' })}</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-700">
                {intl.formatMessage({ id: 'settings.security.deleteAccount.learnMore.text' })}
              </p>
              <a
                href="/data-deletion"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
              >
                {intl.formatMessage({ id: 'settings.security.deleteAccount.learnMore.link' })}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowExitSurvey(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'settings.security.deleteAccount.button' })}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Deletion Exit Survey */}
      <DeletionExitSurvey
        open={showExitSurvey}
        onOpenChange={setShowExitSurvey}
        onLogoutInstead={handleLogoutInstead}
      />
    </div>
  );
};

export default SecuritySettings;