import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/auth_service.dart';
import '../widgets/deletion_exit_survey.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  bool _hasChanges = false;
  bool _isUploadingImage = false;
  Map<String, dynamic>? _userData;
  String? _errorMessage;
  String? _uploadedAvatarUrl; // Temporarily store uploaded avatar URL
  String _selectedCountry = 'US'; // Default country (ISO code) for phone
  String _selectedTimezone = 'UTC'; // Default timezone
  String _selectedLanguage = 'en'; // Default language
  String _selectedLocationCountry = 'US'; // Default location country (ISO code)

  // Image picker
  final ImagePicker _imagePicker = ImagePicker();

  // Timezones list
  final List<Map<String, String>> _timezones = [
    {'value': 'UTC', 'label': 'UTC (Coordinated Universal Time)'},
    {'value': 'America/New_York', 'label': 'Eastern Time (US & Canada)'},
    {'value': 'America/Chicago', 'label': 'Central Time (US & Canada)'},
    {'value': 'America/Denver', 'label': 'Mountain Time (US & Canada)'},
    {'value': 'America/Los_Angeles', 'label': 'Pacific Time (US & Canada)'},
    {'value': 'America/Anchorage', 'label': 'Alaska'},
    {'value': 'Pacific/Honolulu', 'label': 'Hawaii'},
    {'value': 'America/Toronto', 'label': 'Toronto'},
    {'value': 'America/Vancouver', 'label': 'Vancouver'},
    {'value': 'America/Mexico_City', 'label': 'Mexico City'},
    {'value': 'America/Sao_Paulo', 'label': 'Sao Paulo'},
    {'value': 'America/Buenos_Aires', 'label': 'Buenos Aires'},
    {'value': 'America/Santiago', 'label': 'Santiago'},
    {'value': 'America/Bogota', 'label': 'Bogota'},
    {'value': 'America/Lima', 'label': 'Lima'},
    {'value': 'Europe/London', 'label': 'London'},
    {'value': 'Europe/Paris', 'label': 'Paris'},
    {'value': 'Europe/Berlin', 'label': 'Berlin'},
    {'value': 'Europe/Rome', 'label': 'Rome'},
    {'value': 'Europe/Madrid', 'label': 'Madrid'},
    {'value': 'Europe/Amsterdam', 'label': 'Amsterdam'},
    {'value': 'Europe/Brussels', 'label': 'Brussels'},
    {'value': 'Europe/Vienna', 'label': 'Vienna'},
    {'value': 'Europe/Zurich', 'label': 'Zurich'},
    {'value': 'Europe/Stockholm', 'label': 'Stockholm'},
    {'value': 'Europe/Oslo', 'label': 'Oslo'},
    {'value': 'Europe/Copenhagen', 'label': 'Copenhagen'},
    {'value': 'Europe/Helsinki', 'label': 'Helsinki'},
    {'value': 'Europe/Warsaw', 'label': 'Warsaw'},
    {'value': 'Europe/Prague', 'label': 'Prague'},
    {'value': 'Europe/Budapest', 'label': 'Budapest'},
    {'value': 'Europe/Athens', 'label': 'Athens'},
    {'value': 'Europe/Istanbul', 'label': 'Istanbul'},
    {'value': 'Europe/Moscow', 'label': 'Moscow'},
    {'value': 'Europe/Kiev', 'label': 'Kyiv'},
    {'value': 'Africa/Cairo', 'label': 'Cairo'},
    {'value': 'Africa/Johannesburg', 'label': 'Johannesburg'},
    {'value': 'Africa/Lagos', 'label': 'Lagos'},
    {'value': 'Africa/Nairobi', 'label': 'Nairobi'},
    {'value': 'Asia/Dubai', 'label': 'Dubai'},
    {'value': 'Asia/Riyadh', 'label': 'Riyadh'},
    {'value': 'Asia/Tehran', 'label': 'Tehran'},
    {'value': 'Asia/Karachi', 'label': 'Karachi'},
    {'value': 'Asia/Kolkata', 'label': 'India (Kolkata)'},
    {'value': 'Asia/Mumbai', 'label': 'Mumbai'},
    {'value': 'Asia/Dhaka', 'label': 'Dhaka'},
    {'value': 'Asia/Bangkok', 'label': 'Bangkok'},
    {'value': 'Asia/Jakarta', 'label': 'Jakarta'},
    {'value': 'Asia/Singapore', 'label': 'Singapore'},
    {'value': 'Asia/Kuala_Lumpur', 'label': 'Kuala Lumpur'},
    {'value': 'Asia/Hong_Kong', 'label': 'Hong Kong'},
    {'value': 'Asia/Shanghai', 'label': 'Shanghai'},
    {'value': 'Asia/Beijing', 'label': 'Beijing'},
    {'value': 'Asia/Taipei', 'label': 'Taipei'},
    {'value': 'Asia/Seoul', 'label': 'Seoul'},
    {'value': 'Asia/Tokyo', 'label': 'Tokyo'},
    {'value': 'Asia/Manila', 'label': 'Manila'},
    {'value': 'Australia/Sydney', 'label': 'Sydney'},
    {'value': 'Australia/Melbourne', 'label': 'Melbourne'},
    {'value': 'Australia/Brisbane', 'label': 'Brisbane'},
    {'value': 'Australia/Perth', 'label': 'Perth'},
    {'value': 'Australia/Adelaide', 'label': 'Adelaide'},
    {'value': 'Pacific/Auckland', 'label': 'Auckland'},
    {'value': 'Pacific/Fiji', 'label': 'Fiji'},
  ];

  // Languages list
  final List<Map<String, String>> _languages = [
    {'value': 'en', 'label': 'English'},
    {'value': 'ja', 'label': 'Japanese (日本語)'},
  ];

  // Country to timezone mapping (ISO country code -> timezone value)
  final Map<String, String> _countryTimezones = {
    'AF': 'Asia/Kabul',
    'AL': 'Europe/Berlin',
    'DZ': 'Africa/Lagos',
    'AS': 'Pacific/Honolulu',
    'AD': 'Europe/Paris',
    'AO': 'Africa/Lagos',
    'AI': 'America/New_York',
    'AG': 'America/New_York',
    'AR': 'America/Buenos_Aires',
    'AM': 'Asia/Dubai',
    'AW': 'America/New_York',
    'AU': 'Australia/Sydney',
    'AT': 'Europe/Vienna',
    'AZ': 'Asia/Dubai',
    'BS': 'America/New_York',
    'BH': 'Asia/Dubai',
    'BD': 'Asia/Dhaka',
    'BB': 'America/New_York',
    'BY': 'Europe/Moscow',
    'BE': 'Europe/Brussels',
    'BZ': 'America/Mexico_City',
    'BJ': 'Africa/Lagos',
    'BM': 'America/New_York',
    'BT': 'Asia/Dhaka',
    'BO': 'America/Lima',
    'BA': 'Europe/Berlin',
    'BW': 'Africa/Johannesburg',
    'BR': 'America/Sao_Paulo',
    'IO': 'Asia/Dubai',
    'VG': 'America/New_York',
    'BN': 'Asia/Singapore',
    'BG': 'Europe/Athens',
    'BF': 'UTC',
    'BI': 'Africa/Johannesburg',
    'KH': 'Asia/Bangkok',
    'CM': 'Africa/Lagos',
    'CA': 'America/Toronto',
    'CV': 'UTC',
    'KY': 'America/New_York',
    'CF': 'Africa/Lagos',
    'TD': 'Africa/Lagos',
    'CL': 'America/Santiago',
    'CN': 'Asia/Shanghai',
    'CX': 'Asia/Bangkok',
    'CC': 'Asia/Bangkok',
    'CO': 'America/Bogota',
    'KM': 'Africa/Nairobi',
    'CK': 'Pacific/Auckland',
    'CR': 'America/Mexico_City',
    'HR': 'Europe/Berlin',
    'CU': 'America/New_York',
    'CW': 'America/New_York',
    'CY': 'Europe/Athens',
    'CZ': 'Europe/Prague',
    'CD': 'Africa/Lagos',
    'DK': 'Europe/Copenhagen',
    'DJ': 'Africa/Nairobi',
    'DM': 'America/New_York',
    'DO': 'America/New_York',
    'TL': 'Asia/Tokyo',
    'EC': 'America/Lima',
    'EG': 'Africa/Cairo',
    'SV': 'America/Mexico_City',
    'GQ': 'Africa/Lagos',
    'ER': 'Africa/Nairobi',
    'EE': 'Europe/Helsinki',
    'ET': 'Africa/Nairobi',
    'FK': 'America/Buenos_Aires',
    'FO': 'UTC',
    'FJ': 'Pacific/Fiji',
    'FI': 'Europe/Helsinki',
    'FR': 'Europe/Paris',
    'PF': 'Pacific/Honolulu',
    'GA': 'Africa/Lagos',
    'GM': 'UTC',
    'GE': 'Asia/Dubai',
    'DE': 'Europe/Berlin',
    'GH': 'UTC',
    'GI': 'Europe/London',
    'GR': 'Europe/Athens',
    'GL': 'America/New_York',
    'GD': 'America/New_York',
    'GU': 'Asia/Tokyo',
    'GT': 'America/Mexico_City',
    'GG': 'Europe/London',
    'GN': 'UTC',
    'GW': 'UTC',
    'GY': 'America/New_York',
    'HT': 'America/New_York',
    'HN': 'America/Mexico_City',
    'HK': 'Asia/Hong_Kong',
    'HU': 'Europe/Budapest',
    'IS': 'UTC',
    'IN': 'Asia/Kolkata',
    'ID': 'Asia/Jakarta',
    'IR': 'Asia/Tehran',
    'IQ': 'Asia/Dubai',
    'IE': 'Europe/London',
    'IM': 'Europe/London',
    'IL': 'Europe/Athens',
    'IT': 'Europe/Rome',
    'CI': 'UTC',
    'JM': 'America/New_York',
    'JP': 'Asia/Tokyo',
    'JE': 'Europe/London',
    'JO': 'Europe/Athens',
    'KZ': 'Asia/Dubai',
    'KE': 'Africa/Nairobi',
    'KI': 'Pacific/Fiji',
    'XK': 'Europe/Berlin',
    'KW': 'Asia/Dubai',
    'KG': 'Asia/Dhaka',
    'LA': 'Asia/Bangkok',
    'LV': 'Europe/Helsinki',
    'LB': 'Europe/Athens',
    'LS': 'Africa/Johannesburg',
    'LR': 'UTC',
    'LY': 'Africa/Cairo',
    'LI': 'Europe/Zurich',
    'LT': 'Europe/Helsinki',
    'LU': 'Europe/Brussels',
    'MO': 'Asia/Hong_Kong',
    'MK': 'Europe/Berlin',
    'MG': 'Africa/Nairobi',
    'MW': 'Africa/Johannesburg',
    'MY': 'Asia/Kuala_Lumpur',
    'MV': 'Asia/Kolkata',
    'ML': 'UTC',
    'MT': 'Europe/Rome',
    'MH': 'Pacific/Fiji',
    'MR': 'UTC',
    'MU': 'Asia/Dubai',
    'YT': 'Africa/Nairobi',
    'MX': 'America/Mexico_City',
    'FM': 'Asia/Tokyo',
    'MD': 'Europe/Athens',
    'MC': 'Europe/Paris',
    'MN': 'Asia/Shanghai',
    'ME': 'Europe/Berlin',
    'MS': 'America/New_York',
    'MA': 'Europe/London',
    'MZ': 'Africa/Johannesburg',
    'MM': 'Asia/Bangkok',
    'NA': 'Africa/Johannesburg',
    'NR': 'Pacific/Fiji',
    'NP': 'Asia/Kolkata',
    'NL': 'Europe/Amsterdam',
    'NC': 'Pacific/Fiji',
    'NZ': 'Pacific/Auckland',
    'NI': 'America/Mexico_City',
    'NE': 'Africa/Lagos',
    'NG': 'Africa/Lagos',
    'NU': 'Pacific/Auckland',
    'KP': 'Asia/Seoul',
    'MP': 'Asia/Tokyo',
    'NO': 'Europe/Oslo',
    'OM': 'Asia/Dubai',
    'PK': 'Asia/Karachi',
    'PW': 'Asia/Tokyo',
    'PS': 'Europe/Athens',
    'PA': 'America/New_York',
    'PG': 'Asia/Tokyo',
    'PY': 'America/Sao_Paulo',
    'PE': 'America/Lima',
    'PH': 'Asia/Manila',
    'PL': 'Europe/Warsaw',
    'PT': 'Europe/London',
    'PR': 'America/New_York',
    'QA': 'Asia/Dubai',
    'CG': 'Africa/Lagos',
    'RE': 'Asia/Dubai',
    'RO': 'Europe/Athens',
    'RU': 'Europe/Moscow',
    'RW': 'Africa/Johannesburg',
    'BL': 'America/New_York',
    'SH': 'UTC',
    'KN': 'America/New_York',
    'LC': 'America/New_York',
    'MF': 'America/New_York',
    'PM': 'America/New_York',
    'VC': 'America/New_York',
    'WS': 'Pacific/Auckland',
    'SM': 'Europe/Rome',
    'ST': 'UTC',
    'SA': 'Asia/Riyadh',
    'SN': 'UTC',
    'RS': 'Europe/Berlin',
    'SC': 'Asia/Dubai',
    'SL': 'UTC',
    'SG': 'Asia/Singapore',
    'SX': 'America/New_York',
    'SK': 'Europe/Prague',
    'SI': 'Europe/Berlin',
    'SB': 'Pacific/Fiji',
    'SO': 'Africa/Nairobi',
    'ZA': 'Africa/Johannesburg',
    'KR': 'Asia/Seoul',
    'SS': 'Africa/Nairobi',
    'ES': 'Europe/Madrid',
    'LK': 'Asia/Kolkata',
    'SD': 'Africa/Cairo',
    'SR': 'America/Sao_Paulo',
    'SJ': 'Europe/Oslo',
    'SZ': 'Africa/Johannesburg',
    'SE': 'Europe/Stockholm',
    'CH': 'Europe/Zurich',
    'SY': 'Europe/Athens',
    'TW': 'Asia/Taipei',
    'TJ': 'Asia/Kolkata',
    'TZ': 'Africa/Nairobi',
    'TH': 'Asia/Bangkok',
    'TG': 'UTC',
    'TK': 'Pacific/Auckland',
    'TO': 'Pacific/Fiji',
    'TT': 'America/New_York',
    'TN': 'Europe/Paris',
    'TR': 'Europe/Istanbul',
    'TM': 'Asia/Kolkata',
    'TC': 'America/New_York',
    'TV': 'Pacific/Fiji',
    'VI': 'America/New_York',
    'UG': 'Africa/Nairobi',
    'UA': 'Europe/Kiev',
    'AE': 'Asia/Dubai',
    'GB': 'Europe/London',
    'US': 'America/New_York',
    'UY': 'America/Sao_Paulo',
    'UZ': 'Asia/Kolkata',
    'VU': 'Pacific/Fiji',
    'VA': 'Europe/Rome',
    'VE': 'America/New_York',
    'VN': 'Asia/Bangkok',
    'WF': 'Pacific/Fiji',
    'EH': 'Europe/London',
    'YE': 'Asia/Dubai',
    'ZM': 'Africa/Johannesburg',
    'ZW': 'Africa/Johannesburg',
  };

  // All country codes (sorted alphabetically by country name)
  final List<Map<String, String>> _countryCodes = [
    {'code': '+93', 'country': 'AF', 'name': 'Afghanistan'},
    {'code': '+355', 'country': 'AL', 'name': 'Albania'},
    {'code': '+213', 'country': 'DZ', 'name': 'Algeria'},
    {'code': '+1684', 'country': 'AS', 'name': 'American Samoa'},
    {'code': '+376', 'country': 'AD', 'name': 'Andorra'},
    {'code': '+244', 'country': 'AO', 'name': 'Angola'},
    {'code': '+1264', 'country': 'AI', 'name': 'Anguilla'},
    {'code': '+1268', 'country': 'AG', 'name': 'Antigua and Barbuda'},
    {'code': '+54', 'country': 'AR', 'name': 'Argentina'},
    {'code': '+374', 'country': 'AM', 'name': 'Armenia'},
    {'code': '+297', 'country': 'AW', 'name': 'Aruba'},
    {'code': '+61', 'country': 'AU', 'name': 'Australia'},
    {'code': '+43', 'country': 'AT', 'name': 'Austria'},
    {'code': '+994', 'country': 'AZ', 'name': 'Azerbaijan'},
    {'code': '+1242', 'country': 'BS', 'name': 'Bahamas'},
    {'code': '+973', 'country': 'BH', 'name': 'Bahrain'},
    {'code': '+880', 'country': 'BD', 'name': 'Bangladesh'},
    {'code': '+1246', 'country': 'BB', 'name': 'Barbados'},
    {'code': '+375', 'country': 'BY', 'name': 'Belarus'},
    {'code': '+32', 'country': 'BE', 'name': 'Belgium'},
    {'code': '+501', 'country': 'BZ', 'name': 'Belize'},
    {'code': '+229', 'country': 'BJ', 'name': 'Benin'},
    {'code': '+1441', 'country': 'BM', 'name': 'Bermuda'},
    {'code': '+975', 'country': 'BT', 'name': 'Bhutan'},
    {'code': '+591', 'country': 'BO', 'name': 'Bolivia'},
    {'code': '+387', 'country': 'BA', 'name': 'Bosnia and Herzegovina'},
    {'code': '+267', 'country': 'BW', 'name': 'Botswana'},
    {'code': '+55', 'country': 'BR', 'name': 'Brazil'},
    {'code': '+246', 'country': 'IO', 'name': 'British Indian Ocean Territory'},
    {'code': '+1284', 'country': 'VG', 'name': 'British Virgin Islands'},
    {'code': '+673', 'country': 'BN', 'name': 'Brunei'},
    {'code': '+359', 'country': 'BG', 'name': 'Bulgaria'},
    {'code': '+226', 'country': 'BF', 'name': 'Burkina Faso'},
    {'code': '+257', 'country': 'BI', 'name': 'Burundi'},
    {'code': '+855', 'country': 'KH', 'name': 'Cambodia'},
    {'code': '+237', 'country': 'CM', 'name': 'Cameroon'},
    {'code': '+1', 'country': 'CA', 'name': 'Canada'},
    {'code': '+238', 'country': 'CV', 'name': 'Cape Verde'},
    {'code': '+1345', 'country': 'KY', 'name': 'Cayman Islands'},
    {'code': '+236', 'country': 'CF', 'name': 'Central African Republic'},
    {'code': '+235', 'country': 'TD', 'name': 'Chad'},
    {'code': '+56', 'country': 'CL', 'name': 'Chile'},
    {'code': '+86', 'country': 'CN', 'name': 'China'},
    {'code': '+61', 'country': 'CX', 'name': 'Christmas Island'},
    {'code': '+61', 'country': 'CC', 'name': 'Cocos Islands'},
    {'code': '+57', 'country': 'CO', 'name': 'Colombia'},
    {'code': '+269', 'country': 'KM', 'name': 'Comoros'},
    {'code': '+682', 'country': 'CK', 'name': 'Cook Islands'},
    {'code': '+506', 'country': 'CR', 'name': 'Costa Rica'},
    {'code': '+385', 'country': 'HR', 'name': 'Croatia'},
    {'code': '+53', 'country': 'CU', 'name': 'Cuba'},
    {'code': '+599', 'country': 'CW', 'name': 'Curacao'},
    {'code': '+357', 'country': 'CY', 'name': 'Cyprus'},
    {'code': '+420', 'country': 'CZ', 'name': 'Czech Republic'},
    {'code': '+243', 'country': 'CD', 'name': 'Democratic Republic of the Congo'},
    {'code': '+45', 'country': 'DK', 'name': 'Denmark'},
    {'code': '+253', 'country': 'DJ', 'name': 'Djibouti'},
    {'code': '+1767', 'country': 'DM', 'name': 'Dominica'},
    {'code': '+1809', 'country': 'DO', 'name': 'Dominican Republic'},
    {'code': '+670', 'country': 'TL', 'name': 'East Timor'},
    {'code': '+593', 'country': 'EC', 'name': 'Ecuador'},
    {'code': '+20', 'country': 'EG', 'name': 'Egypt'},
    {'code': '+503', 'country': 'SV', 'name': 'El Salvador'},
    {'code': '+240', 'country': 'GQ', 'name': 'Equatorial Guinea'},
    {'code': '+291', 'country': 'ER', 'name': 'Eritrea'},
    {'code': '+372', 'country': 'EE', 'name': 'Estonia'},
    {'code': '+251', 'country': 'ET', 'name': 'Ethiopia'},
    {'code': '+500', 'country': 'FK', 'name': 'Falkland Islands'},
    {'code': '+298', 'country': 'FO', 'name': 'Faroe Islands'},
    {'code': '+679', 'country': 'FJ', 'name': 'Fiji'},
    {'code': '+358', 'country': 'FI', 'name': 'Finland'},
    {'code': '+33', 'country': 'FR', 'name': 'France'},
    {'code': '+689', 'country': 'PF', 'name': 'French Polynesia'},
    {'code': '+241', 'country': 'GA', 'name': 'Gabon'},
    {'code': '+220', 'country': 'GM', 'name': 'Gambia'},
    {'code': '+995', 'country': 'GE', 'name': 'Georgia'},
    {'code': '+49', 'country': 'DE', 'name': 'Germany'},
    {'code': '+233', 'country': 'GH', 'name': 'Ghana'},
    {'code': '+350', 'country': 'GI', 'name': 'Gibraltar'},
    {'code': '+30', 'country': 'GR', 'name': 'Greece'},
    {'code': '+299', 'country': 'GL', 'name': 'Greenland'},
    {'code': '+1473', 'country': 'GD', 'name': 'Grenada'},
    {'code': '+1671', 'country': 'GU', 'name': 'Guam'},
    {'code': '+502', 'country': 'GT', 'name': 'Guatemala'},
    {'code': '+44', 'country': 'GG', 'name': 'Guernsey'},
    {'code': '+224', 'country': 'GN', 'name': 'Guinea'},
    {'code': '+245', 'country': 'GW', 'name': 'Guinea-Bissau'},
    {'code': '+592', 'country': 'GY', 'name': 'Guyana'},
    {'code': '+509', 'country': 'HT', 'name': 'Haiti'},
    {'code': '+504', 'country': 'HN', 'name': 'Honduras'},
    {'code': '+852', 'country': 'HK', 'name': 'Hong Kong'},
    {'code': '+36', 'country': 'HU', 'name': 'Hungary'},
    {'code': '+354', 'country': 'IS', 'name': 'Iceland'},
    {'code': '+91', 'country': 'IN', 'name': 'India'},
    {'code': '+62', 'country': 'ID', 'name': 'Indonesia'},
    {'code': '+98', 'country': 'IR', 'name': 'Iran'},
    {'code': '+964', 'country': 'IQ', 'name': 'Iraq'},
    {'code': '+353', 'country': 'IE', 'name': 'Ireland'},
    {'code': '+44', 'country': 'IM', 'name': 'Isle of Man'},
    {'code': '+972', 'country': 'IL', 'name': 'Israel'},
    {'code': '+39', 'country': 'IT', 'name': 'Italy'},
    {'code': '+225', 'country': 'CI', 'name': 'Ivory Coast'},
    {'code': '+1876', 'country': 'JM', 'name': 'Jamaica'},
    {'code': '+81', 'country': 'JP', 'name': 'Japan'},
    {'code': '+44', 'country': 'JE', 'name': 'Jersey'},
    {'code': '+962', 'country': 'JO', 'name': 'Jordan'},
    {'code': '+7', 'country': 'KZ', 'name': 'Kazakhstan'},
    {'code': '+254', 'country': 'KE', 'name': 'Kenya'},
    {'code': '+686', 'country': 'KI', 'name': 'Kiribati'},
    {'code': '+383', 'country': 'XK', 'name': 'Kosovo'},
    {'code': '+965', 'country': 'KW', 'name': 'Kuwait'},
    {'code': '+996', 'country': 'KG', 'name': 'Kyrgyzstan'},
    {'code': '+856', 'country': 'LA', 'name': 'Laos'},
    {'code': '+371', 'country': 'LV', 'name': 'Latvia'},
    {'code': '+961', 'country': 'LB', 'name': 'Lebanon'},
    {'code': '+266', 'country': 'LS', 'name': 'Lesotho'},
    {'code': '+231', 'country': 'LR', 'name': 'Liberia'},
    {'code': '+218', 'country': 'LY', 'name': 'Libya'},
    {'code': '+423', 'country': 'LI', 'name': 'Liechtenstein'},
    {'code': '+370', 'country': 'LT', 'name': 'Lithuania'},
    {'code': '+352', 'country': 'LU', 'name': 'Luxembourg'},
    {'code': '+853', 'country': 'MO', 'name': 'Macau'},
    {'code': '+389', 'country': 'MK', 'name': 'Macedonia'},
    {'code': '+261', 'country': 'MG', 'name': 'Madagascar'},
    {'code': '+265', 'country': 'MW', 'name': 'Malawi'},
    {'code': '+60', 'country': 'MY', 'name': 'Malaysia'},
    {'code': '+960', 'country': 'MV', 'name': 'Maldives'},
    {'code': '+223', 'country': 'ML', 'name': 'Mali'},
    {'code': '+356', 'country': 'MT', 'name': 'Malta'},
    {'code': '+692', 'country': 'MH', 'name': 'Marshall Islands'},
    {'code': '+222', 'country': 'MR', 'name': 'Mauritania'},
    {'code': '+230', 'country': 'MU', 'name': 'Mauritius'},
    {'code': '+262', 'country': 'YT', 'name': 'Mayotte'},
    {'code': '+52', 'country': 'MX', 'name': 'Mexico'},
    {'code': '+691', 'country': 'FM', 'name': 'Micronesia'},
    {'code': '+373', 'country': 'MD', 'name': 'Moldova'},
    {'code': '+377', 'country': 'MC', 'name': 'Monaco'},
    {'code': '+976', 'country': 'MN', 'name': 'Mongolia'},
    {'code': '+382', 'country': 'ME', 'name': 'Montenegro'},
    {'code': '+1664', 'country': 'MS', 'name': 'Montserrat'},
    {'code': '+212', 'country': 'MA', 'name': 'Morocco'},
    {'code': '+258', 'country': 'MZ', 'name': 'Mozambique'},
    {'code': '+95', 'country': 'MM', 'name': 'Myanmar'},
    {'code': '+264', 'country': 'NA', 'name': 'Namibia'},
    {'code': '+674', 'country': 'NR', 'name': 'Nauru'},
    {'code': '+977', 'country': 'NP', 'name': 'Nepal'},
    {'code': '+31', 'country': 'NL', 'name': 'Netherlands'},
    {'code': '+687', 'country': 'NC', 'name': 'New Caledonia'},
    {'code': '+64', 'country': 'NZ', 'name': 'New Zealand'},
    {'code': '+505', 'country': 'NI', 'name': 'Nicaragua'},
    {'code': '+227', 'country': 'NE', 'name': 'Niger'},
    {'code': '+234', 'country': 'NG', 'name': 'Nigeria'},
    {'code': '+683', 'country': 'NU', 'name': 'Niue'},
    {'code': '+850', 'country': 'KP', 'name': 'North Korea'},
    {'code': '+1670', 'country': 'MP', 'name': 'Northern Mariana Islands'},
    {'code': '+47', 'country': 'NO', 'name': 'Norway'},
    {'code': '+968', 'country': 'OM', 'name': 'Oman'},
    {'code': '+92', 'country': 'PK', 'name': 'Pakistan'},
    {'code': '+680', 'country': 'PW', 'name': 'Palau'},
    {'code': '+970', 'country': 'PS', 'name': 'Palestine'},
    {'code': '+507', 'country': 'PA', 'name': 'Panama'},
    {'code': '+675', 'country': 'PG', 'name': 'Papua New Guinea'},
    {'code': '+595', 'country': 'PY', 'name': 'Paraguay'},
    {'code': '+51', 'country': 'PE', 'name': 'Peru'},
    {'code': '+63', 'country': 'PH', 'name': 'Philippines'},
    {'code': '+48', 'country': 'PL', 'name': 'Poland'},
    {'code': '+351', 'country': 'PT', 'name': 'Portugal'},
    {'code': '+1787', 'country': 'PR', 'name': 'Puerto Rico'},
    {'code': '+974', 'country': 'QA', 'name': 'Qatar'},
    {'code': '+242', 'country': 'CG', 'name': 'Republic of the Congo'},
    {'code': '+262', 'country': 'RE', 'name': 'Reunion'},
    {'code': '+40', 'country': 'RO', 'name': 'Romania'},
    {'code': '+7', 'country': 'RU', 'name': 'Russia'},
    {'code': '+250', 'country': 'RW', 'name': 'Rwanda'},
    {'code': '+590', 'country': 'BL', 'name': 'Saint Barthelemy'},
    {'code': '+290', 'country': 'SH', 'name': 'Saint Helena'},
    {'code': '+1869', 'country': 'KN', 'name': 'Saint Kitts and Nevis'},
    {'code': '+1758', 'country': 'LC', 'name': 'Saint Lucia'},
    {'code': '+590', 'country': 'MF', 'name': 'Saint Martin'},
    {'code': '+508', 'country': 'PM', 'name': 'Saint Pierre and Miquelon'},
    {'code': '+1784', 'country': 'VC', 'name': 'Saint Vincent and the Grenadines'},
    {'code': '+685', 'country': 'WS', 'name': 'Samoa'},
    {'code': '+378', 'country': 'SM', 'name': 'San Marino'},
    {'code': '+239', 'country': 'ST', 'name': 'Sao Tome and Principe'},
    {'code': '+966', 'country': 'SA', 'name': 'Saudi Arabia'},
    {'code': '+221', 'country': 'SN', 'name': 'Senegal'},
    {'code': '+381', 'country': 'RS', 'name': 'Serbia'},
    {'code': '+248', 'country': 'SC', 'name': 'Seychelles'},
    {'code': '+232', 'country': 'SL', 'name': 'Sierra Leone'},
    {'code': '+65', 'country': 'SG', 'name': 'Singapore'},
    {'code': '+1721', 'country': 'SX', 'name': 'Sint Maarten'},
    {'code': '+421', 'country': 'SK', 'name': 'Slovakia'},
    {'code': '+386', 'country': 'SI', 'name': 'Slovenia'},
    {'code': '+677', 'country': 'SB', 'name': 'Solomon Islands'},
    {'code': '+252', 'country': 'SO', 'name': 'Somalia'},
    {'code': '+27', 'country': 'ZA', 'name': 'South Africa'},
    {'code': '+82', 'country': 'KR', 'name': 'South Korea'},
    {'code': '+211', 'country': 'SS', 'name': 'South Sudan'},
    {'code': '+34', 'country': 'ES', 'name': 'Spain'},
    {'code': '+94', 'country': 'LK', 'name': 'Sri Lanka'},
    {'code': '+249', 'country': 'SD', 'name': 'Sudan'},
    {'code': '+597', 'country': 'SR', 'name': 'Suriname'},
    {'code': '+47', 'country': 'SJ', 'name': 'Svalbard and Jan Mayen'},
    {'code': '+268', 'country': 'SZ', 'name': 'Swaziland'},
    {'code': '+46', 'country': 'SE', 'name': 'Sweden'},
    {'code': '+41', 'country': 'CH', 'name': 'Switzerland'},
    {'code': '+963', 'country': 'SY', 'name': 'Syria'},
    {'code': '+886', 'country': 'TW', 'name': 'Taiwan'},
    {'code': '+992', 'country': 'TJ', 'name': 'Tajikistan'},
    {'code': '+255', 'country': 'TZ', 'name': 'Tanzania'},
    {'code': '+66', 'country': 'TH', 'name': 'Thailand'},
    {'code': '+228', 'country': 'TG', 'name': 'Togo'},
    {'code': '+690', 'country': 'TK', 'name': 'Tokelau'},
    {'code': '+676', 'country': 'TO', 'name': 'Tonga'},
    {'code': '+1868', 'country': 'TT', 'name': 'Trinidad and Tobago'},
    {'code': '+216', 'country': 'TN', 'name': 'Tunisia'},
    {'code': '+90', 'country': 'TR', 'name': 'Turkey'},
    {'code': '+993', 'country': 'TM', 'name': 'Turkmenistan'},
    {'code': '+1649', 'country': 'TC', 'name': 'Turks and Caicos Islands'},
    {'code': '+688', 'country': 'TV', 'name': 'Tuvalu'},
    {'code': '+1340', 'country': 'VI', 'name': 'U.S. Virgin Islands'},
    {'code': '+256', 'country': 'UG', 'name': 'Uganda'},
    {'code': '+380', 'country': 'UA', 'name': 'Ukraine'},
    {'code': '+971', 'country': 'AE', 'name': 'United Arab Emirates'},
    {'code': '+44', 'country': 'GB', 'name': 'United Kingdom'},
    {'code': '+1', 'country': 'US', 'name': 'United States'},
    {'code': '+598', 'country': 'UY', 'name': 'Uruguay'},
    {'code': '+998', 'country': 'UZ', 'name': 'Uzbekistan'},
    {'code': '+678', 'country': 'VU', 'name': 'Vanuatu'},
    {'code': '+379', 'country': 'VA', 'name': 'Vatican'},
    {'code': '+58', 'country': 'VE', 'name': 'Venezuela'},
    {'code': '+84', 'country': 'VN', 'name': 'Vietnam'},
    {'code': '+681', 'country': 'WF', 'name': 'Wallis and Futuna'},
    {'code': '+212', 'country': 'EH', 'name': 'Western Sahara'},
    {'code': '+967', 'country': 'YE', 'name': 'Yemen'},
    {'code': '+260', 'country': 'ZM', 'name': 'Zambia'},
    {'code': '+263', 'country': 'ZW', 'name': 'Zimbabwe'},
  ];

  // Form controllers
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _bioController = TextEditingController();
  final _githubController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _bioController.dispose();
    _githubController.dispose();
    super.dispose();
  }

  Future<void> _loadUserProfile() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await AuthService.instance.dio.get('/auth/me');

      if (response.statusCode == 200) {
        // Extract user data from nested response
        final userData = response.data['user'] ?? response.data;

        setState(() {
          _userData = userData;
          _isLoading = false;
        });

        // Populate form fields
        _nameController.text = _userData!['name'] ?? _userData!['metadata']?['full_name'] ?? '';
        _emailController.text = _userData!['email'] ?? '';

        // Parse phone number to extract country code
        final fullPhone = _userData!['phone'] ?? _userData!['metadata']?['phone'] ?? '';
        if (fullPhone.isNotEmpty) {
          // Try to extract country code from phone number (try longer codes first)
          final sortedCountries = List<Map<String, String>>.from(_countryCodes)
            ..sort((a, b) => b['code']!.length.compareTo(a['code']!.length));

          for (var country in sortedCountries) {
            if (fullPhone.startsWith(country['code']!)) {
              _selectedCountry = country['country']!;
              _phoneController.text = fullPhone.substring(country['code']!.length).trim();
              break;
            }
          }
          // If no country code found, use the full phone as is
          if (_phoneController.text.isEmpty) {
            _phoneController.text = fullPhone;
          }
        }

        // Parse location as country code or country name
        final locationValue = _userData!['location'] ?? _userData!['metadata']?['location'] ?? '';
        if (locationValue.isNotEmpty) {
          // Check if it's already a country code (2-letter ISO code)
          final matchingCountry = _countryCodes.firstWhere(
            (c) => c['country'] == locationValue.toUpperCase() ||
                   c['name']!.toLowerCase() == locationValue.toLowerCase(),
            orElse: () => {'country': 'US', 'name': 'United States', 'code': '+1'},
          );
          _selectedLocationCountry = matchingCountry['country']!;
        }

        _bioController.text = _userData!['bio'] ?? _userData!['metadata']?['bio'] ?? '';
        _githubController.text = _userData!['website'] ?? _userData!['metadata']?['website'] ?? '';

        // Load timezone and language
        final timezone = _userData!['timezone'] ?? _userData!['metadata']?['timezone'] ?? 'UTC';
        if (_timezones.any((t) => t['value'] == timezone)) {
          _selectedTimezone = timezone;
        }

        final language = _userData!['language'] ?? _userData!['metadata']?['language'] ?? 'en';
        if (_languages.any((l) => l['value'] == language)) {
          _selectedLanguage = language;
          // Apply the locale from user profile
          if (mounted) {
            context.setLocale(Locale(language));
          }
        }
      } else {
        throw Exception('Failed to load user profile');
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Future<void> _saveProfile() async {
    setState(() {
      _isSaving = true;
    });

    try {
      // Get the dial code for the selected country
      final selectedCountryData = _countryCodes.firstWhere(
        (c) => c['country'] == _selectedCountry,
        orElse: () => {'code': '+1', 'country': 'US', 'name': 'United States'},
      );
      final dialCode = selectedCountryData['code']!;

      // Combine country code + phone number
      final fullPhone = _phoneController.text.isNotEmpty
          ? '$dialCode${_phoneController.text}'
          : '';

      // Get the country name for the selected location country
      final selectedLocationData = _countryCodes.firstWhere(
        (c) => c['country'] == _selectedLocationCountry,
        orElse: () => {'code': '+1', 'country': 'US', 'name': 'United States'},
      );

      final response = await AuthService.instance.dio.put(
        '/auth/profile',
        data: {
          'name': _nameController.text,
          'email': _emailController.text,
          'phone': fullPhone,
          'location': selectedLocationData['name'],
          'bio': _bioController.text,
          'website': _githubController.text,
          'timezone': _selectedTimezone,
          'language': _selectedLanguage,
          if (_uploadedAvatarUrl != null) 'avatarUrl': _uploadedAvatarUrl,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        // Clear uploaded avatar URL and reload profile
        setState(() {
          _uploadedAvatarUrl = null;
          _isSaving = false;
          _hasChanges = false;
        });

        // Reload profile to get updated data
        await _loadUserProfile();

        // Update AuthService's currentUser with the new profile data
        await _updateAuthServiceUser();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('profile.profile_saved'.tr()),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        throw Exception('Failed to save profile');
      }
    } catch (e) {
      setState(() {
        _isSaving = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _onFieldChanged() {
    if (!_hasChanges) {
      setState(() {
        _hasChanges = true;
      });
    }
  }

  Future<void> _uploadProfileImage() async {
    try {
      // Show image source selection dialog
      final ImageSource? source = await showDialog<ImageSource>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text('profile.choose_image_source'.tr()),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: Text('profile.gallery'.tr()),
                onTap: () => Navigator.pop(dialogContext, ImageSource.gallery),
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: Text('profile.camera'.tr()),
                onTap: () => Navigator.pop(dialogContext, ImageSource.camera),
              ),
            ],
          ),
        ),
      );

      if (source == null) return;

      // Pick image
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (pickedFile == null) return;

      setState(() {
        _isUploadingImage = true;
      });

      // Prepare multipart file
      final formData = FormData.fromMap({
        'avatar': await MultipartFile.fromFile(
          pickedFile.path,
          filename: pickedFile.name,
        ),
      });

      // Upload to backend
      final response = await AuthService.instance.dio.post(
        '/auth/profile/image',
        data: formData,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Store the uploaded avatar URL temporarily
        final avatarUrl = response.data['profileImage'] ??
                         response.data['avatar_url'];

        setState(() {
          _uploadedAvatarUrl = avatarUrl;
          _hasChanges = true; // Show the Save button
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('profile.image_uploaded'.tr()),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        throw Exception('Failed to upload image');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${'profile.failed_to_upload_image'.tr()}: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUploadingImage = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('profile.title'.tr()),
        actions: [
          if (_hasChanges)
            _isSaving
                ? Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Theme.of(context).colorScheme.onPrimary,
                      ),
                    ),
                  )
                : Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ElevatedButton(
                      onPressed: _saveProfile,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Theme.of(context).colorScheme.primary,
                        elevation: 2,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      ),
                      child: Text(
                        'common.save'.tr(),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Theme.of(context).colorScheme.error,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'profile.failed_to_load_profile'.tr(),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        child: Text(
                          _errorMessage!,
                          style: Theme.of(context).textTheme.bodyMedium,
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: _loadUserProfile,
                        icon: const Icon(Icons.refresh),
                        label: Text('common.retry'.tr()),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  child: Column(
                    children: [
                      // Profile Header Section
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.1),
                        ),
                        child: Column(
                          children: [
                            Stack(
                              children: [
                                CircleAvatar(
                                  radius: 50,
                                  backgroundColor: Theme.of(context).colorScheme.primary,
                                  backgroundImage: (_uploadedAvatarUrl ??
                                      _userData!['avatar'] ??
                                      _userData!['avatar_url'] ??
                                      _userData!['profileImage']) != null
                                      ? NetworkImage(_uploadedAvatarUrl ??
                                          _userData!['avatar'] ??
                                          _userData!['avatar_url'] ??
                                          _userData!['profileImage'])
                                      : null,
                                  child: (_uploadedAvatarUrl ??
                                      _userData!['avatar'] ??
                                      _userData!['avatar_url'] ??
                                      _userData!['profileImage']) == null
                                      ? const Icon(
                                          Icons.person,
                                          size: 50,
                                          color: Colors.white,
                                        )
                                      : null,
                                ),
                                Positioned(
                                  bottom: 0,
                                  right: 0,
                                  child: GestureDetector(
                                    onTap: _isUploadingImage ? null : _uploadProfileImage,
                                    child: Container(
                                      padding: const EdgeInsets.all(4),
                                      decoration: BoxDecoration(
                                        color: Theme.of(context).colorScheme.primary,
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: Theme.of(context).colorScheme.surface,
                                          width: 2,
                                        ),
                                      ),
                                      child: _isUploadingImage
                                          ? const SizedBox(
                                              width: 20,
                                              height: 20,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: Colors.white,
                                              ),
                                            )
                                          : const Icon(
                                              Icons.camera_alt,
                                              size: 20,
                                              color: Colors.white,
                                            ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _userData!['name'] ?? 'User',
                              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _userData!['email'] ?? '',
                              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Profile Information Section
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Personal Information
                            _buildSectionTitle(context, 'profile.personal_information'.tr()),
                            const SizedBox(height: 16),
                            _buildTextField(
                              context,
                              label: 'profile.full_name'.tr(),
                              controller: _nameController,
                              icon: Icons.person_outline,
                              onChanged: _onFieldChanged,
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              context,
                              label: 'profile.email'.tr(),
                              controller: _emailController,
                              icon: Icons.email_outlined,
                              enabled: false,
                            ),
                            const SizedBox(height: 16),
                            _buildPhoneField(context),
                            const SizedBox(height: 16),
                            _buildLocationField(context),
                            const SizedBox(height: 16),
                            _buildTimezoneField(context),
                            const SizedBox(height: 16),
                            _buildLanguageField(context),

                            const SizedBox(height: 32),

                            // About Section
                            _buildSectionTitle(context, 'common.about'.tr()),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _bioController,
                              maxLines: 4,
                              onChanged: (value) => _onFieldChanged(),
                              decoration: InputDecoration(
                                labelText: 'profile.bio'.tr(),
                                alignLabelWithHint: true,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                prefixIcon: const Padding(
                                  padding: EdgeInsets.only(bottom: 60),
                                  child: Icon(Icons.info_outline),
                                ),
                              ),
                            ),

                            const SizedBox(height: 32),

                            // Social Links
                            _buildSectionTitle(context, 'profile.social_links'.tr()),
                            const SizedBox(height: 16),
                            _buildTextField(
                              context,
                              label: 'profile.website'.tr(),
                              controller: _githubController,
                              icon: Icons.link,
                              onChanged: _onFieldChanged,
                            ),

                            const SizedBox(height: 32),

                            // Account Actions
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.errorContainer.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: Theme.of(context).colorScheme.error.withValues(alpha: 0.3),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'profile.danger_zone'.tr(),
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      color: Theme.of(context).colorScheme.error,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  TextButton.icon(
                                    onPressed: () => _showDeleteAccountDialog(context),
                                    icon: const Icon(Icons.delete_forever),
                                    label: Text('profile.delete_account'.tr()),
                                    style: TextButton.styleFrom(
                                      foregroundColor: Theme.of(context).colorScheme.error,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 40),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildPhoneField(BuildContext context) {
    final selectedCountryData = _countryCodes.firstWhere(
      (c) => c['country'] == _selectedCountry,
      orElse: () => {'code': '+1', 'country': 'US', 'name': 'United States'},
    );

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Country code selector button
        InkWell(
          onTap: () => _showCountryPicker(context),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            width: 100,
            height: 56,
            decoration: BoxDecoration(
              border: Border.all(color: Theme.of(context).colorScheme.outline),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${selectedCountryData['country']} ${selectedCountryData['code']}',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const Icon(Icons.arrow_drop_down, size: 20),
                const SizedBox(width: 4),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        // Phone number input
        Expanded(
          child: TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            onChanged: (value) => _onFieldChanged(),
            decoration: InputDecoration(
              labelText: 'profile.phone_number'.tr(),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              prefixIcon: const Icon(Icons.phone_outlined),
            ),
          ),
        ),
      ],
    );
  }

  void _showCountryPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _CountryPickerSheet(
        countryCodes: _countryCodes,
        selectedCountry: _selectedCountry,
        onSelect: (country) {
          setState(() {
            _selectedCountry = country;
            _onFieldChanged();
          });
        },
      ),
    );
  }

  Widget _buildLocationField(BuildContext context) {
    final selectedLocationData = _countryCodes.firstWhere(
      (c) => c['country'] == _selectedLocationCountry,
      orElse: () => {'code': '+1', 'country': 'US', 'name': 'United States'},
    );

    return InkWell(
      onTap: () => _showLocationCountryPicker(context),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          border: Border.all(color: Theme.of(context).colorScheme.outline),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const SizedBox(width: 12),
            Icon(Icons.location_on_outlined, color: Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'profile.country'.tr(),
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    selectedLocationData['name']!,
                    style: const TextStyle(fontSize: 14),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_drop_down),
            const SizedBox(width: 8),
          ],
        ),
      ),
    );
  }

  void _showLocationCountryPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _CountryPickerSheet(
        countryCodes: _countryCodes,
        selectedCountry: _selectedLocationCountry,
        onSelect: (country) {
          setState(() {
            _selectedLocationCountry = country;
            _onFieldChanged();

            // Auto-select timezone based on the selected country
            final defaultTimezone = _countryTimezones[country];
            if (defaultTimezone != null && _timezones.any((t) => t['value'] == defaultTimezone)) {
              _selectedTimezone = defaultTimezone;
            }
          });
        },
      ),
    );
  }

  Widget _buildTimezoneField(BuildContext context) {
    final selectedTimezoneData = _timezones.firstWhere(
      (t) => t['value'] == _selectedTimezone,
      orElse: () => {'value': 'UTC', 'label': 'UTC (Coordinated Universal Time)'},
    );

    return InkWell(
      onTap: () => _showTimezonePicker(context),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          border: Border.all(color: Theme.of(context).colorScheme.outline),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const SizedBox(width: 12),
            Icon(Icons.access_time, color: Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'profile.timezone'.tr(),
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    selectedTimezoneData['label']!,
                    style: const TextStyle(fontSize: 14),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_drop_down),
            const SizedBox(width: 8),
          ],
        ),
      ),
    );
  }

  void _showTimezonePicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _SearchablePickerSheet(
        title: 'profile.select_timezone'.tr(),
        items: _timezones,
        selectedValue: _selectedTimezone,
        onSelect: (value) {
          setState(() {
            _selectedTimezone = value;
            _onFieldChanged();
          });
        },
      ),
    );
  }

  Widget _buildLanguageField(BuildContext context) {
    final selectedLanguageData = _languages.firstWhere(
      (l) => l['value'] == _selectedLanguage,
      orElse: () => {'value': 'en', 'label': 'English'},
    );

    return InkWell(
      onTap: () => _showLanguagePicker(context),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          border: Border.all(color: Theme.of(context).colorScheme.outline),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const SizedBox(width: 12),
            Icon(Icons.language, color: Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'profile.language'.tr(),
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    selectedLanguageData['label']!,
                    style: const TextStyle(fontSize: 14),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_drop_down),
            const SizedBox(width: 8),
          ],
        ),
      ),
    );
  }

  void _showLanguagePicker(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) => SimpleDialog(
        title: Text('profile.select_language'.tr()),
        children: _languages.map((lang) {
          final isSelected = lang['value'] == _selectedLanguage;
          return SimpleDialogOption(
            onPressed: () {
              setState(() {
                _selectedLanguage = lang['value']!;
                _onFieldChanged();
              });

              // Apply the locale change immediately
              context.setLocale(Locale(lang['value']!));

              Navigator.pop(dialogContext);
            },
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    lang['label']!,
                    style: TextStyle(
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      color: isSelected ? Theme.of(dialogContext).colorScheme.primary : null,
                    ),
                  ),
                ),
                if (isSelected)
                  Icon(Icons.check, color: Theme.of(dialogContext).colorScheme.primary, size: 20),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTextField(
    BuildContext context, {
    required String label,
    required TextEditingController controller,
    required IconData icon,
    bool enabled = true,
    bool readOnly = false,
    VoidCallback? onTap,
    VoidCallback? onChanged,
  }) {
    return TextFormField(
      controller: controller,
      enabled: enabled,
      readOnly: readOnly,
      onTap: onTap,
      onChanged: onChanged != null ? (value) => onChanged() : null,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        prefixIcon: Icon(icon),
        suffixIcon: readOnly ? const Icon(Icons.chevron_right) : null,
      ),
    );
  }

  /// Update AuthService's currentUser with the latest profile data
  /// This ensures the avatar and other profile changes are reflected app-wide
  Future<void> _updateAuthServiceUser() async {
    if (_userData == null) return;

    try {
      final currentUser = AuthService.instance.currentUser;
      if (currentUser == null) return;

      // Create updated user with the new profile data
      final updatedUser = currentUser.copyWith(
        name: _userData!['name'] ?? currentUser.name,
        phone: _userData!['phone'] ?? currentUser.phone,
        avatar_url: _userData!['avatarUrl'] ??
            _userData!['avatar_url'] ??
            _userData!['profileImage'] ??
            currentUser.avatar_url,
      );

      // Save updated user to SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('current_user', updatedUser.toJson());

      // Reload the session to refresh AuthService's currentUser
      await AuthService.instance.reloadSession();

      debugPrint('[ProfileScreen] Updated AuthService user with new profile data');
    } catch (e) {
      debugPrint('[ProfileScreen] Failed to update AuthService user: $e');
    }
  }

  /// Show delete account exit survey
  void _showDeleteAccountDialog(BuildContext context) {
    // Show the exit survey bottom sheet
    DeletionExitSurvey.show(context);
  }
}

// Searchable Country Picker Bottom Sheet
class _CountryPickerSheet extends StatefulWidget {
  final List<Map<String, String>> countryCodes;
  final String selectedCountry;
  final Function(String) onSelect;

  const _CountryPickerSheet({
    required this.countryCodes,
    required this.selectedCountry,
    required this.onSelect,
  });

  @override
  State<_CountryPickerSheet> createState() => _CountryPickerSheetState();
}

class _CountryPickerSheetState extends State<_CountryPickerSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<Map<String, String>> _filteredCountries = [];

  @override
  void initState() {
    super.initState();
    _filteredCountries = widget.countryCodes;
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterCountries(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredCountries = widget.countryCodes;
      } else {
        final lowerQuery = query.toLowerCase();
        _filteredCountries = widget.countryCodes.where((country) {
          return country['name']!.toLowerCase().contains(lowerQuery) ||
              country['country']!.toLowerCase().contains(lowerQuery) ||
              country['code']!.contains(query);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final screenHeight = MediaQuery.of(context).size.height;
    // Use 85% of screen height, ensuring visibility when keyboard is open
    final sheetHeight = screenHeight * 0.85;

    return Container(
      height: sheetHeight,
      padding: EdgeInsets.only(bottom: keyboardHeight),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[400],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Title
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'profile.select_country'.tr(),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          // Search field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _searchController,
              onChanged: _filterCountries,
              decoration: InputDecoration(
                hintText: 'profile.search_country'.tr(),
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 20),
                        onPressed: () {
                          _searchController.clear();
                          _filterCountries('');
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                isDense: true,
              ),
            ),
          ),
          const SizedBox(height: 8),
          // Country list
          Expanded(
            child: ListView.builder(
              itemCount: _filteredCountries.length,
              itemBuilder: (context, index) {
                final country = _filteredCountries[index];
                final isSelected = country['country'] == widget.selectedCountry;
                return ListTile(
                  dense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                  leading: Container(
                    width: 50,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      country['country']!,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: isSelected ? Theme.of(context).colorScheme.primary : null,
                      ),
                    ),
                  ),
                  title: Text(
                    country['name']!,
                    style: TextStyle(
                      fontSize: 14,
                      color: isSelected ? Theme.of(context).colorScheme.primary : null,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: Text(
                    country['code']!,
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      color: isSelected
                          ? Theme.of(context).colorScheme.primary
                          : Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  selected: isSelected,
                  onTap: () {
                    widget.onSelect(country['country']!);
                    Navigator.pop(context);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// Generic Searchable Picker Bottom Sheet for Timezone and Language
class _SearchablePickerSheet extends StatefulWidget {
  final String title;
  final List<Map<String, String>> items;
  final String selectedValue;
  final Function(String) onSelect;

  const _SearchablePickerSheet({
    required this.title,
    required this.items,
    required this.selectedValue,
    required this.onSelect,
  });

  @override
  State<_SearchablePickerSheet> createState() => _SearchablePickerSheetState();
}

class _SearchablePickerSheetState extends State<_SearchablePickerSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<Map<String, String>> _filteredItems = [];

  @override
  void initState() {
    super.initState();
    _filteredItems = widget.items;
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterItems(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredItems = widget.items;
      } else {
        final lowerQuery = query.toLowerCase();
        _filteredItems = widget.items.where((item) {
          return item['label']!.toLowerCase().contains(lowerQuery) ||
              item['value']!.toLowerCase().contains(lowerQuery);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final screenHeight = MediaQuery.of(context).size.height;
    // Use 85% of screen height, ensuring visibility when keyboard is open
    final sheetHeight = screenHeight * 0.85;

    return Container(
      height: sheetHeight,
      padding: EdgeInsets.only(bottom: keyboardHeight),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[400],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Title
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              widget.title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          // Search field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _searchController,
              onChanged: _filterItems,
              decoration: InputDecoration(
                hintText: 'profile.search'.tr(),
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 20),
                        onPressed: () {
                          _searchController.clear();
                          _filterItems('');
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                isDense: true,
              ),
            ),
          ),
          const SizedBox(height: 8),
          // Items list
          Expanded(
            child: ListView.builder(
              itemCount: _filteredItems.length,
              itemBuilder: (context, index) {
                final item = _filteredItems[index];
                final isSelected = item['value'] == widget.selectedValue;
                return ListTile(
                  dense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                  title: Text(
                    item['label']!,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      color: isSelected ? Theme.of(context).colorScheme.primary : null,
                    ),
                  ),
                  trailing: isSelected
                      ? Icon(Icons.check, color: Theme.of(context).colorScheme.primary, size: 20)
                      : null,
                  selected: isSelected,
                  onTap: () {
                    widget.onSelect(item['value']!);
                    Navigator.pop(context);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
