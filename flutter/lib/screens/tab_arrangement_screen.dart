import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/tab_config.dart';
import '../config/tab_registry.dart';
import '../services/tab_configuration_service.dart';

/// Screen for arranging tabs in bottom navigation and More menu
class TabArrangementScreen extends StatefulWidget {
  const TabArrangementScreen({super.key});

  @override
  State<TabArrangementScreen> createState() => _TabArrangementScreenState();
}

class _TabArrangementScreenState extends State<TabArrangementScreen> {
  final TabConfigurationService _configService = TabConfigurationService();

  // Local state for editing (commit on save)
  late List<String> _bottomNavIds;
  late List<String> _moreMenuIds;
  bool _hasChanges = false;
  bool _isLoading = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadConfiguration();
  }

  Future<void> _loadConfiguration() async {
    setState(() => _isLoading = true);

    try {
      final config = await _configService.loadConfiguration();
      setState(() {
        _bottomNavIds = List.from(config.bottomNavTabIds);
        _moreMenuIds = List.from(config.moreMenuTabIds);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _bottomNavIds = List.from(TabRegistry.defaultBottomNavIds);
        _moreMenuIds = TabRegistry.allTabs
            .map((t) => t.id)
            .where((id) => !_bottomNavIds.contains(id))
            .toList();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('settings.arrange_tabs'.tr()),
        actions: [
          if (_hasChanges && !_isSaving)
            TextButton(
              onPressed: _saveChanges,
              child: Text(
                'common.save'.tr(),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          if (_isSaving)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'reset') {
                _showResetConfirmation();
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'reset',
                child: Row(
                  children: [
                    const Icon(Icons.restore, size: 20),
                    const SizedBox(width: 8),
                    Text('settings.reset_to_default'.tr()),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Instructions
                  _buildInstructions(isDark),
                  const SizedBox(height: 24),

                  // Bottom Navigation Section
                  _buildSectionHeader(
                    'settings.bottom_navigation'.tr(),
                    '${_bottomNavIds.length}/${TabRegistry.maxBottomNavTabs}',
                    Icons.navigation_outlined,
                  ),
                  const SizedBox(height: 8),
                  _buildBottomNavList(isDark),
                  const SizedBox(height: 24),

                  // More Menu Section
                  _buildSectionHeader(
                    'settings.more_menu'.tr(),
                    '${_moreMenuIds.length}',
                    Icons.menu_outlined,
                  ),
                  const SizedBox(height: 8),
                  _buildMoreMenuList(isDark),

                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }

  Widget _buildInstructions(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade300,
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.info_outline,
            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'settings.arrange_tabs_instructions'.tr(),
              style: TextStyle(
                fontSize: 13,
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, String count, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.teal),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.teal.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            count,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Colors.teal.shade700,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomNavList(bool isDark) {
    return ReorderableListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _bottomNavIds.length,
      onReorder: _onReorderBottomNav,
      proxyDecorator: (child, index, animation) {
        return Material(
          elevation: 4,
          borderRadius: BorderRadius.circular(12),
          child: child,
        );
      },
      itemBuilder: (context, index) {
        final tabId = _bottomNavIds[index];
        final tab = TabRegistry.getTabById(tabId);
        if (tab == null) return const SizedBox.shrink();

        return _TabListItem(
          key: ValueKey(tabId),
          tab: tab,
          isInBottomNav: true,
          canRemove: tab.isRemovable && _bottomNavIds.length > 1,
          onToggle: tab.isRemovable ? () => _moveToMoreMenu(tabId) : null,
          isDark: isDark,
        );
      },
    );
  }

  Widget _buildMoreMenuList(bool isDark) {
    if (_moreMenuIds.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? Colors.grey.shade900 : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
          ),
        ),
        child: Center(
          child: Text(
            'settings.more_menu_empty'.tr(),
            style: TextStyle(
              color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
            ),
          ),
        ),
      );
    }

    return ReorderableListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _moreMenuIds.length,
      onReorder: _onReorderMoreMenu,
      proxyDecorator: (child, index, animation) {
        return Material(
          elevation: 4,
          borderRadius: BorderRadius.circular(12),
          child: child,
        );
      },
      itemBuilder: (context, index) {
        final tabId = _moreMenuIds[index];
        final tab = TabRegistry.getTabById(tabId);
        if (tab == null) return const SizedBox.shrink();

        final canAdd = _bottomNavIds.length < TabRegistry.maxBottomNavTabs;

        return _TabListItem(
          key: ValueKey(tabId),
          tab: tab,
          isInBottomNav: false,
          canRemove: canAdd,
          onToggle: canAdd ? () => _moveToBottomNav(tabId) : null,
          isDark: isDark,
        );
      },
    );
  }

  void _onReorderBottomNav(int oldIndex, int newIndex) {
    setState(() {
      if (newIndex > oldIndex) newIndex--;
      final item = _bottomNavIds.removeAt(oldIndex);
      _bottomNavIds.insert(newIndex, item);
      _hasChanges = true;
    });
  }

  void _onReorderMoreMenu(int oldIndex, int newIndex) {
    setState(() {
      if (newIndex > oldIndex) newIndex--;
      final item = _moreMenuIds.removeAt(oldIndex);
      _moreMenuIds.insert(newIndex, item);
      _hasChanges = true;
    });
  }

  void _moveToMoreMenu(String tabId) {
    final tab = TabRegistry.getTabById(tabId);
    if (tab == null || !tab.isRemovable) return;

    setState(() {
      _bottomNavIds.remove(tabId);
      _moreMenuIds.insert(0, tabId);
      _hasChanges = true;
    });
  }

  void _moveToBottomNav(String tabId) {
    if (_bottomNavIds.length >= TabRegistry.maxBottomNavTabs) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('settings.max_tabs_reached'.tr()),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _moreMenuIds.remove(tabId);
      _bottomNavIds.add(tabId);
      _hasChanges = true;
    });
  }

  Future<void> _saveChanges() async {
    setState(() => _isSaving = true);

    try {
      final newConfig = TabConfiguration(
        bottomNavTabIds: _bottomNavIds,
        moreMenuTabIds: _moreMenuIds,
        lastModified: DateTime.now(),
      );

      await _configService.saveConfiguration(newConfig);

      setState(() {
        _hasChanges = false;
        _isSaving = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('settings.tabs_saved'.tr()),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      setState(() => _isSaving = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('settings.save_failed'.tr()),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showResetConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('settings.reset_tabs'.tr()),
        content: Text('settings.reset_tabs_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _resetToDefault();
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('settings.reset'.tr()),
          ),
        ],
      ),
    );
  }

  Future<void> _resetToDefault() async {
    setState(() {
      _bottomNavIds = List.from(TabRegistry.defaultBottomNavIds);
      _moreMenuIds = TabRegistry.allTabs
          .map((t) => t.id)
          .where((id) => !_bottomNavIds.contains(id))
          .toList();
      _hasChanges = true;
    });
  }
}

/// Individual tab list item widget
class _TabListItem extends StatelessWidget {
  final TabItem tab;
  final bool isInBottomNav;
  final bool canRemove;
  final VoidCallback? onToggle;
  final bool isDark;

  const _TabListItem({
    super.key,
    required this.tab,
    required this.isInBottomNav,
    required this.canRemove,
    this.onToggle,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.teal.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(tab.icon, color: Colors.teal, size: 22),
        ),
        title: Text(
          tab.labelKey.tr(),
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: !tab.isRemovable
            ? Text(
                'settings.required_tab'.tr(),
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.teal.shade600,
                  fontWeight: FontWeight.w500,
                ),
              )
            : null,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (tab.isRemovable && onToggle != null)
              IconButton(
                icon: Icon(
                  isInBottomNav
                      ? Icons.remove_circle_outline
                      : Icons.add_circle_outline,
                  color: isInBottomNav ? Colors.red.shade400 : Colors.green.shade600,
                ),
                onPressed: onToggle,
                tooltip: isInBottomNav
                    ? 'settings.move_to_more'.tr()
                    : 'settings.move_to_nav'.tr(),
              ),
            ReorderableDragStartListener(
              index: 0,
              child: Icon(
                Icons.drag_handle,
                color: isDark ? Colors.grey.shade500 : Colors.grey.shade400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
