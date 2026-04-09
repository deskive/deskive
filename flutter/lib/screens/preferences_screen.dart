import 'package:flutter/material.dart';
import '../utils/theme_notifier.dart';

class PreferencesScreen extends StatefulWidget {
  final ThemeNotifier themeNotifier;
  
  const PreferencesScreen({super.key, required this.themeNotifier});

  @override
  State<PreferencesScreen> createState() => _PreferencesScreenState();
}

class _PreferencesScreenState extends State<PreferencesScreen> {
  String _selectedLanguage = 'English (US)';
  String _selectedTimezone = 'Pacific Time (PT)';
  String _selectedDateFormat = 'MM/DD/YYYY';
  String _selectedTimeFormat = '12 Hour';
  bool _compactMode = false;
  bool _reducedMotion = false;
  bool _highContrast = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Preferences'),
      ),
      body: ListView(
        children: [
          // Appearance Section
          _buildSectionHeader(context, 'Appearance'),
          AnimatedBuilder(
            animation: widget.themeNotifier,
            builder: (context, child) {
              return SwitchListTile(
                title: const Text('Dark Mode'),
                subtitle: const Text('Use dark theme throughout the app'),
                value: widget.themeNotifier.isDarkMode,
                onChanged: (value) {
                  widget.themeNotifier.toggleTheme();
                },
                secondary: Icon(
                  widget.themeNotifier.isDarkMode ? Icons.dark_mode : Icons.light_mode,
                ),
              );
            },
          ),
          SwitchListTile(
            title: const Text('Compact Mode'),
            subtitle: const Text('Reduce spacing for more content'),
            value: _compactMode,
            onChanged: (value) {
              setState(() {
                _compactMode = value;
              });
            },
            secondary: const Icon(Icons.density_small),
          ),
          const Divider(height: 1),
          
          // Language & Region Section
          _buildSectionHeader(context, 'Language & Region'),
          ListTile(
            leading: const Icon(Icons.language),
            title: const Text('Language'),
            subtitle: Text(_selectedLanguage),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              _showLanguageDialog();
            },
          ),
          ListTile(
            leading: const Icon(Icons.access_time),
            title: const Text('Timezone'),
            subtitle: Text(_selectedTimezone),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              _showTimezoneDialog();
            },
          ),
          ListTile(
            leading: const Icon(Icons.calendar_today),
            title: const Text('Date Format'),
            subtitle: Text(_selectedDateFormat),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              _showDateFormatDialog();
            },
          ),
          ListTile(
            leading: const Icon(Icons.schedule),
            title: const Text('Time Format'),
            subtitle: Text(_selectedTimeFormat),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              _showTimeFormatDialog();
            },
          ),
          const Divider(height: 1),
          
          // Accessibility Section
          _buildSectionHeader(context, 'Accessibility'),
          SwitchListTile(
            title: const Text('Reduced Motion'),
            subtitle: const Text('Minimize animations and transitions'),
            value: _reducedMotion,
            onChanged: (value) {
              setState(() {
                _reducedMotion = value;
              });
            },
            secondary: const Icon(Icons.animation),
          ),
          SwitchListTile(
            title: const Text('High Contrast'),
            subtitle: const Text('Increase contrast for better visibility'),
            value: _highContrast,
            onChanged: (value) {
              setState(() {
                _highContrast = value;
              });
            },
            secondary: const Icon(Icons.contrast),
          ),
          ListTile(
            leading: const Icon(Icons.text_fields),
            title: const Text('Font Size'),
            subtitle: const Text('Medium'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              _showFontSizeDialog();
            },
          ),
          const Divider(height: 1),
          
          // Advanced Section
          _buildSectionHeader(context, 'Advanced'),
          ListTile(
            leading: const Icon(Icons.developer_mode),
            title: const Text('Developer Options'),
            subtitle: const Text('Advanced settings for developers'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.bug_report),
            title: const Text('Debug Mode'),
            subtitle: const Text('Show debug information'),
            trailing: Switch(
              value: false,
              onChanged: (value) {},
            ),
          ),
          ListTile(
            leading: const Icon(Icons.restore),
            title: const Text('Reset Preferences'),
            subtitle: const Text('Restore all preferences to default'),
            onTap: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Reset Preferences'),
                  content: const Text('Are you sure you want to reset all preferences to their default values?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Preferences reset to default')),
                        );
                      },
                      style: TextButton.styleFrom(
                        foregroundColor: Theme.of(context).colorScheme.error,
                      ),
                      child: const Text('Reset'),
                    ),
                  ],
                ),
              );
            },
          ),
          
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
          color: Theme.of(context).colorScheme.primary,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  void _showLanguageDialog() {
    final languages = ['English (US)', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'];
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Language'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: languages.map((language) {
            return RadioListTile<String>(
              title: Text(language),
              value: language,
              groupValue: _selectedLanguage,
              onChanged: (value) {
                setState(() {
                  _selectedLanguage = value!;
                });
                Navigator.pop(context);
              },
            );
          }).toList(),
        ),
      ),
    );
  }

  void _showTimezoneDialog() {
    final timezones = [
      'Pacific Time (PT)',
      'Mountain Time (MT)',
      'Central Time (CT)',
      'Eastern Time (ET)',
      'UTC',
      'GMT',
    ];
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Timezone'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: timezones.map((timezone) {
            return RadioListTile<String>(
              title: Text(timezone),
              value: timezone,
              groupValue: _selectedTimezone,
              onChanged: (value) {
                setState(() {
                  _selectedTimezone = value!;
                });
                Navigator.pop(context);
              },
            );
          }).toList(),
        ),
      ),
    );
  }

  void _showDateFormatDialog() {
    final formats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Date Format'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: formats.map((format) {
            return RadioListTile<String>(
              title: Text(format),
              subtitle: Text(_getDateExample(format)),
              value: format,
              groupValue: _selectedDateFormat,
              onChanged: (value) {
                setState(() {
                  _selectedDateFormat = value!;
                });
                Navigator.pop(context);
              },
            );
          }).toList(),
        ),
      ),
    );
  }

  String _getDateExample(String format) {
    switch (format) {
      case 'MM/DD/YYYY':
        return '07/15/2025';
      case 'DD/MM/YYYY':
        return '15/07/2025';
      case 'YYYY-MM-DD':
        return '2025-07-15';
      default:
        return '';
    }
  }

  void _showTimeFormatDialog() {
    final formats = ['12 Hour', '24 Hour'];
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Time Format'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: formats.map((format) {
            return RadioListTile<String>(
              title: Text(format),
              subtitle: Text(format == '12 Hour' ? '2:30 PM' : '14:30'),
              value: format,
              groupValue: _selectedTimeFormat,
              onChanged: (value) {
                setState(() {
                  _selectedTimeFormat = value!;
                });
                Navigator.pop(context);
              },
            );
          }).toList(),
        ),
      ),
    );
  }

  void _showFontSizeDialog() {
    final sizes = ['Small', 'Medium', 'Large', 'Extra Large'];
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Font Size'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: sizes.map((size) {
            return RadioListTile<String>(
              title: Text(size),
              value: size,
              groupValue: 'Medium',
              onChanged: (value) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Font size changed to $value')),
                );
              },
            );
          }).toList(),
        ),
      ),
    );
  }
}