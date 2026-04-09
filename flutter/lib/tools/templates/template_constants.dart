import 'package:flutter/material.dart';
import '../../models/template/project_template.dart';

/// Template category constants with icons and colors
class TemplateConstants {
  TemplateConstants._();

  /// All available template categories
  static const List<TemplateCategory> categories = [
    TemplateCategory(
      id: 'software_development',
      name: 'Software Development',
      icon: 'code',
      color: 0xFF9333EA, // Purple
    ),
    TemplateCategory(
      id: 'marketing',
      name: 'Marketing',
      icon: 'campaign',
      color: 0xFFEC4899, // Pink
    ),
    TemplateCategory(
      id: 'hr',
      name: 'HR & People',
      icon: 'people',
      color: 0xFF14B8A6, // Teal
    ),
    TemplateCategory(
      id: 'design',
      name: 'Design & Creative',
      icon: 'palette',
      color: 0xFF6366F1, // Indigo
    ),
    TemplateCategory(
      id: 'business',
      name: 'Business & Operations',
      icon: 'business_center',
      color: 0xFF3B82F6, // Blue
    ),
    TemplateCategory(
      id: 'events',
      name: 'Events & Webinars',
      icon: 'event',
      color: 0xFFF97316, // Orange
    ),
    TemplateCategory(
      id: 'research',
      name: 'Research & Analysis',
      icon: 'analytics',
      color: 0xFF06B6D4, // Cyan
    ),
    TemplateCategory(
      id: 'personal',
      name: 'Personal & Productivity',
      icon: 'person',
      color: 0xFF22C55E, // Green
    ),
    TemplateCategory(
      id: 'sales',
      name: 'Sales',
      icon: 'trending_up',
      color: 0xFF10B981, // Emerald
    ),
    TemplateCategory(
      id: 'finance',
      name: 'Finance',
      icon: 'account_balance',
      color: 0xFF059669, // Green
    ),
    TemplateCategory(
      id: 'it_support',
      name: 'IT Support',
      icon: 'support_agent',
      color: 0xFF2563EB, // Blue
    ),
    TemplateCategory(
      id: 'education',
      name: 'Education',
      icon: 'school',
      color: 0xFFEAB308, // Yellow
    ),
    TemplateCategory(
      id: 'freelance',
      name: 'Freelance',
      icon: 'work_outline',
      color: 0xFFA855F7, // Purple
    ),
    TemplateCategory(
      id: 'operations',
      name: 'Operations',
      icon: 'settings',
      color: 0xFF6B7280, // Gray
    ),
    TemplateCategory(
      id: 'healthcare',
      name: 'Healthcare',
      icon: 'local_hospital',
      color: 0xFFEF4444, // Red
    ),
    TemplateCategory(
      id: 'legal',
      name: 'Legal',
      icon: 'gavel',
      color: 0xFF78716C, // Stone
    ),
    TemplateCategory(
      id: 'real_estate',
      name: 'Real Estate',
      icon: 'home_work',
      color: 0xFF0EA5E9, // Sky
    ),
    TemplateCategory(
      id: 'manufacturing',
      name: 'Manufacturing',
      icon: 'precision_manufacturing',
      color: 0xFF64748B, // Slate
    ),
    TemplateCategory(
      id: 'nonprofit',
      name: 'Non-Profit',
      icon: 'volunteer_activism',
      color: 0xFFF472B6, // Pink
    ),
    TemplateCategory(
      id: 'media',
      name: 'Media & Entertainment',
      icon: 'movie',
      color: 0xFFA855F7, // Purple
    ),
  ];

  /// Get icon data for category icon name
  static IconData getIconData(String iconName) {
    switch (iconName) {
      case 'code':
        return Icons.code;
      case 'campaign':
        return Icons.campaign;
      case 'people':
        return Icons.people;
      case 'palette':
        return Icons.palette;
      case 'business_center':
        return Icons.business_center;
      case 'event':
        return Icons.event;
      case 'analytics':
        return Icons.analytics;
      case 'person':
        return Icons.person;
      case 'trending_up':
        return Icons.trending_up;
      case 'account_balance':
        return Icons.account_balance;
      case 'support_agent':
        return Icons.support_agent;
      case 'school':
        return Icons.school;
      case 'work_outline':
        return Icons.work_outline;
      case 'settings':
        return Icons.settings;
      case 'dashboard_customize':
        return Icons.dashboard_customize;
      case 'local_hospital':
        return Icons.local_hospital;
      case 'gavel':
        return Icons.gavel;
      case 'home_work':
        return Icons.home_work;
      case 'precision_manufacturing':
        return Icons.precision_manufacturing;
      case 'volunteer_activism':
        return Icons.volunteer_activism;
      case 'movie':
        return Icons.movie;
      default:
        return Icons.folder_outlined;
    }
  }

  /// Get category by id
  static TemplateCategory? getCategoryById(String id) {
    try {
      return categories.firstWhere((c) => c.id == id);
    } catch (_) {
      return null;
    }
  }

  /// Get category color
  static Color getCategoryColor(String categoryId) {
    final category = getCategoryById(categoryId);
    if (category != null) {
      return Color(category.color);
    }
    return Colors.grey;
  }

  /// Get category icon
  static IconData getCategoryIcon(String categoryId) {
    final category = getCategoryById(categoryId);
    if (category != null) {
      return getIconData(category.icon);
    }
    return Icons.folder_outlined;
  }

  /// Get category display name
  static String getCategoryName(String categoryId) {
    final category = getCategoryById(categoryId);
    return category?.name ?? categoryId;
  }

  /// Get priority color
  static Color getPriorityColor(String? priority) {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return Colors.red;
      case 'high':
        return Colors.orange;
      case 'medium':
        return Colors.yellow.shade700;
      case 'low':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  /// Get field type icon
  static IconData getFieldTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'text':
        return Icons.text_fields;
      case 'number':
        return Icons.numbers;
      case 'date':
        return Icons.calendar_today;
      case 'select':
        return Icons.arrow_drop_down_circle;
      case 'multiselect':
        return Icons.checklist;
      case 'checkbox':
        return Icons.check_box;
      case 'url':
        return Icons.link;
      case 'email':
        return Icons.email;
      case 'phone':
        return Icons.phone;
      case 'currency':
        return Icons.attach_money;
      case 'percentage':
        return Icons.percent;
      default:
        return Icons.text_fields;
    }
  }
}
