/**
 * Profile Settings Component
 * User profile management settings
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage, LOCALE_LABELS, type SupportedLocale } from '../../contexts/LanguageContext';
import { useIntl } from 'react-intl';
import {
  User,
  Mail,
  Camera,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Upload,
  Phone,
  Globe,
  Clock,
  Search
} from 'lucide-react';
import { countryCodes } from '../../data/countryCodes';

// Components
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Separator } from '../../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

// Services
import { settingsService } from '@/lib/api/settings-api';

// Country codes data
const COUNTRY_CODES = [
  { code: '+1', country: 'US/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪' },
  { code: '+47', country: 'Norway', flag: '🇳🇴' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰' },
  { code: '+48', country: 'Poland', flag: '🇵🇱' },
  { code: '+90', country: 'Turkey', flag: '🇹🇷' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
];

// Timezone data
const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)', offset: '-05:00' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)', offset: '-06:00' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)', offset: '-07:00' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)', offset: '-08:00' },
  { value: 'America/Anchorage', label: 'Alaska', offset: '-09:00' },
  { value: 'Pacific/Honolulu', label: 'Hawaii', offset: '-10:00' },
  { value: 'America/Toronto', label: 'Toronto', offset: '-05:00' },
  { value: 'America/Vancouver', label: 'Vancouver', offset: '-08:00' },
  { value: 'America/Mexico_City', label: 'Mexico City', offset: '-06:00' },
  { value: 'America/Sao_Paulo', label: 'São Paulo', offset: '-03:00' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires', offset: '-03:00' },
  { value: 'Europe/London', label: 'London', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Paris', offset: '+01:00' },
  { value: 'Europe/Berlin', label: 'Berlin', offset: '+01:00' },
  { value: 'Europe/Rome', label: 'Rome', offset: '+01:00' },
  { value: 'Europe/Madrid', label: 'Madrid', offset: '+01:00' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam', offset: '+01:00' },
  { value: 'Europe/Stockholm', label: 'Stockholm', offset: '+01:00' },
  { value: 'Europe/Copenhagen', label: 'Copenhagen', offset: '+01:00' },
  { value: 'Europe/Oslo', label: 'Oslo', offset: '+01:00' },
  { value: 'Europe/Helsinki', label: 'Helsinki', offset: '+02:00' },
  { value: 'Europe/Athens', label: 'Athens', offset: '+02:00' },
  { value: 'Europe/Istanbul', label: 'Istanbul', offset: '+03:00' },
  { value: 'Europe/Moscow', label: 'Moscow', offset: '+03:00' },
  { value: 'Africa/Cairo', label: 'Cairo', offset: '+02:00' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg', offset: '+02:00' },
  { value: 'Africa/Lagos', label: 'Lagos', offset: '+01:00' },
  { value: 'Africa/Nairobi', label: 'Nairobi', offset: '+03:00' },
  { value: 'Asia/Dubai', label: 'Dubai', offset: '+04:00' },
  { value: 'Asia/Karachi', label: 'Karachi', offset: '+05:00' },
  { value: 'Asia/Kolkata', label: 'India (IST)', offset: '+05:30' },
  { value: 'Asia/Dhaka', label: 'Dhaka', offset: '+06:00' },
  { value: 'Asia/Bangkok', label: 'Bangkok', offset: '+07:00' },
  { value: 'Asia/Singapore', label: 'Singapore', offset: '+08:00' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', offset: '+08:00' },
  { value: 'Asia/Shanghai', label: 'Beijing', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: '+09:00' },
  { value: 'Asia/Seoul', label: 'Seoul', offset: '+09:00' },
  { value: 'Australia/Sydney', label: 'Sydney', offset: '+11:00' },
  { value: 'Australia/Melbourne', label: 'Melbourne', offset: '+11:00' },
  { value: 'Australia/Brisbane', label: 'Brisbane', offset: '+10:00' },
  { value: 'Australia/Perth', label: 'Perth', offset: '+08:00' },
  { value: 'Pacific/Auckland', label: 'Auckland', offset: '+13:00' },
  { value: 'Pacific/Fiji', label: 'Fiji', offset: '+12:00' },
];

// Types
interface ProfileFormData {
  name: string;
  email: string;
  bio?: string;
  phone?: string;
  countryCode?: string;
  location?: string;
  website?: string;
  timezone?: string;
  language?: SupportedLocale;
}


const ProfileSettings: React.FC = () => {
  const { user, updateProfile: updateUserProfile, refreshProfile } = useAuth();
  const { locale, setLocale } = useLanguage();
  const intl = useIntl();

  // Get browser timezone as default
  const getBrowserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  };

  // Form state
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    bio: '',
    phone: '',
    countryCode: '+1', // Default to US/Canada
    location: '',
    website: '',
    timezone: getBrowserTimezone(),
    language: locale
  });

  // Debug: Log formData changes with stack trace
  useEffect(() => {
    console.log('📝 FormData updated:', formData);
    console.trace('📍 FormData update call stack');
  }, [formData]);

  // Loading and status states
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null); // Store uploaded URL

  // Country selector states
  const [searchValue, setSearchValue] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+1'); // Default to US/Canada

  // Initialize form data from user
  useEffect(() => {
    if (user) {
      // Read phone from both root level and metadata for backward compatibility
      const userPhone = user.phone || (user.metadata?.phone as string) || '';
      const userCountryCode = (user.metadata?.countryCode as string) || '';

      // Use stored country code if available, otherwise try to extract from phone
      let countryCode = '';
      let phoneNumber = '';

      if (userCountryCode) {
        // Use stored country code
        countryCode = userCountryCode;
        phoneNumber = userPhone;
      } else if (userPhone) {
        // Fallback: try to extract country code from phone number for old data
        const matchedCode = COUNTRY_CODES.find(c => userPhone.startsWith(c.code));
        if (matchedCode) {
          countryCode = matchedCode.code;
          phoneNumber = userPhone.substring(matchedCode.code.length).trim();
        } else {
          phoneNumber = userPhone;
        }
      }

      const newFormData: ProfileFormData = {
        name: user.name || '',
        email: user.email || '',
        bio: (user.metadata?.bio as string) || '',
        phone: phoneNumber || '',
        countryCode: countryCode || '+1', // Default to US/Canada if not set
        location: (user.metadata?.location as string) || '',
        website: (user.metadata?.website as string) || '',
        timezone: (user.metadata?.timezone as string) || getBrowserTimezone(),
        language: (user.metadata?.language as SupportedLocale) || locale
      };

      console.log('🎯 Setting form data with countryCode:', countryCode);
      setFormData(newFormData);
      setSelectedCountryCode(countryCode); // Also update the selected country code state
      setAvatarPreview(user.avatarUrl || null);
    }
  }, [user]);

  // Handle click outside to close country dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.country-dropdown-container')) {
        setShowCountryDropdown(false);
      }
    };

    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCountryDropdown]);

  // Handle form field changes
  const handleInputChange = (field: keyof ProfileFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value = e.target.value;

    // For phone field, only allow numbers
    if (field === 'phone') {
      value = value.replace(/\D/g, ''); // Remove non-digits
    }

    console.log('🔄 handleInputChange called:', field, '=', value);

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear success message when user starts typing
    if (success) setSuccess(null);
  };

  // Handle country code change
  const handleCountryCodeChange = (value: string) => {
    console.log('🔄 handleCountryCodeChange called:', value);

    // Prevent setting empty string - keep the previous value
    if (!value || value.trim() === '') {
      console.log('⚠️ Ignoring empty country code change');
      return;
    }

    setFormData(prev => ({
      ...prev,
      countryCode: value
    }));
    if (success) setSuccess(null);
  };

  // Handle avatar file selection - Upload immediately
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('🖼️ Avatar file selected:', file.name, file.type, file.size);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Create preview URL immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('📸 Preview created');
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setError(null);
    setSaving(true);

    try {
      console.log('⬆️ Starting avatar upload...');
      // Upload avatar immediately to storage
      const response = await settingsService.uploadAvatar(file);
      console.log('✅ Avatar upload response:', response);

      // Get the uploaded URL from response
      const uploadedUrl = (response as any)?.profileImage;

      if (uploadedUrl) {
        console.log('✅ Image uploaded to storage:', uploadedUrl);
        // Store the URL to be saved when user clicks "Save Changes"
        setUploadedAvatarUrl(uploadedUrl);
        setSuccess('Image uploaded! Click "Save Changes" to update your profile.');
        console.log('✅ Avatar upload complete! URL will be saved on form submit.');
      } else {
        console.warn('⚠️ No URL found in response:', response);
        setError('Avatar uploaded but URL not returned');
      }
    } catch (err) {
      console.error('❌ Failed to upload avatar:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
      // Reset preview on error
      setAvatarPreview(user?.avatarUrl || null);
    } finally {
      setSaving(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('User not found');
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Prepare update data according to the API schema
      // Always use the logged-in user's email from auth context
      // Send country code and phone number separately
      const updateData = {
        name: formData.name,
        email: user.email, // Use logged-in user's email directly
        website: formData.website || '',
        bio: formData.bio || '',
        phone: formData.phone || '',
        countryCode: formData.countryCode || '',
        location: formData.location || '',
        timezone: formData.timezone || 'UTC',
        language: formData.language || 'en',
        // Include the uploaded avatar URL if available
        ...(uploadedAvatarUrl && { avatarUrl: uploadedAvatarUrl })
      };

      console.log('💾 Saving profile with data:', updateData);

      // Update profile (including avatar URL if uploaded)
      await settingsService.updateProfile(updateData);

      // If language changed, update the language context
      if (formData.language && formData.language !== locale) {
        setLocale(formData.language);
      }

      // Refresh user data from server to get updated profile
      await refreshProfile();

      setSuccess('Profile updated successfully');
      setUploadedAvatarUrl(null); // Clear uploaded URL after successful save
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
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

  return (
    <div className="space-y-6">
      {/* Profile Picture Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <span>{intl.formatMessage({ id: 'settings.profile.picture.title' })}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6">
            {/* Avatar Display */}
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
              
              {/* Upload overlay */}
              <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            
            {/* Upload Instructions */}
            <div>
              <p className="text-sm font-medium text-gray-900">{intl.formatMessage({ id: 'settings.profile.picture.change' })}</p>
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'settings.profile.picture.requirements' })}
              </p>
              <label className="mt-2">
                <Button variant="outline" size="sm" asChild>
                  <span className="cursor-pointer">
                    {intl.formatMessage({ id: 'settings.profile.picture.chooseFile' })}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>{intl.formatMessage({ id: 'settings.profile.personalInfo.title' })}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">{intl.formatMessage({ id: 'settings.profile.personalInfo.name.label' })}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  placeholder={intl.formatMessage({ id: 'settings.profile.personalInfo.name.placeholder' })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{intl.formatMessage({ id: 'settings.profile.personalInfo.email.label' })}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    placeholder={intl.formatMessage({ id: 'settings.profile.personalInfo.email.placeholder' })}
                    className="pl-10 bg-gray-100 cursor-not-allowed"
                    required
                    disabled
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phone Number with Country Selector */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  {intl.formatMessage({ id: 'settings.profile.personalInfo.phone.label' })}
                </Label>
                <div className="flex gap-2">
                  {/* Country Code Selector */}
                  <div className="relative country-dropdown-container">
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="flex items-center gap-2 px-3 h-10 border rounded-md bg-background hover:bg-accent hover:text-accent-foreground transition-colors min-w-[140px]"
                    >
                      {(() => {
                        const country = countryCodes.find(c => c.code === selectedCountryCode);
                        return country ? (
                          <>
                            <span className="text-xl">{country.flag}</span>
                            <span className="text-sm">{country.code}</span>
                          </>
                        ) : (
                          <span className="text-sm">Select...</span>
                        );
                      })()}
                      <Search className="ml-auto h-4 w-4 opacity-50" />
                    </button>

                    {/* Dropdown Menu */}
                    {showCountryDropdown && (
                      <div className="absolute top-full mt-1 w-[300px] bg-popover border rounded-md shadow-lg z-50 max-h-[300px] overflow-hidden">
                        {/* Search Input */}
                        <div className="p-2 border-b">
                          <Input
                            type="text"
                            placeholder="Search country..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="h-10"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {/* Country List */}
                        <div className="max-h-[240px] overflow-y-auto">
                          {countryCodes
                            .filter(country =>
                              country.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                              country.code.includes(searchValue)
                            )
                            .map((country) => (
                              <button
                                key={country.iso}
                                type="button"
                                onClick={() => {
                                  setSelectedCountryCode(country.code);
                                  setFormData({ ...formData, countryCode: country.code });
                                  setShowCountryDropdown(false);
                                  setSearchValue('');
                                }}
                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                              >
                                <span className="text-xl">{country.flag}</span>
                                <span className="flex-1 text-sm">{country.name}</span>
                                <span className="text-xs text-muted-foreground">{country.code}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phone Number Input */}
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="1234567890"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500">{intl.formatMessage({ id: 'settings.profile.personalInfo.phone.hint' })}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{intl.formatMessage({ id: 'settings.profile.personalInfo.location.label' })}</Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={handleInputChange('location')}
                  placeholder={intl.formatMessage({ id: 'settings.profile.personalInfo.location.placeholder' })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="website">{intl.formatMessage({ id: 'settings.profile.personalInfo.website.label' })}</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website || ''}
                  onChange={handleInputChange('website')}
                  placeholder={intl.formatMessage({ id: 'settings.profile.personalInfo.website.placeholder' })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">{intl.formatMessage({ id: 'settings.profile.personalInfo.bio.label' })}</Label>
                <Input
                  id="bio"
                  value={formData.bio || ''}
                  onChange={handleInputChange('bio')}
                  placeholder={intl.formatMessage({ id: 'settings.profile.personalInfo.bio.placeholder' })}
                />
              </div>
            </div>

            <Separator />

            {/* Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 relative">
                <Label htmlFor="timezone">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {intl.formatMessage({ id: 'profile.settings.timezone.label' })}
                  </div>
                </Label>
                <Select
                  value={formData.timezone || 'UTC'}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, timezone: value }));
                    if (success) setSuccess(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={intl.formatMessage({ id: 'profile.settings.timezone.placeholder' })} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label} <span className="text-xs text-gray-500">({tz.offset})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {intl.formatMessage({ id: 'profile.settings.timezone.description' })}
                </p>
              </div>

              <div className="space-y-2 relative">
                <Label htmlFor="language">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {intl.formatMessage({ id: 'profile.settings.language.label' })}
                  </div>
                </Label>
                <Select
                  value={formData.language || locale}
                  onValueChange={(value: SupportedLocale) => {
                    setFormData(prev => ({ ...prev, language: value }));
                    if (success) setSuccess(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={intl.formatMessage({ id: 'profile.settings.language.placeholder' })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">
                      <span className="flex items-center gap-2">
                        🇺🇸 {LOCALE_LABELS.en}
                      </span>
                    </SelectItem>
                    <SelectItem value="ja">
                      <span className="flex items-center gap-2">
                        🇯🇵 {LOCALE_LABELS.ja}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {intl.formatMessage({ id: 'profile.settings.language.description' })}
                </p>
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
                disabled={saving}
                className="flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{intl.formatMessage({ id: 'settings.profile.actions.saving' })}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{intl.formatMessage({ id: 'settings.profile.actions.save' })}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettings;