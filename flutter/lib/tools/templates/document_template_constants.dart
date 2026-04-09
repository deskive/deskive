import 'package:flutter/material.dart';
import '../../models/template/document_template.dart';

/// Constants and utilities for document templates
class DocumentTemplateConstants {
  DocumentTemplateConstants._();

  /// Categories for document templates
  static const List<DocumentTemplateCategory> categories = [
    DocumentTemplateCategory(id: 'sales', name: 'Sales'),
    DocumentTemplateCategory(id: 'legal', name: 'Legal'),
    DocumentTemplateCategory(id: 'freelance', name: 'Freelance'),
    DocumentTemplateCategory(id: 'consulting', name: 'Consulting'),
    DocumentTemplateCategory(id: 'general', name: 'General'),
  ];

  /// Get categories for a specific document type
  static List<DocumentTemplateCategory> getCategoriesForType(DocumentType type) {
    switch (type) {
      case DocumentType.proposal:
        return [
          const DocumentTemplateCategory(id: 'sales', name: 'Sales'),
          const DocumentTemplateCategory(id: 'consulting', name: 'Consulting'),
          const DocumentTemplateCategory(id: 'freelance', name: 'Freelance'),
          const DocumentTemplateCategory(id: 'general', name: 'General'),
        ];
      case DocumentType.contract:
        return [
          const DocumentTemplateCategory(id: 'legal', name: 'Legal'),
          const DocumentTemplateCategory(id: 'freelance', name: 'Freelance'),
          const DocumentTemplateCategory(id: 'general', name: 'General'),
        ];
      case DocumentType.invoice:
        return [
          const DocumentTemplateCategory(id: 'freelance', name: 'Freelance'),
          const DocumentTemplateCategory(id: 'consulting', name: 'Consulting'),
          const DocumentTemplateCategory(id: 'general', name: 'General'),
        ];
      case DocumentType.sow:
        return [
          const DocumentTemplateCategory(id: 'consulting', name: 'Consulting'),
          const DocumentTemplateCategory(id: 'it', name: 'IT/Software'),
          const DocumentTemplateCategory(id: 'general', name: 'General'),
        ];
    }
  }

  /// Get icon for document type
  static IconData getDocumentTypeIcon(DocumentType type) {
    switch (type) {
      case DocumentType.proposal:
        return Icons.description_outlined;
      case DocumentType.contract:
        return Icons.gavel;
      case DocumentType.invoice:
        return Icons.receipt_long;
      case DocumentType.sow:
        return Icons.assignment_outlined;
    }
  }

  /// Get color for document type
  static Color getDocumentTypeColor(DocumentType type) {
    switch (type) {
      case DocumentType.proposal:
        return const Color(0xFF3B82F6); // Blue
      case DocumentType.contract:
        return const Color(0xFF10B981); // Green
      case DocumentType.invoice:
        return const Color(0xFF06B6D4); // Cyan
      case DocumentType.sow:
        return const Color(0xFFF59E0B); // Amber
    }
  }

  /// Get icon from icon name string
  static IconData getIconFromName(String? iconName) {
    if (iconName == null) return Icons.article_outlined;

    switch (iconName.toLowerCase()) {
      case 'description':
        return Icons.description_outlined;
      case 'gavel':
        return Icons.gavel;
      case 'receipt':
        return Icons.receipt_long;
      case 'assignment':
        return Icons.assignment_outlined;
      case 'handshake':
        return Icons.handshake_outlined;
      case 'security':
        return Icons.security;
      case 'person':
        return Icons.person_outline;
      case 'trending_up':
        return Icons.trending_up;
      case 'business':
        return Icons.business_outlined;
      case 'schedule':
        return Icons.schedule;
      case 'flag':
        return Icons.flag_outlined;
      case 'list_alt':
        return Icons.list_alt;
      case 'checklist':
        return Icons.checklist;
      case 'work':
        return Icons.work_outline;
      default:
        return Icons.article_outlined;
    }
  }

  /// Parse color from hex string
  static Color parseColor(String? colorString) {
    if (colorString == null) return Colors.grey;

    try {
      final hex = colorString.replaceFirst('#', '');
      return Color(int.parse('FF$hex', radix: 16));
    } catch (_) {
      return Colors.grey;
    }
  }

  /// Get placeholder type icon
  static IconData getPlaceholderTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'text':
        return Icons.text_fields;
      case 'number':
        return Icons.numbers;
      case 'date':
        return Icons.calendar_today;
      case 'currency':
        return Icons.attach_money;
      case 'email':
        return Icons.email_outlined;
      case 'textarea':
        return Icons.notes;
      case 'select':
        return Icons.arrow_drop_down_circle_outlined;
      default:
        return Icons.text_fields;
    }
  }
}
