import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../api/services/bot_api_service.dart';
import '../../services/workspace_service.dart';
import 'bot_builder_screen.dart';
import 'bot_logs_screen.dart';

/// Main screen for listing and managing bots
class BotsScreen extends StatefulWidget {
  const BotsScreen({super.key});

  @override
  State<BotsScreen> createState() => _BotsScreenState();
}

class _BotsScreenState extends State<BotsScreen> with SingleTickerProviderStateMixin {
  final BotApiService _botService = BotApiService();
  late TabController _tabController;

  // Custom bots state
  List<Bot> _bots = [];
  bool _isLoading = true;
  String? _error;

  // Prebuilt bots state
  List<PrebuiltBot> _prebuiltBots = [];
  bool _isLoadingPrebuilt = false;
  String? _prebuiltError;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadBots();
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    // Rebuild to update FAB visibility
    if (mounted) setState(() {});
    // Load prebuilt bots when switching to that tab
    if (_tabController.index == 1 && _prebuiltBots.isEmpty && !_isLoadingPrebuilt) {
      _loadPrebuiltBots();
    }
  }

  void _onTabTapped(int index) {
    // Called when user taps on a tab
    if (index == 1 && _prebuiltBots.isEmpty && !_isLoadingPrebuilt) {
      _loadPrebuiltBots();
    }
  }

  Future<void> _loadBots() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() {
        _error = 'No workspace selected';
        _isLoading = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _botService.getBots(workspaceId);
      if (response.success && response.data != null) {
        setState(() {
          _bots = response.data!;
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = response.message ?? 'Failed to load bots';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _deleteBot(Bot bot) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('bots.delete_bot'.tr()),
        content: Text('bots.delete_bot_confirm'.tr(args: [bot.name])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('common.delete'.tr()),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
      if (workspaceId == null) return;

      final response = await _botService.deleteBot(workspaceId, bot.id);
      if (response.success) {
        _loadBots();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('bots.bot_deleted'.tr())),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Failed to delete bot')),
          );
        }
      }
    }
  }

  Future<void> _toggleBotStatus(Bot bot) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    final newStatus = bot.status == BotStatus.active
        ? BotStatus.inactive
        : BotStatus.active;

    final response = await _botService.updateBot(
      workspaceId,
      bot.id,
      UpdateBotDto(status: newStatus),
    );

    if (response.success) {
      _loadBots();
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(response.message ?? 'Failed to update bot')),
        );
      }
    }
  }

  void _navigateToCreateBot() async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (context) => const BotBuilderScreen()),
    );

    if (result == true) {
      _loadBots();
    }
  }

  void _navigateToEditBot(Bot bot) async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (context) => BotBuilderScreen(bot: bot)),
    );

    if (result == true) {
      _loadBots();
    }
  }

  void _navigateToBotLogs(Bot bot) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => BotLogsScreen(bot: bot)),
    );
  }

  // ==================== PREBUILT BOTS ====================

  Future<void> _loadPrebuiltBots() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) {
      setState(() {
        _prebuiltError = 'No workspace selected';
        _isLoadingPrebuilt = false;
      });
      return;
    }

    setState(() {
      _isLoadingPrebuilt = true;
      _prebuiltError = null;
    });

    try {
      final response = await _botService.getPrebuiltBots(workspaceId);
      if (response.success && response.data != null) {
        setState(() {
          _prebuiltBots = response.data!;
          _isLoadingPrebuilt = false;
        });
      } else {
        setState(() {
          _prebuiltError = response.message ?? 'Failed to load prebuilt bots';
          _isLoadingPrebuilt = false;
        });
      }
    } catch (e) {
      setState(() {
        _prebuiltError = e.toString();
        _isLoadingPrebuilt = false;
      });
    }
  }

  Future<void> _activatePrebuiltBot(PrebuiltBot prebuiltBot) async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    final response = await _botService.activatePrebuiltBot(
      workspaceId,
      ActivatePrebuiltBotDto(prebuiltBotId: prebuiltBot.id),
    );

    if (response.success) {
      _loadPrebuiltBots();
      _loadBots();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('bots.bot_activated'.tr(args: [prebuiltBot.displayName]))),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(response.message ?? 'Failed to activate bot')),
        );
      }
    }
  }

  Future<void> _deactivatePrebuiltBot(PrebuiltBot prebuiltBot) async {
    if (prebuiltBot.userBotId == null) return;

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    final response = await _botService.deactivatePrebuiltBot(
      workspaceId,
      prebuiltBot.userBotId!,
    );

    if (response.success) {
      _loadPrebuiltBots();
      _loadBots();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('bots.bot_deactivated'.tr(args: [prebuiltBot.displayName]))),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(response.message ?? 'Failed to deactivate bot')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('bots.title'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              if (_tabController.index == 0) {
                _loadBots();
              } else {
                _loadPrebuiltBots();
              }
            },
            tooltip: 'common.refresh'.tr(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          onTap: _onTabTapped,
          tabs: [
            Tab(text: 'bots.custom_bots'.tr()),
            Tab(text: 'bots.prebuilt_bots'.tr()),
          ],
          indicatorColor: Colors.teal,
          labelColor: Colors.teal,
          unselectedLabelColor: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
        ),
      ),
      floatingActionButton: _tabController.index == 0
          ? FloatingActionButton.extended(
              onPressed: _navigateToCreateBot,
              icon: const Icon(Icons.add),
              label: Text('bots.create_bot'.tr()),
              backgroundColor: Colors.teal,
              foregroundColor: Colors.white,
            )
          : null,
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildCustomBotsTab(isDark),
          _buildPrebuiltBotsTab(isDark),
        ],
      ),
    );
  }

  Widget _buildCustomBotsTab(bool isDark) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.teal),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              _error!,
              style: TextStyle(color: Colors.grey.shade600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadBots,
              child: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_bots.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.smart_toy_outlined,
              size: 80,
              color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              'bots.no_bots'.tr(),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'bots.no_bots_description'.tr(),
              style: TextStyle(
                color: isDark ? Colors.grey.shade500 : Colors.grey.shade500,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _navigateToCreateBot,
              icon: const Icon(Icons.add),
              label: Text('bots.create_first_bot'.tr()),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadBots,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _bots.length,
        itemBuilder: (context, index) {
          final bot = _bots[index];
          return _buildBotCard(bot, isDark);
        },
      ),
    );
  }

  Widget _buildBotCard(Bot bot, bool isDark) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => _navigateToEditBot(bot),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Bot avatar
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: _getBotTypeColor(bot.botType).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _getBotTypeIcon(bot.botType),
                      color: _getBotTypeColor(bot.botType),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Bot info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                bot.effectiveDisplayName,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            _buildStatusBadge(bot.status),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          bot.botType.displayName,
                          style: TextStyle(
                            fontSize: 12,
                            color: _getBotTypeColor(bot.botType),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (bot.description != null && bot.description!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  bot.description!,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 12),
              // Stats row
              Row(
                children: [
                  _buildStatChip(
                    Icons.flash_on,
                    '${bot.triggerCount} ${'bots.triggers'.tr()}',
                    Colors.orange,
                  ),
                  const SizedBox(width: 8),
                  _buildStatChip(
                    Icons.play_arrow,
                    '${bot.actionCount} ${'bots.actions'.tr()}',
                    Colors.blue,
                  ),
                  const Spacer(),
                  // Actions menu
                  PopupMenuButton<String>(
                    icon: Icon(
                      Icons.more_vert,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                    ),
                    onSelected: (value) {
                      switch (value) {
                        case 'edit':
                          _navigateToEditBot(bot);
                          break;
                        case 'logs':
                          _navigateToBotLogs(bot);
                          break;
                        case 'toggle':
                          _toggleBotStatus(bot);
                          break;
                        case 'delete':
                          _deleteBot(bot);
                          break;
                      }
                    },
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'edit',
                        child: Row(
                          children: [
                            const Icon(Icons.edit, size: 20),
                            const SizedBox(width: 8),
                            Text('common.edit'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'logs',
                        child: Row(
                          children: [
                            const Icon(Icons.history, size: 20),
                            const SizedBox(width: 8),
                            Text('bots.view_logs'.tr()),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'toggle',
                        child: Row(
                          children: [
                            Icon(
                              bot.status == BotStatus.active
                                  ? Icons.pause
                                  : Icons.play_arrow,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              bot.status == BotStatus.active
                                  ? 'bots.deactivate'.tr()
                                  : 'bots.activate'.tr(),
                            ),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            const Icon(Icons.delete, size: 20, color: Colors.red),
                            const SizedBox(width: 8),
                            Text(
                              'common.delete'.tr(),
                              style: const TextStyle(color: Colors.red),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(BotStatus status) {
    Color color;
    switch (status) {
      case BotStatus.active:
        color = Colors.green;
        break;
      case BotStatus.inactive:
        color = Colors.orange;
        break;
      case BotStatus.draft:
        color = Colors.grey;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.displayName,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Widget _buildStatChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getBotTypeIcon(BotType type) {
    switch (type) {
      case BotType.aiAssistant:
        return Icons.auto_awesome;
      case BotType.webhook:
        return Icons.webhook;
      case BotType.prebuilt:
        return Icons.extension;
      case BotType.custom:
        return Icons.smart_toy;
    }
  }

  Color _getBotTypeColor(BotType type) {
    switch (type) {
      case BotType.aiAssistant:
        return Colors.purple;
      case BotType.webhook:
        return Colors.blue;
      case BotType.prebuilt:
        return Colors.indigo;
      case BotType.custom:
        return Colors.teal;
    }
  }

  // ==================== PREBUILT BOTS TAB ====================

  Widget _buildPrebuiltBotsTab(bool isDark) {
    if (_isLoadingPrebuilt) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.teal),
      );
    }

    if (_prebuiltError != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              _prebuiltError!,
              style: TextStyle(color: Colors.grey.shade600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadPrebuiltBots,
              child: Text('common.retry'.tr()),
            ),
          ],
        ),
      );
    }

    if (_prebuiltBots.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.extension_outlined,
              size: 80,
              color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              'bots.no_prebuilt_bots'.tr(),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'bots.no_prebuilt_bots_description'.tr(),
              style: TextStyle(
                color: isDark ? Colors.grey.shade500 : Colors.grey.shade500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadPrebuiltBots,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _prebuiltBots.length,
        itemBuilder: (context, index) {
          final bot = _prebuiltBots[index];
          return _buildPrebuiltBotCard(bot, isDark);
        },
      ),
    );
  }

  Widget _buildPrebuiltBotCard(PrebuiltBot bot, bool isDark) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Bot avatar
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.indigo.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.extension,
                    color: Colors.indigo,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                // Bot info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              bot.displayName,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (bot.isActivated)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.green.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.check, size: 12, color: Colors.green),
                                  const SizedBox(width: 4),
                                  Text(
                                    'bots.activated'.tr(),
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.green,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.grey.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          bot.category,
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              bot.description,
              style: TextStyle(
                fontSize: 13,
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            // Features
            if (bot.features.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: bot.features.take(3).map((feature) {
                  return Container(
                    constraints: const BoxConstraints(maxWidth: 160),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.indigo.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check, size: 12, color: Colors.indigo),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            feature,
                            style: const TextStyle(
                              fontSize: 11,
                              color: Colors.indigo,
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
              if (bot.features.length > 3)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    '+${bot.features.length - 3} more',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
                    ),
                  ),
                ),
            ],
            const SizedBox(height: 16),
            // Action button
            SizedBox(
              width: double.infinity,
              child: bot.isActivated
                  ? OutlinedButton(
                      onPressed: () => _deactivatePrebuiltBot(bot),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.orange,
                        side: const BorderSide(color: Colors.orange),
                      ),
                      child: Text('bots.deactivate'.tr()),
                    )
                  : ElevatedButton.icon(
                      onPressed: () => _activatePrebuiltBot(bot),
                      icon: const Icon(Icons.play_arrow, size: 18),
                      label: Text('bots.activate'.tr()),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        foregroundColor: Colors.white,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
