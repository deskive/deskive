import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../api/services/email_api_service.dart';

/// Bottom sheet to display extracted travel ticket information
/// and allow creating a calendar event from it
class TravelTicketBottomSheet extends StatelessWidget {
  final TravelTicketInfo ticketInfo;
  final String suggestedTitle;
  final String suggestedDescription;
  final VoidCallback onCreateEvent;

  const TravelTicketBottomSheet({
    super.key,
    required this.ticketInfo,
    required this.suggestedTitle,
    required this.suggestedDescription,
    required this.onCreateEvent,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.dividerColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: _getTypeColor().withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    _getTypeIcon(),
                    color: _getTypeColor(),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Travel Information Found',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        ticketInfo.travelType.displayName,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: _getTypeColor(),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // Ticket content
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _buildTicketCard(context, isDark),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getTypeIcon() {
    switch (ticketInfo.travelType) {
      case TravelType.flight:
        return Icons.flight;
      case TravelType.train:
        return Icons.train;
      case TravelType.bus:
        return Icons.directions_bus;
      case TravelType.other:
        return Icons.commute;
    }
  }

  Color _getTypeColor() {
    switch (ticketInfo.travelType) {
      case TravelType.flight:
        return Colors.blue;
      case TravelType.train:
        return Colors.orange;
      case TravelType.bus:
        return Colors.green;
      case TravelType.other:
        return Colors.purple;
    }
  }

  String? _formatDateTime(String? dateTimeStr) {
    if (dateTimeStr == null) return null;
    try {
      final dateTime = DateTime.parse(dateTimeStr);
      return DateFormat('MMM d, yyyy h:mm a').format(dateTime);
    } catch (e) {
      return dateTimeStr;
    }
  }

  Widget _buildTicketCard(BuildContext context, bool isDark) {
    final theme = Theme.of(context);
    final typeColor = _getTypeColor();

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: typeColor.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with type and carrier
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: typeColor.withValues(alpha: 0.1),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: Row(
              children: [
                Icon(_getTypeIcon(), color: typeColor, size: 24),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ticketInfo.carrier ?? ticketInfo.travelType.displayName,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: typeColor,
                        ),
                      ),
                      if (ticketInfo.vehicleNumber != null)
                        Text(
                          ticketInfo.vehicleNumber!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: typeColor.withValues(alpha: 0.8),
                          ),
                        ),
                    ],
                  ),
                ),
                if (ticketInfo.bookingReference != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: theme.scaffoldBackgroundColor,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      ticketInfo.bookingReference!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
              ],
            ),
          ),
          // Route info
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                if (ticketInfo.departureLocation != null || ticketInfo.arrivalLocation != null)
                  _buildRouteRow(context),
                const SizedBox(height: 12),
                // Time info
                if (ticketInfo.departureDateTime != null || ticketInfo.arrivalDateTime != null)
                  Row(
                    children: [
                      if (ticketInfo.departureDateTime != null)
                        Expanded(
                          child: _buildInfoItem(
                            context,
                            Icons.schedule,
                            'Departure',
                            _formatDateTime(ticketInfo.departureDateTime) ?? ticketInfo.departureDateTime!,
                          ),
                        ),
                      if (ticketInfo.departureDateTime != null && ticketInfo.arrivalDateTime != null)
                        const SizedBox(width: 12),
                      if (ticketInfo.arrivalDateTime != null)
                        Expanded(
                          child: _buildInfoItem(
                            context,
                            Icons.schedule,
                            'Arrival',
                            _formatDateTime(ticketInfo.arrivalDateTime) ?? ticketInfo.arrivalDateTime!,
                          ),
                        ),
                    ],
                  ),
                // Additional info
                if (ticketInfo.passengerName != null || ticketInfo.seatInfo != null) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 16,
                    runSpacing: 8,
                    children: [
                      if (ticketInfo.passengerName != null)
                        _buildChip(context, Icons.person, ticketInfo.passengerName!),
                      if (ticketInfo.seatInfo != null)
                        _buildChip(context, Icons.event_seat, ticketInfo.seatInfo!),
                    ],
                  ),
                ],
                // Notes
                if (ticketInfo.notes != null && ticketInfo.notes!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      ticketInfo.notes!,
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Event preview
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: theme.colorScheme.primary.withValues(alpha: 0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.event,
                      size: 16,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Event Preview',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  suggestedTitle,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  suggestedDescription,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Create Event button
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(color: theme.dividerColor),
              ),
            ),
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                onCreateEvent();
              },
              icon: const Icon(Icons.event_available),
              label: const Text('Create Calendar Event'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _getTypeColor(),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRouteRow(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        // Departure
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'From',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                ),
              ),
              Text(
                ticketInfo.departureLocation ?? '-',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        // Arrow
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Icon(
            Icons.arrow_forward,
            color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
          ),
        ),
        // Arrival
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'To',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                ),
              ),
              Text(
                ticketInfo.arrivalLocation ?? '-',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.end,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoItem(
    BuildContext context,
    IconData icon,
    String label,
    String value,
  ) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                  fontSize: 10,
                ),
              ),
              Text(
                value,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildChip(BuildContext context, IconData icon, String label) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 14,
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  /// Show the bottom sheet
  static void show(
    BuildContext context, {
    required TravelTicketInfo ticketInfo,
    required String suggestedTitle,
    required String suggestedDescription,
    required VoidCallback onCreateEvent,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      builder: (context) => TravelTicketBottomSheet(
        ticketInfo: ticketInfo,
        suggestedTitle: suggestedTitle,
        suggestedDescription: suggestedDescription,
        onCreateEvent: onCreateEvent,
      ),
    );
  }
}

/// Dialog shown when no travel info is found
class NoTravelInfoDialog extends StatelessWidget {
  const NoTravelInfoDialog({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      icon: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.orange.withValues(alpha: 0.1),
          shape: BoxShape.circle,
        ),
        child: const Icon(
          Icons.search_off,
          color: Colors.orange,
          size: 32,
        ),
      ),
      title: const Text('No Travel Info Found'),
      content: Text(
        'We couldn\'t find any travel or ticket information in this email. '
        'Make sure the email contains booking confirmations, e-tickets, or itineraries.',
        style: theme.textTheme.bodyMedium?.copyWith(
          color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
        ),
        textAlign: TextAlign.center,
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('OK'),
        ),
      ],
    );
  }

  static void show(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const NoTravelInfoDialog(),
    );
  }
}
