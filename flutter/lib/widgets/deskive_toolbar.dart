import 'package:flutter/material.dart';
import 'deskive_search_bar.dart';

/// A reusable toolbar widget inspired by the Notes screen
/// Supports normal mode, selection mode, search, and filters
class DeskiveToolbar extends StatelessWidget implements PreferredSizeWidget {
  // Title
  final String title;

  // Search functionality
  final bool isSearching;
  final TextEditingController? searchController;
  final ValueChanged<String>? onSearchChanged;
  final VoidCallback? onSearchToggle;
  final String searchHint;

  // Selection mode
  final bool isSelectionMode;
  final int selectedCount;
  final VoidCallback? onExitSelection;
  final VoidCallback? onSelectAll;
  final List<DeskiveToolbarAction>? selectionActions;

  // Normal mode actions
  final List<DeskiveToolbarAction>? actions;
  final List<Widget>? customActions; // For complex custom action widgets

  // Bottom widget (tabs, filters, etc.)
  final PreferredSizeWidget? bottom;

  // Active filters/search indicator
  final String? activeSearchQuery;
  final String? activeFilterLabel;
  final VoidCallback? onClearFilters;

  // Styling
  final Color? backgroundColor;
  final bool centerTitle;
  final Widget? leading;
  final double? leadingWidth;

  const DeskiveToolbar({
    super.key,
    required this.title,
    this.isSearching = false,
    this.searchController,
    this.onSearchChanged,
    this.onSearchToggle,
    this.searchHint = 'Search...',
    this.isSelectionMode = false,
    this.selectedCount = 0,
    this.onExitSelection,
    this.onSelectAll,
    this.selectionActions,
    this.actions,
    this.customActions,
    this.bottom,
    this.activeSearchQuery,
    this.activeFilterLabel,
    this.onClearFilters,
    this.backgroundColor,
    this.centerTitle = true,
    this.leading,
    this.leadingWidth,
  });

  @override
  Size get preferredSize {
    double height = kToolbarHeight;

    // Add bottom widget height if present
    if (bottom != null) {
      height += bottom!.preferredSize.height;
    }

    // Add filter indicator height if active (but not when search bar is visible)
    if (!isSearching && (
        (activeSearchQuery != null && activeSearchQuery!.isNotEmpty) ||
        (activeFilterLabel != null && activeFilterLabel!.isNotEmpty))) {
      height += 40;
    }

    return Size.fromHeight(height);
  }

  @override
  Widget build(BuildContext context) {
    if (isSelectionMode) {
      return _buildSelectionModeAppBar(context);
    }

    return _buildNormalModeAppBar(context);
  }

  /// Build the normal mode AppBar
  AppBar _buildNormalModeAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: backgroundColor,
      centerTitle: centerTitle,
      leading: leading,
      leadingWidth: leadingWidth,
      title: isSearching
          ? DeskiveSearchBarInline(
              controller: searchController!,
              hintText: searchHint,
              searchQuery: activeSearchQuery ?? '',
              onChanged: onSearchChanged,
              autofocus: true,
            )
          : Text(title),
      actions: _buildNormalModeActions(context),
      bottom: _buildBottomWidget(context),
    );
  }

  /// Build actions for normal mode
  List<Widget> _buildNormalModeActions(BuildContext context) {
    List<Widget> widgets = [];

    if (isSearching) {
      widgets.add(
        IconButton(
          icon: const Icon(Icons.check),
          onPressed: onSearchToggle,
          tooltip: 'Done',
        ),
      );
    } else {
      // Add search button if search is available
      if (onSearchToggle != null) {
        widgets.add(
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: onSearchToggle,
            tooltip: 'Search',
          ),
        );
      }

      // Add standard actions
      if (actions != null) {
        for (var action in actions!) {
          widgets.add(_buildActionWidget(action));
        }
      }

      // Add custom action widgets (for complex UI elements)
      if (customActions != null) {
        widgets.addAll(customActions!);
      }
    }

    return widgets;
  }

  /// Build the selection mode AppBar
  AppBar _buildSelectionModeAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: backgroundColor,
      centerTitle: true,
      leading: IconButton(
        icon: const Icon(Icons.close),
        onPressed: onExitSelection,
      ),
      title: Text('$selectedCount selected'),
      actions: _buildSelectionModeActions(context),
      bottom: _buildBottomWidget(context),
    );
  }

  /// Build actions for selection mode
  List<Widget> _buildSelectionModeActions(BuildContext context) {
    List<Widget> widgets = [];

    // Add select all button
    if (onSelectAll != null) {
      widgets.add(
        IconButton(
          icon: const Icon(Icons.select_all),
          onPressed: onSelectAll,
          tooltip: 'Select All',
        ),
      );
    }

    // Add custom selection actions
    if (selectionActions != null) {
      for (var action in selectionActions!) {
        widgets.add(_buildActionWidget(action));
      }
    }

    return widgets;
  }

  /// Build bottom widget with optional filter indicator
  PreferredSizeWidget? _buildBottomWidget(BuildContext context) {
    // Don't show filter indicator when search bar is active (visible in app bar)
    final hasActiveFilters = !isSearching && (
        (activeSearchQuery != null && activeSearchQuery!.isNotEmpty) ||
        (activeFilterLabel != null && activeFilterLabel!.isNotEmpty));

    if (!hasActiveFilters && bottom == null) {
      return null;
    }

    double height = 0;
    if (hasActiveFilters) height += 40;
    if (bottom != null) height += bottom!.preferredSize.height;

    return PreferredSize(
      preferredSize: Size.fromHeight(height),
      child: Column(
        children: [
          if (hasActiveFilters) _buildFilterIndicator(context),
          if (bottom != null) bottom!,
        ],
      ),
    );
  }

  /// Build the filter/search indicator bar
  Widget _buildFilterIndicator(BuildContext context) {
    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.1),
      child: Row(
        children: [
          if (activeSearchQuery != null && activeSearchQuery!.isNotEmpty) ...[
            Icon(
              Icons.search,
              size: 16,
              color: Theme.of(context).colorScheme.onSurface,
            ),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                'Search: "$activeSearchQuery"',
                style: Theme.of(context).textTheme.bodySmall,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 12),
          ],
          if (activeFilterLabel != null && activeFilterLabel!.isNotEmpty) ...[
            Icon(
              Icons.filter_list,
              size: 16,
              color: Theme.of(context).colorScheme.onSurface,
            ),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                'Filter: $activeFilterLabel',
                style: Theme.of(context).textTheme.bodySmall,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 12),
          ],
          const Spacer(),
          if (onClearFilters != null)
            TextButton(
              onPressed: onClearFilters,
              child: const Text('Clear'),
            ),
        ],
      ),
    );
  }

  /// Build a single action widget
  Widget _buildActionWidget(DeskiveToolbarAction action) {
    if (action.isMenu && action.menuItems != null) {
      return PopupMenuButton<String>(
        onSelected: action.onMenuItemSelected,
        icon: action.icon != null ? Icon(action.icon) : null,
        tooltip: action.tooltip,
        itemBuilder: (context) => action.menuItems!.map((item) {
          return PopupMenuItem<String>(
            value: item.value,
            child: ListTile(
              leading: item.icon != null ? Icon(item.icon) : null,
              title: Text(item.label),
              contentPadding: EdgeInsets.zero,
            ),
          );
        }).toList(),
      );
    }

    return IconButton(
      icon: Icon(action.icon),
      onPressed: action.onPressed,
      tooltip: action.tooltip,
    );
  }
}

/// Toolbar action configuration
class DeskiveToolbarAction {
  final IconData? icon;
  final String? tooltip;
  final VoidCallback? onPressed;

  // For menu actions
  final bool isMenu;
  final List<DeskiveToolbarMenuItem>? menuItems;
  final ValueChanged<String>? onMenuItemSelected;

  const DeskiveToolbarAction({
    this.icon,
    this.tooltip,
    this.onPressed,
    this.isMenu = false,
    this.menuItems,
    this.onMenuItemSelected,
  });

  /// Create a simple icon button action
  const DeskiveToolbarAction.icon({
    required IconData icon,
    String? tooltip,
    required VoidCallback onPressed,
  }) : this(
          icon: icon,
          tooltip: tooltip,
          onPressed: onPressed,
          isMenu: false,
        );

  /// Create a menu action with items
  const DeskiveToolbarAction.menu({
    IconData? icon,
    String? tooltip,
    required List<DeskiveToolbarMenuItem> menuItems,
    required ValueChanged<String> onMenuItemSelected,
  }) : this(
          icon: icon,
          tooltip: tooltip,
          isMenu: true,
          menuItems: menuItems,
          onMenuItemSelected: onMenuItemSelected,
        );
}

/// Menu item configuration
class DeskiveToolbarMenuItem {
  final String value;
  final String label;
  final IconData? icon;

  const DeskiveToolbarMenuItem({
    required this.value,
    required this.label,
    this.icon,
  });
}
