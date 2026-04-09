import 'package:flutter/material.dart';
import '../utils/theme_notifier.dart';

class ProfileOption extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const ProfileOption({
    super.key,
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: Theme.of(context).colorScheme.primary),
        ),
        title: Text(title),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class ThemeToggleOption extends StatelessWidget {
  final ThemeNotifier themeNotifier;

  const ThemeToggleOption({
    super.key,
    required this.themeNotifier,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          themeNotifier.isDarkMode ? Icons.dark_mode : Icons.light_mode,
        ),
        title: Text(
          themeNotifier.isDarkMode ? 'Dark Mode' : 'Light Mode',
        ),
        trailing: Switch(
          value: themeNotifier.isDarkMode,
          onChanged: (value) {
            themeNotifier.toggleTheme();
          },
        ),
      ),
    );
  }
}