import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../api/base_api_client.dart';
import '../../api/services/bot_api_service.dart';
import '../../api/services/chat_api_service.dart';
import '../../services/workspace_service.dart';

/// Screen for creating and editing bots
class BotBuilderScreen extends StatefulWidget {
  final Bot? bot;

  const BotBuilderScreen({super.key, this.bot});

  @override
  State<BotBuilderScreen> createState() => _BotBuilderScreenState();
}

class _BotBuilderScreenState extends State<BotBuilderScreen>
    with SingleTickerProviderStateMixin {
  final BotApiService _botService = BotApiService();
  final ChatApiService _chatService = ChatApiService();
  late TabController _tabController;

  // Form controllers
  final _nameController = TextEditingController();
  final _displayNameController = TextEditingController();
  final _descriptionController = TextEditingController();

  // Bot settings
  BotType _botType = BotType.custom;
  BotStatus _status = BotStatus.active;
  int _rateLimit = 10;
  int _responseDelay = 0;
  int _maxExecutionDepth = 3;

  // Triggers and Actions
  List<BotTrigger> _triggers = [];
  List<BotAction> _actions = [];

  // Installations
  List<BotInstallation> _installations = [];
  List<Channel> _channels = [];
  List<Conversation> _conversations = [];
  bool _isLoadingInstallations = false;

  bool _isLoading = false;
  bool _isSaving = false;
  String? _botId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);

    if (widget.bot != null) {
      _botId = widget.bot!.id;
      _nameController.text = widget.bot!.name;
      _displayNameController.text = widget.bot!.displayName ?? '';
      _descriptionController.text = widget.bot!.description ?? '';
      _botType = widget.bot!.botType;
      _status = widget.bot!.status;
      _rateLimit = widget.bot!.settings.rateLimit ?? 10;
      _responseDelay = widget.bot!.settings.responseDelay ?? 0;
      _maxExecutionDepth = widget.bot!.settings.maxExecutionDepth ?? 3;
      _loadTriggersAndActions();
      _loadInstallationsAndLocations();
    }
  }

  Future<void> _loadTriggersAndActions() async {
    if (_botId == null) return;
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() => _isLoading = true);

    try {
      final triggersResponse = await _botService.getTriggers(workspaceId, _botId!);
      final actionsResponse = await _botService.getActions(workspaceId, _botId!);

      if (mounted) {
        setState(() {
          if (triggersResponse.success) _triggers = triggersResponse.data ?? [];
          if (actionsResponse.success) _actions = actionsResponse.data ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadInstallationsAndLocations() async {
    if (_botId == null) return;
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() => _isLoadingInstallations = true);

    try {
      // Load installations, channels, and conversations in parallel
      final results = await Future.wait([
        _botService.getInstallations(workspaceId, _botId!),
        _chatService.getChannels(workspaceId),
        _chatService.getConversations(workspaceId),
      ]);

      if (mounted) {
        setState(() {
          final installationsResponse = results[0] as ApiResponse<List<BotInstallation>>;
          final channelsResponse = results[1] as ApiResponse<List<Channel>>;
          final conversationsResponse = results[2] as ApiResponse<List<Conversation>>;

          if (installationsResponse.success) {
            _installations = installationsResponse.data ?? [];
          }
          if (channelsResponse.success) {
            _channels = channelsResponse.data ?? [];
          }
          if (conversationsResponse.success) {
            _conversations = conversationsResponse.data ?? [];
          }
          _isLoadingInstallations = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingInstallations = false);
    }
  }

  Future<void> _installBot(String? channelId, String? conversationId) async {
    if (_botId == null) return;
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    try {
      final response = await _botService.installBot(
        workspaceId,
        _botId!,
        InstallBotDto(
          channelId: channelId,
          conversationId: conversationId,
        ),
      );

      if (response.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('bots.bot_installed'.tr())),
          );
        }
        _loadInstallationsAndLocations();
      } else {
        throw Exception(response.message ?? 'Failed to install bot');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    }
  }

  Future<void> _uninstallBot(BotInstallation installation) async {
    if (_botId == null) return;
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('bots.uninstall_bot'.tr()),
        content: Text('bots.uninstall_bot_confirm'.tr()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('common.cancel'.tr()),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('bots.uninstall'.tr()),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final response = await _botService.uninstallBot(
        workspaceId,
        _botId!,
        channelId: installation.channelId,
        conversationId: installation.conversationId,
      );

      if (response.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('bots.bot_uninstalled'.tr())),
          );
        }
        _loadInstallationsAndLocations();
      } else {
        throw Exception(response.message ?? 'Failed to uninstall bot');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    }
  }

  void _showInstallBotDialog() {
    if (_botId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('bots.save_bot_first'.tr())),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _InstallBotSheet(
        channels: _channels,
        conversations: _conversations,
        existingInstallations: _installations,
        onInstall: (channelId, conversationId) {
          Navigator.pop(context);
          _installBot(channelId, conversationId);
        },
      ),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _displayNameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _saveBot() async {
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('bots.name_required'.tr())),
      );
      return;
    }

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() => _isSaving = true);

    try {
      final settings = BotSettings(
        rateLimit: _rateLimit,
        responseDelay: _responseDelay,
        maxExecutionDepth: _maxExecutionDepth,
      );

      if (_botId == null) {
        // Create new bot
        final response = await _botService.createBot(
          workspaceId,
          CreateBotDto(
            name: _nameController.text.trim(),
            displayName: _displayNameController.text.trim().isNotEmpty
                ? _displayNameController.text.trim()
                : null,
            description: _descriptionController.text.trim().isNotEmpty
                ? _descriptionController.text.trim()
                : null,
            botType: _botType,
            status: _status,
            settings: settings,
          ),
        );

        if (response.success && response.data != null) {
          setState(() {
            _botId = response.data!.id;
          });
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('bots.bot_created'.tr())),
            );
          }
        } else {
          throw Exception(response.message ?? 'Failed to create bot');
        }
      } else {
        // Update existing bot
        final response = await _botService.updateBot(
          workspaceId,
          _botId!,
          UpdateBotDto(
            name: _nameController.text.trim(),
            displayName: _displayNameController.text.trim().isNotEmpty
                ? _displayNameController.text.trim()
                : null,
            description: _descriptionController.text.trim().isNotEmpty
                ? _descriptionController.text.trim()
                : null,
            botType: _botType,
            status: _status,
            settings: settings,
          ),
        );

        if (response.success) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('bots.bot_updated'.tr())),
            );
          }
        } else {
          throw Exception(response.message ?? 'Failed to update bot');
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showTestBotDialog() {
    if (_botId == null) return;

    showDialog(
      context: context,
      builder: (context) => _TestBotDialog(
        botService: _botService,
        botId: _botId!,
        botName: _nameController.text,
      ),
    );
  }

  void _showAddTriggerDialog() {
    if (_botId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('bots.save_bot_first'.tr())),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => TriggerEditorSheet(
        botId: _botId!,
        onSaved: () {
          Navigator.pop(context);
          _loadTriggersAndActions();
        },
      ),
    );
  }

  void _showEditTriggerDialog(BotTrigger trigger) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => TriggerEditorSheet(
        botId: _botId!,
        trigger: trigger,
        onSaved: () {
          Navigator.pop(context);
          _loadTriggersAndActions();
        },
      ),
    );
  }

  void _showAddActionDialog() {
    if (_botId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('bots.save_bot_first'.tr())),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => ActionEditorSheet(
        botId: _botId!,
        onSaved: () {
          Navigator.pop(context);
          _loadTriggersAndActions();
        },
      ),
    );
  }

  void _showEditActionDialog(BotAction action) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => ActionEditorSheet(
        botId: _botId!,
        action: action,
        onSaved: () {
          Navigator.pop(context);
          _loadTriggersAndActions();
        },
      ),
    );
  }

  Future<void> _deleteTrigger(BotTrigger trigger) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('bots.delete_trigger'.tr()),
        content: Text('bots.delete_trigger_confirm'.tr()),
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

      final response = await _botService.deleteTrigger(
        workspaceId,
        _botId!,
        trigger.id,
      );

      if (response.success) {
        _loadTriggersAndActions();
      }
    }
  }

  Future<void> _deleteAction(BotAction action) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('bots.delete_action'.tr()),
        content: Text('bots.delete_action_confirm'.tr()),
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

      final response = await _botService.deleteAction(
        workspaceId,
        _botId!,
        action.id,
      );

      if (response.success) {
        _loadTriggersAndActions();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.bot == null ? 'bots.create_bot'.tr() : 'bots.edit_bot'.tr()),
        actions: [
          // Test Bot button (only show for existing bots)
          if (_botId != null && !_isSaving)
            TextButton.icon(
              onPressed: _showTestBotDialog,
              icon: const Icon(Icons.play_circle_outline, size: 18),
              label: Text('bots.test'.tr()),
              style: TextButton.styleFrom(foregroundColor: Colors.orange),
            ),
          if (_isSaving)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          else
            TextButton(
              onPressed: _saveBot,
              child: Text(
                'common.save'.tr(),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.teal,
          unselectedLabelColor: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          indicatorColor: Colors.teal,
          isScrollable: true,
          tabs: [
            Tab(text: 'bots.general'.tr()),
            Tab(text: 'bots.triggers'.tr()),
            Tab(text: 'bots.actions'.tr()),
            Tab(text: 'bots.installations'.tr()),
            Tab(text: 'bots.settings'.tr()),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildGeneralTab(isDark),
          _buildTriggersTab(isDark),
          _buildActionsTab(isDark),
          _buildInstallationsTab(isDark),
          _buildSettingsTab(isDark),
        ],
      ),
    );
  }

  Widget _buildGeneralTab(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Name field
          TextField(
            controller: _nameController,
            decoration: InputDecoration(
              labelText: 'bots.bot_name'.tr(),
              hintText: 'bots.bot_name_hint'.tr(),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 16),

          // Display name field
          TextField(
            controller: _displayNameController,
            decoration: InputDecoration(
              labelText: 'bots.display_name'.tr(),
              hintText: 'bots.display_name_hint'.tr(),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 16),

          // Description field
          TextField(
            controller: _descriptionController,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: 'bots.description'.tr(),
              hintText: 'bots.description_hint'.tr(),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 24),

          // Bot type selection
          Text(
            'bots.bot_type'.tr(),
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: BotType.values.map((type) {
              final isSelected = _botType == type;
              return ChoiceChip(
                label: Text(type.displayName),
                selected: isSelected,
                onSelected: (selected) {
                  if (selected) setState(() => _botType = type);
                },
                selectedColor: Colors.teal.withValues(alpha: 0.2),
                labelStyle: TextStyle(
                  color: isSelected ? Colors.teal : null,
                  fontWeight: isSelected ? FontWeight.bold : null,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),

          // Status selection
          Text(
            'bots.status'.tr(),
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: BotStatus.values.map((status) {
              final isSelected = _status == status;
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
              return ChoiceChip(
                label: Text(status.displayName),
                selected: isSelected,
                onSelected: (selected) {
                  if (selected) setState(() => _status = status);
                },
                selectedColor: color.withValues(alpha: 0.2),
                labelStyle: TextStyle(
                  color: isSelected ? color : null,
                  fontWeight: isSelected ? FontWeight.bold : null,
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildTriggersTab(bool isDark) {
    return Column(
      children: [
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _triggers.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.flash_off,
                            size: 64,
                            color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'bots.no_triggers'.tr(),
                            style: TextStyle(
                              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _triggers.length,
                      itemBuilder: (context, index) {
                        final trigger = _triggers[index];
                        return _buildTriggerCard(trigger, isDark);
                      },
                    ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _showAddTriggerDialog,
              icon: const Icon(Icons.add),
              label: Text('bots.add_trigger'.tr()),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTriggerCard(BotTrigger trigger, bool isDark) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.orange.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            _getTriggerIcon(trigger.triggerType),
            color: Colors.orange,
            size: 20,
          ),
        ),
        title: Text(trigger.name),
        subtitle: Text(
          trigger.triggerType.displayName,
          style: TextStyle(
            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!trigger.isActive)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'bots.inactive'.tr(),
                  style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                ),
              ),
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'edit') {
                  _showEditTriggerDialog(trigger);
                } else if (value == 'delete') {
                  _deleteTrigger(trigger);
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'edit',
                  child: Row(
                    children: [
                      const Icon(Icons.edit, size: 18),
                      const SizedBox(width: 8),
                      Text('common.edit'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      const Icon(Icons.delete, size: 18, color: Colors.red),
                      const SizedBox(width: 8),
                      Text('common.delete'.tr(), style: const TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
        onTap: () => _showEditTriggerDialog(trigger),
      ),
    );
  }

  Widget _buildActionsTab(bool isDark) {
    return Column(
      children: [
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _actions.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.play_disabled,
                            size: 64,
                            color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'bots.no_actions'.tr(),
                            style: TextStyle(
                              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ReorderableListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _actions.length,
                      onReorder: _reorderActions,
                      itemBuilder: (context, index) {
                        final action = _actions[index];
                        return _buildActionCard(action, isDark, key: ValueKey(action.id));
                      },
                    ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _showAddActionDialog,
              icon: const Icon(Icons.add),
              label: Text('bots.add_action'.tr()),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionCard(BotAction action, bool isDark, {Key? key}) {
    return Card(
      key: key,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.blue.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            _getActionIcon(action.actionType),
            color: Colors.blue,
            size: 20,
          ),
        ),
        title: Text(action.name),
        subtitle: Text(
          action.actionType.displayName,
          style: TextStyle(
            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!action.isActive)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'bots.inactive'.tr(),
                  style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                ),
              ),
            const Icon(Icons.drag_handle, color: Colors.grey),
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'edit') {
                  _showEditActionDialog(action);
                } else if (value == 'delete') {
                  _deleteAction(action);
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'edit',
                  child: Row(
                    children: [
                      const Icon(Icons.edit, size: 18),
                      const SizedBox(width: 8),
                      Text('common.edit'.tr()),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      const Icon(Icons.delete, size: 18, color: Colors.red),
                      const SizedBox(width: 8),
                      Text('common.delete'.tr(), style: const TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
        onTap: () => _showEditActionDialog(action),
      ),
    );
  }

  Future<void> _reorderActions(int oldIndex, int newIndex) async {
    if (newIndex > oldIndex) newIndex--;

    setState(() {
      final action = _actions.removeAt(oldIndex);
      _actions.insert(newIndex, action);
    });

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null || _botId == null) return;

    final actionIds = _actions.map((a) => a.id).toList();
    await _botService.reorderActions(workspaceId, _botId!, actionIds);
  }

  Widget _buildInstallationsTab(bool isDark) {
    if (_botId == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.save,
              size: 64,
              color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              'bots.save_bot_first'.tr(),
              style: TextStyle(
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        Expanded(
          child: _isLoadingInstallations
              ? const Center(child: CircularProgressIndicator())
              : _installations.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.install_desktop,
                            size: 64,
                            color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'bots.no_installations'.tr(),
                            style: TextStyle(
                              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'bots.install_bot_hint'.tr(),
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.grey.shade500 : Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _installations.length,
                      itemBuilder: (context, index) {
                        final installation = _installations[index];
                        return _buildInstallationCard(installation, isDark);
                      },
                    ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _showInstallBotDialog,
              icon: const Icon(Icons.add),
              label: Text('bots.install_bot'.tr()),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInstallationCard(BotInstallation installation, bool isDark) {
    // Find the channel or conversation name
    String locationName = 'bots.unknown_location'.tr();
    IconData locationIcon = Icons.help_outline;

    if (installation.channelId != null) {
      final channel = _channels.firstWhere(
        (c) => c.id == installation.channelId,
        orElse: () => Channel(
          id: '',
          name: 'bots.unknown_channel'.tr(),
          type: 'public',
          workspaceId: '',
          createdBy: '',
          isPrivate: false,
          isArchived: false,
          memberCount: 0,
          unreadCount: 0,
          isMember: false,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ),
      );
      locationName = '#${channel.name}';
      locationIcon = channel.isPrivate ? Icons.lock : Icons.tag;
    } else if (installation.conversationId != null) {
      final conversation = _conversations.firstWhere(
        (c) => c.id == installation.conversationId,
        orElse: () => Conversation(
          id: '',
          type: 'direct',
          workspaceId: '',
          participants: [],
          createdBy: '',
          isActive: true,
          isArchived: false,
          messageCount: 0,
          unreadCount: 0,
          isStarred: false,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ),
      );
      locationName = conversation.name ?? 'bots.direct_message'.tr();
      locationIcon = conversation.type == 'group' ? Icons.group : Icons.person;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.teal.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            locationIcon,
            color: Colors.teal,
            size: 20,
          ),
        ),
        title: Text(locationName),
        subtitle: Text(
          installation.isActive
              ? 'bots.installed_active'.tr()
              : 'bots.installed_inactive'.tr(),
          style: TextStyle(
            color: installation.isActive ? Colors.green : Colors.grey,
            fontSize: 12,
          ),
        ),
        trailing: IconButton(
          icon: const Icon(Icons.delete_outline, color: Colors.red),
          onPressed: () => _uninstallBot(installation),
        ),
      ),
    );
  }

  Widget _buildSettingsTab(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Rate limit
          Text(
            'bots.rate_limit'.tr(),
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            'bots.rate_limit_description'.tr(),
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          Slider(
            value: _rateLimit.toDouble(),
            min: 1,
            max: 100,
            divisions: 99,
            label: '$_rateLimit / min',
            onChanged: (value) => setState(() => _rateLimit = value.toInt()),
          ),
          const SizedBox(height: 24),

          // Response delay
          Text(
            'bots.response_delay'.tr(),
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            'bots.response_delay_description'.tr(),
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          Slider(
            value: _responseDelay.toDouble(),
            min: 0,
            max: 10000,
            divisions: 100,
            label: '${_responseDelay}ms',
            onChanged: (value) => setState(() => _responseDelay = value.toInt()),
          ),
          const SizedBox(height: 24),

          // Max execution depth
          Text(
            'bots.max_execution_depth'.tr(),
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            'bots.max_execution_depth_description'.tr(),
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
            ),
          ),
          Slider(
            value: _maxExecutionDepth.toDouble(),
            min: 1,
            max: 5,
            divisions: 4,
            label: '$_maxExecutionDepth',
            onChanged: (value) => setState(() => _maxExecutionDepth = value.toInt()),
          ),
        ],
      ),
    );
  }

  IconData _getTriggerIcon(TriggerType type) {
    switch (type) {
      case TriggerType.keyword:
        return Icons.text_fields;
      case TriggerType.regex:
        return Icons.code;
      case TriggerType.schedule:
        return Icons.schedule;
      case TriggerType.webhook:
        return Icons.webhook;
      case TriggerType.mention:
        return Icons.alternate_email;
      case TriggerType.anyMessage:
        return Icons.chat_bubble;
    }
  }

  IconData _getActionIcon(ActionType type) {
    switch (type) {
      case ActionType.sendMessage:
        return Icons.message;
      case ActionType.sendAiMessage:
        return Icons.auto_awesome;
      case ActionType.aiAutopilot:
        return Icons.psychology;
      case ActionType.createTask:
        return Icons.task_alt;
      case ActionType.createEvent:
        return Icons.event;
      case ActionType.callWebhook:
        return Icons.webhook;
      case ActionType.sendEmail:
        return Icons.email;
    }
  }
}

/// Sheet for editing triggers
class TriggerEditorSheet extends StatefulWidget {
  final String botId;
  final BotTrigger? trigger;
  final VoidCallback onSaved;

  const TriggerEditorSheet({
    super.key,
    required this.botId,
    this.trigger,
    required this.onSaved,
  });

  @override
  State<TriggerEditorSheet> createState() => _TriggerEditorSheetState();
}

class _TriggerEditorSheetState extends State<TriggerEditorSheet> {
  final BotApiService _botService = BotApiService();
  final _nameController = TextEditingController();

  TriggerType _triggerType = TriggerType.keyword;
  bool _isActive = true;
  int _priority = 0;
  int _cooldownSeconds = 0;
  bool _isSaving = false;

  // Keyword trigger config
  List<String> _keywords = [];
  final _keywordController = TextEditingController();
  MatchType _matchType = MatchType.contains;
  bool _caseSensitive = false;

  // Regex trigger config
  final _patternController = TextEditingController();
  final _flagsController = TextEditingController();

  // Schedule trigger config
  final _cronController = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.trigger != null) {
      _nameController.text = widget.trigger!.name;
      _triggerType = widget.trigger!.triggerType;
      _isActive = widget.trigger!.isActive;
      _priority = widget.trigger!.priority;
      _cooldownSeconds = widget.trigger!.cooldownSeconds;
      _loadTriggerConfig();
    }
  }

  void _loadTriggerConfig() {
    final config = widget.trigger!.triggerConfig;
    switch (_triggerType) {
      case TriggerType.keyword:
        _keywords = (config['keywords'] as List?)?.map((e) => e.toString()).toList() ?? [];
        _matchType = MatchType.fromString(config['matchType']);
        _caseSensitive = config['caseSensitive'] ?? false;
        break;
      case TriggerType.regex:
        _patternController.text = config['pattern'] ?? '';
        _flagsController.text = config['flags'] ?? '';
        break;
      case TriggerType.schedule:
        _cronController.text = config['cron'] ?? '';
        break;
      default:
        break;
    }
  }

  Map<String, dynamic> _buildTriggerConfig() {
    switch (_triggerType) {
      case TriggerType.keyword:
        return {
          'keywords': _keywords,
          'matchType': _matchType.value,
          'caseSensitive': _caseSensitive,
        };
      case TriggerType.regex:
        return {
          'pattern': _patternController.text,
          'flags': _flagsController.text,
        };
      case TriggerType.schedule:
        return {
          'cron': _cronController.text,
          'timezone': 'UTC',
        };
      case TriggerType.mention:
        return {'requireAtMention': true};
      case TriggerType.anyMessage:
        return {'includeThreads': false};
      case TriggerType.webhook:
        return {'endpointPath': ''};
    }
  }

  void _addKeyword() {
    final keyword = _keywordController.text.trim();
    if (keyword.isNotEmpty && !_keywords.contains(keyword)) {
      setState(() {
        _keywords.add(keyword);
        _keywordController.clear();
      });
    }
  }

  Future<void> _save() async {
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('bots.trigger_name_required'.tr())),
      );
      return;
    }

    // Validate trigger-specific config
    if (_triggerType == TriggerType.keyword && _keywords.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Keyword trigger requires at least one keyword')),
      );
      return;
    }

    if (_triggerType == TriggerType.regex && _patternController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Regex trigger requires a pattern')),
      );
      return;
    }

    if (_triggerType == TriggerType.schedule && _cronController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Schedule trigger requires a cron expression')),
      );
      return;
    }

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() => _isSaving = true);

    try {
      final ApiResponse response;
      if (widget.trigger == null) {
        // Create new trigger
        response = await _botService.createTrigger(
          workspaceId,
          widget.botId,
          CreateTriggerDto(
            name: _nameController.text.trim(),
            triggerType: _triggerType,
            triggerConfig: _buildTriggerConfig(),
            isActive: _isActive,
            priority: _priority,
            cooldownSeconds: _cooldownSeconds,
          ),
        );
      } else {
        // Update existing trigger
        response = await _botService.updateTrigger(
          workspaceId,
          widget.botId,
          widget.trigger!.id,
          UpdateTriggerDto(
            name: _nameController.text.trim(),
            triggerType: _triggerType,
            triggerConfig: _buildTriggerConfig(),
            isActive: _isActive,
            priority: _priority,
            cooldownSeconds: _cooldownSeconds,
          ),
        );
      }

      if (response.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('bots.trigger_saved'.tr())),
          );
        }
        widget.onSaved();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Failed to save trigger')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _keywordController.dispose();
    _patternController.dispose();
    _flagsController.dispose();
    _cronController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Colors.grey.shade300),
                  ),
                ),
                child: Row(
                  children: [
                    Text(
                      widget.trigger == null
                          ? 'bots.add_trigger'.tr()
                          : 'bots.edit_trigger'.tr(),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    if (_isSaving)
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    else
                      TextButton(
                        onPressed: _save,
                        child: Text('common.save'.tr()),
                      ),
                  ],
                ),
              ),
              // Content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Name field
                    TextField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: 'bots.trigger_name'.tr(),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Trigger type dropdown
                    DropdownButtonFormField<TriggerType>(
                      value: _triggerType,
                      decoration: InputDecoration(
                        labelText: 'bots.trigger_type'.tr(),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      items: TriggerType.values.map((type) {
                        return DropdownMenuItem(
                          value: type,
                          child: Text(type.displayName),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) setState(() => _triggerType = value);
                      },
                    ),
                    const SizedBox(height: 16),

                    // Type-specific config
                    _buildTypeConfig(),

                    const SizedBox(height: 16),

                    // Active switch
                    SwitchListTile(
                      title: Text('bots.active'.tr()),
                      value: _isActive,
                      onChanged: (value) => setState(() => _isActive = value),
                    ),

                    // Priority slider
                    const SizedBox(height: 8),
                    Text('${'bots.priority'.tr()}: $_priority'),
                    Slider(
                      value: _priority.toDouble(),
                      min: 0,
                      max: 100,
                      divisions: 100,
                      onChanged: (value) => setState(() => _priority = value.toInt()),
                    ),

                    // Cooldown slider
                    const SizedBox(height: 8),
                    Text('${'bots.cooldown'.tr()}: ${_cooldownSeconds}s'),
                    Slider(
                      value: _cooldownSeconds.toDouble(),
                      min: 0,
                      max: 300,
                      divisions: 60,
                      onChanged: (value) => setState(() => _cooldownSeconds = value.toInt()),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTypeConfig() {
    switch (_triggerType) {
      case TriggerType.keyword:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _keywordController,
                    decoration: InputDecoration(
                      labelText: 'bots.keyword'.tr(),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    onSubmitted: (_) => _addKeyword(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _addKeyword,
                  icon: const Icon(Icons.add),
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.teal,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _keywords.map((keyword) {
                return Chip(
                  label: Text(keyword),
                  onDeleted: () {
                    setState(() => _keywords.remove(keyword));
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<MatchType>(
              value: _matchType,
              decoration: InputDecoration(
                labelText: 'bots.match_type'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              items: MatchType.values.map((type) {
                return DropdownMenuItem(
                  value: type,
                  child: Text(type.displayName),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) setState(() => _matchType = value);
              },
            ),
            SwitchListTile(
              title: Text('bots.case_sensitive'.tr()),
              value: _caseSensitive,
              onChanged: (value) => setState(() => _caseSensitive = value),
            ),
          ],
        );

      case TriggerType.regex:
        return Column(
          children: [
            TextField(
              controller: _patternController,
              decoration: InputDecoration(
                labelText: 'bots.pattern'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _flagsController,
              decoration: InputDecoration(
                labelText: 'bots.flags'.tr(),
                hintText: 'i, g, m',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        );

      case TriggerType.schedule:
        return TextField(
          controller: _cronController,
          decoration: InputDecoration(
            labelText: 'bots.cron_expression'.tr(),
            hintText: '0 9 * * *',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        );

      default:
        return const SizedBox.shrink();
    }
  }
}

/// Sheet for editing actions
class ActionEditorSheet extends StatefulWidget {
  final String botId;
  final BotAction? action;
  final VoidCallback onSaved;

  const ActionEditorSheet({
    super.key,
    required this.botId,
    this.action,
    required this.onSaved,
  });

  @override
  State<ActionEditorSheet> createState() => _ActionEditorSheetState();
}

class _ActionEditorSheetState extends State<ActionEditorSheet> {
  final BotApiService _botService = BotApiService();
  final _nameController = TextEditingController();

  ActionType _actionType = ActionType.sendMessage;
  bool _isActive = true;
  FailurePolicy _failurePolicy = FailurePolicy.continueExecution;
  bool _isSaving = false;

  // Trigger linking
  List<BotTrigger> _triggers = [];
  String? _selectedTriggerId;
  bool _isLoadingTriggers = false;

  // Send message config
  final _messageController = TextEditingController();
  bool _replyToTrigger = true;
  bool _mentionUser = false;

  // AI message config
  final _systemPromptController = TextEditingController();
  int _maxTokens = 500;
  bool _includeContext = true;

  // Create task config
  final _taskTitleController = TextEditingController();
  final _taskDescriptionController = TextEditingController();
  String _taskPriority = 'medium';
  bool _assignToUser = false;
  int _dueDaysOffset = 1;

  // Webhook config
  final _webhookUrlController = TextEditingController();
  String _httpMethod = 'POST';

  // Email config
  final _emailToController = TextEditingController();
  final _emailSubjectController = TextEditingController();
  final _emailBodyController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadTriggers();
    if (widget.action != null) {
      _nameController.text = widget.action!.name;
      _actionType = widget.action!.actionType;
      _isActive = widget.action!.isActive;
      _failurePolicy = widget.action!.failurePolicy;
      _selectedTriggerId = widget.action!.triggerId;
      _loadActionConfig();
    }
  }

  Future<void> _loadTriggers() async {
    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() => _isLoadingTriggers = true);

    try {
      final response = await _botService.getTriggers(workspaceId, widget.botId);
      if (response.success && response.data != null) {
        setState(() {
          _triggers = response.data!;
          _isLoadingTriggers = false;
        });
      } else {
        setState(() => _isLoadingTriggers = false);
      }
    } catch (e) {
      setState(() => _isLoadingTriggers = false);
    }
  }

  void _loadActionConfig() {
    final config = widget.action!.actionConfig;
    switch (_actionType) {
      case ActionType.sendMessage:
        _messageController.text = config['content'] ?? config['message'] ?? '';
        _replyToTrigger = config['replyToTrigger'] ?? true;
        _mentionUser = config['mentionUser'] ?? false;
        break;
      case ActionType.sendAiMessage:
      case ActionType.aiAutopilot:
        _systemPromptController.text = config['systemPrompt'] ?? '';
        _maxTokens = config['maxTokens'] ?? 500;
        _includeContext = config['includeContext'] ?? true;
        break;
      case ActionType.createTask:
        _taskTitleController.text = config['titleTemplate'] ?? config['title'] ?? '';
        _taskDescriptionController.text = config['descriptionTemplate'] ?? config['description'] ?? '';
        _taskPriority = config['priority'] ?? 'medium';
        _assignToUser = config['assignToTriggeringUser'] ?? config['assignToUser'] ?? false;
        _dueDaysOffset = config['dueDateOffsetDays'] ?? config['dueDaysOffset'] ?? 1;
        break;
      case ActionType.createEvent:
        _taskTitleController.text = config['titleTemplate'] ?? config['title'] ?? '';
        _taskDescriptionController.text = config['descriptionTemplate'] ?? config['description'] ?? '';
        break;
      case ActionType.callWebhook:
        _webhookUrlController.text = config['url'] ?? '';
        _httpMethod = config['method'] ?? 'POST';
        break;
      case ActionType.sendEmail:
        _emailToController.text = config['toTemplate'] ?? config['to'] ?? '';
        _emailSubjectController.text = config['subjectTemplate'] ?? config['subject'] ?? '';
        _emailBodyController.text = config['bodyTemplate'] ?? config['body'] ?? '';
        break;
      default:
        break;
    }
  }

  Map<String, dynamic> _buildActionConfig() {
    switch (_actionType) {
      case ActionType.sendMessage:
        return {
          'content': _messageController.text,
          'replyToTrigger': _replyToTrigger,
          'mentionUser': _mentionUser,
        };
      case ActionType.sendAiMessage:
      case ActionType.aiAutopilot:
        return {
          'systemPrompt': _systemPromptController.text,
          'maxTokens': _maxTokens,
          'includeContext': _includeContext,
        };
      case ActionType.createTask:
        return {
          'titleTemplate': _taskTitleController.text,
          'descriptionTemplate': _taskDescriptionController.text,
          'priority': _taskPriority,
          'assignToTriggeringUser': _assignToUser,
          'dueDateOffsetDays': _dueDaysOffset,
        };
      case ActionType.createEvent:
        return {
          'titleTemplate': _taskTitleController.text,
          'descriptionTemplate': _taskDescriptionController.text,
          'durationMinutes': 30,
          'startTimeOffsetHours': 1,
          'addTriggeringUserAsAttendee': true,
        };
      case ActionType.callWebhook:
        return {
          'url': _webhookUrlController.text,
          'method': _httpMethod,
          'timeout': 10000,
        };
      case ActionType.sendEmail:
        return {
          'toTemplate': _emailToController.text,
          'subjectTemplate': _emailSubjectController.text,
          'bodyTemplate': _emailBodyController.text,
        };
    }
  }

  Future<void> _save() async {
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('bots.action_name_required'.tr())),
      );
      return;
    }

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() => _isSaving = true);

    try {
      final ApiResponse response;
      if (widget.action == null) {
        // Create new action
        response = await _botService.createAction(
          workspaceId,
          widget.botId,
          CreateActionDto(
            name: _nameController.text.trim(),
            actionType: _actionType,
            actionConfig: _buildActionConfig(),
            triggerId: _selectedTriggerId,
            isActive: _isActive,
            failurePolicy: _failurePolicy,
          ),
        );
      } else {
        // Update existing action
        response = await _botService.updateAction(
          workspaceId,
          widget.botId,
          widget.action!.id,
          UpdateActionDto(
            name: _nameController.text.trim(),
            actionType: _actionType,
            actionConfig: _buildActionConfig(),
            triggerId: _selectedTriggerId,
            isActive: _isActive,
            failurePolicy: _failurePolicy,
          ),
        );
      }

      if (response.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('bots.action_saved'.tr())),
          );
        }
        widget.onSaved();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Failed to save action')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _messageController.dispose();
    _systemPromptController.dispose();
    _taskTitleController.dispose();
    _taskDescriptionController.dispose();
    _webhookUrlController.dispose();
    _emailToController.dispose();
    _emailSubjectController.dispose();
    _emailBodyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Colors.grey.shade300),
                  ),
                ),
                child: Row(
                  children: [
                    Text(
                      widget.action == null
                          ? 'bots.add_action'.tr()
                          : 'bots.edit_action'.tr(),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    if (_isSaving)
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    else
                      TextButton(
                        onPressed: _save,
                        child: Text('common.save'.tr()),
                      ),
                  ],
                ),
              ),
              // Content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Name field
                    TextField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: 'bots.action_name'.tr(),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Action type dropdown
                    DropdownButtonFormField<ActionType>(
                      value: _actionType,
                      decoration: InputDecoration(
                        labelText: 'bots.action_type'.tr(),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      items: ActionType.values.map((type) {
                        return DropdownMenuItem(
                          value: type,
                          child: Text(type.displayName),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) setState(() => _actionType = value);
                      },
                    ),
                    const SizedBox(height: 16),

                    // Link to trigger dropdown
                    _isLoadingTriggers
                        ? const Center(
                            child: Padding(
                              padding: EdgeInsets.all(8.0),
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            ),
                          )
                        : DropdownButtonFormField<String?>(
                            value: _selectedTriggerId,
                            decoration: InputDecoration(
                              labelText: 'bots.link_to_trigger'.tr(),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            items: [
                              DropdownMenuItem<String?>(
                                value: null,
                                child: Text('bots.all_triggers'.tr()),
                              ),
                              ..._triggers.map((trigger) {
                                return DropdownMenuItem<String?>(
                                  value: trigger.id,
                                  child: Text(trigger.name),
                                );
                              }),
                            ],
                            onChanged: (value) {
                              setState(() => _selectedTriggerId = value);
                            },
                          ),
                    const SizedBox(height: 16),

                    // Type-specific config
                    _buildTypeConfig(),

                    const SizedBox(height: 16),

                    // Active switch
                    SwitchListTile(
                      title: Text('bots.active'.tr()),
                      value: _isActive,
                      onChanged: (value) => setState(() => _isActive = value),
                    ),

                    // Failure policy
                    const SizedBox(height: 8),
                    DropdownButtonFormField<FailurePolicy>(
                      value: _failurePolicy,
                      decoration: InputDecoration(
                        labelText: 'bots.failure_policy'.tr(),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      items: FailurePolicy.values.map((policy) {
                        return DropdownMenuItem(
                          value: policy,
                          child: Text(policy.displayName),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) setState(() => _failurePolicy = value);
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTypeConfig() {
    switch (_actionType) {
      case ActionType.sendMessage:
        return Column(
          children: [
            TextField(
              controller: _messageController,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: 'bots.message'.tr(),
                hintText: 'bots.message_variables_hint'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            SwitchListTile(
              title: Text('bots.reply_to_trigger'.tr()),
              value: _replyToTrigger,
              onChanged: (value) => setState(() => _replyToTrigger = value),
            ),
            SwitchListTile(
              title: Text('bots.mention_user'.tr()),
              value: _mentionUser,
              onChanged: (value) => setState(() => _mentionUser = value),
            ),
          ],
        );

      case ActionType.sendAiMessage:
      case ActionType.aiAutopilot:
        return Column(
          children: [
            TextField(
              controller: _systemPromptController,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: 'bots.system_prompt'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('${'bots.max_tokens'.tr()}: $_maxTokens'),
            Slider(
              value: _maxTokens.toDouble(),
              min: 50,
              max: 2000,
              divisions: 39,
              onChanged: (value) => setState(() => _maxTokens = value.toInt()),
            ),
            SwitchListTile(
              title: Text('bots.include_context'.tr()),
              value: _includeContext,
              onChanged: (value) => setState(() => _includeContext = value),
            ),
          ],
        );

      case ActionType.createTask:
        return Column(
          children: [
            TextField(
              controller: _taskTitleController,
              decoration: InputDecoration(
                labelText: 'bots.task_title'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _taskDescriptionController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'bots.task_description'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _taskPriority,
              decoration: InputDecoration(
                labelText: 'bots.priority'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              items: ['low', 'medium', 'high', 'urgent'].map((p) {
                return DropdownMenuItem(value: p, child: Text(p.toUpperCase()));
              }).toList(),
              onChanged: (value) {
                if (value != null) setState(() => _taskPriority = value);
              },
            ),
            SwitchListTile(
              title: Text('bots.assign_to_user'.tr()),
              value: _assignToUser,
              onChanged: (value) => setState(() => _assignToUser = value),
            ),
          ],
        );

      case ActionType.callWebhook:
        return Column(
          children: [
            TextField(
              controller: _webhookUrlController,
              decoration: InputDecoration(
                labelText: 'bots.webhook_url'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _httpMethod,
              decoration: InputDecoration(
                labelText: 'bots.http_method'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              items: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) {
                return DropdownMenuItem(value: m, child: Text(m));
              }).toList(),
              onChanged: (value) {
                if (value != null) setState(() => _httpMethod = value);
              },
            ),
          ],
        );

      case ActionType.sendEmail:
        return Column(
          children: [
            TextField(
              controller: _emailToController,
              decoration: InputDecoration(
                labelText: 'bots.email_to'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _emailSubjectController,
              decoration: InputDecoration(
                labelText: 'bots.email_subject'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _emailBodyController,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: 'bots.email_body'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        );

      default:
        return const SizedBox.shrink();
    }
  }
}

/// Sheet for selecting where to install a bot
class _InstallBotSheet extends StatefulWidget {
  final List<Channel> channels;
  final List<Conversation> conversations;
  final List<BotInstallation> existingInstallations;
  final Function(String? channelId, String? conversationId) onInstall;

  const _InstallBotSheet({
    required this.channels,
    required this.conversations,
    required this.existingInstallations,
    required this.onInstall,
  });

  @override
  State<_InstallBotSheet> createState() => _InstallBotSheetState();
}

class _InstallBotSheetState extends State<_InstallBotSheet>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  bool _isAlreadyInstalled(String? channelId, String? conversationId) {
    return widget.existingInstallations.any((i) =>
        (channelId != null && i.channelId == channelId && i.isActive) ||
        (conversationId != null && i.conversationId == conversationId && i.isActive));
  }

  List<Channel> get _filteredChannels {
    if (_searchQuery.isEmpty) return widget.channels;
    return widget.channels
        .where((c) => c.name.toLowerCase().contains(_searchQuery.toLowerCase()))
        .toList();
  }

  List<Conversation> get _filteredConversations {
    if (_searchQuery.isEmpty) return widget.conversations;
    return widget.conversations
        .where((c) =>
            (c.name?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade400,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Title
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.install_desktop, color: Colors.teal),
                  const SizedBox(width: 12),
                  Text(
                    'bots.install_bot'.tr(),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            // Search bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'common.search'.tr(),
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                ),
                onChanged: (value) => setState(() => _searchQuery = value),
              ),
            ),
            const SizedBox(height: 16),
            // Tabs
            TabBar(
              controller: _tabController,
              labelColor: Colors.teal,
              unselectedLabelColor:
                  isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              indicatorColor: Colors.teal,
              tabs: [
                Tab(text: 'bots.channels'.tr()),
                Tab(text: 'bots.conversations'.tr()),
              ],
            ),
            // Tab content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildChannelsList(isDark, scrollController),
                  _buildConversationsList(isDark, scrollController),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildChannelsList(bool isDark, ScrollController scrollController) {
    final channels = _filteredChannels;

    if (channels.isEmpty) {
      return Center(
        child: Text(
          'bots.no_channels_found'.tr(),
          style: TextStyle(
            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
        ),
      );
    }

    return ListView.builder(
      controller: scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: channels.length,
      itemBuilder: (context, index) {
        final channel = channels[index];
        final isInstalled = _isAlreadyInstalled(channel.id, null);

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.teal.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                channel.isPrivate ? Icons.lock : Icons.tag,
                color: Colors.teal,
                size: 20,
              ),
            ),
            title: Text('#${channel.name}'),
            subtitle: Text(
              isInstalled
                  ? 'bots.already_installed'.tr()
                  : '${channel.memberCount} ${'bots.members'.tr()}',
              style: TextStyle(
                color: isInstalled ? Colors.orange : Colors.grey,
                fontSize: 12,
              ),
            ),
            trailing: isInstalled
                ? const Icon(Icons.check_circle, color: Colors.green)
                : ElevatedButton(
                    onPressed: () => widget.onInstall(channel.id, null),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.teal,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    child: Text('bots.install'.tr()),
                  ),
          ),
        );
      },
    );
  }

  Widget _buildConversationsList(
      bool isDark, ScrollController scrollController) {
    final conversations = _filteredConversations;

    if (conversations.isEmpty) {
      return Center(
        child: Text(
          'bots.no_conversations_found'.tr(),
          style: TextStyle(
            color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
          ),
        ),
      );
    }

    return ListView.builder(
      controller: scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: conversations.length,
      itemBuilder: (context, index) {
        final conversation = conversations[index];
        final isInstalled = _isAlreadyInstalled(null, conversation.id);

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                conversation.type == 'group' ? Icons.group : Icons.person,
                color: Colors.blue,
                size: 20,
              ),
            ),
            title: Text(conversation.name ?? 'bots.direct_message'.tr()),
            subtitle: Text(
              isInstalled
                  ? 'bots.already_installed'.tr()
                  : conversation.type == 'group'
                      ? '${conversation.participants.length} ${'bots.participants'.tr()}'
                      : 'bots.direct_message'.tr(),
              style: TextStyle(
                color: isInstalled ? Colors.orange : Colors.grey,
                fontSize: 12,
              ),
            ),
            trailing: isInstalled
                ? const Icon(Icons.check_circle, color: Colors.green)
                : ElevatedButton(
                    onPressed: () => widget.onInstall(null, conversation.id),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.teal,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    child: Text('bots.install'.tr()),
                  ),
          ),
        );
      },
    );
  }
}

/// Dialog for testing a bot with a message
class _TestBotDialog extends StatefulWidget {
  final BotApiService botService;
  final String botId;
  final String botName;

  const _TestBotDialog({
    required this.botService,
    required this.botId,
    required this.botName,
  });

  @override
  State<_TestBotDialog> createState() => _TestBotDialogState();
}

class _TestBotDialogState extends State<_TestBotDialog> {
  final _messageController = TextEditingController();
  bool _isTesting = false;
  TestBotResponse? _testResult;
  String? _error;

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _testBot() async {
    if (_messageController.text.trim().isEmpty) return;

    final workspaceId = WorkspaceService.instance.currentWorkspace?.id;
    if (workspaceId == null) return;

    setState(() {
      _isTesting = true;
      _error = null;
      _testResult = null;
    });

    try {
      final response = await widget.botService.testBot(
        workspaceId,
        widget.botId,
        TestBotDto(message: _messageController.text.trim()),
      );

      if (mounted) {
        setState(() {
          if (response.success && response.data != null) {
            _testResult = response.data;
          } else {
            _error = response.message ?? 'Failed to test bot';
          }
          _isTesting = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isTesting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.play_circle_outline, color: Colors.orange),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'bots.test_bot'.tr(),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        widget.botName,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
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
            const SizedBox(height: 20),

            // Test message input
            Text(
              'bots.test_message'.tr(),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _messageController,
              decoration: InputDecoration(
                hintText: 'bots.test_message_hint'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                suffixIcon: IconButton(
                  icon: _isTesting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send, color: Colors.teal),
                  onPressed: _isTesting ? null : _testBot,
                ),
              ),
              onSubmitted: (_) => _testBot(),
              enabled: !_isTesting,
            ),
            const SizedBox(height: 20),

            // Results section
            if (_error != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Colors.red, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),

            if (_testResult != null) ...[
              Text(
                'bots.test_results'.tr(),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: isDark ? Colors.grey.shade300 : Colors.grey.shade700,
                ),
              ),
              const SizedBox(height: 8),
              Flexible(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Trigger match status
                        Row(
                          children: [
                            Icon(
                              _testResult!.triggered ? Icons.check_circle : Icons.cancel,
                              color: _testResult!.triggered ? Colors.green : Colors.orange,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _testResult!.triggered
                                  ? 'bots.trigger_matched'.tr()
                                  : 'bots.no_trigger_matched'.tr(),
                              style: TextStyle(
                                fontWeight: FontWeight.w500,
                                color: _testResult!.triggered ? Colors.green : Colors.orange,
                              ),
                            ),
                          ],
                        ),

                        // Matched trigger name
                        if (_testResult!.matchedTriggerName != null) ...[
                          const SizedBox(height: 12),
                          Text(
                            'bots.matched_trigger'.tr(),
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.teal.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              _testResult!.matchedTriggerName!,
                              style: const TextStyle(
                                color: Colors.teal,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],

                        // Executed actions
                        if (_testResult!.executedActions.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Text(
                            'bots.executed_actions'.tr(),
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          ...(_testResult!.executedActions.map((action) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.blue.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  action['name']?.toString() ?? action['actionType']?.toString() ?? 'Unknown',
                                  style: const TextStyle(
                                    color: Colors.blue,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            );
                          })),
                        ],

                        // Response if any
                        if (_testResult!.response != null) ...[
                          const SizedBox(height: 12),
                          Text(
                            'bots.bot_response'.tr(),
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.grey.shade800 : Colors.white,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
                              ),
                            ),
                            child: Text(
                              _testResult!.response!,
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? Colors.white : Colors.black87,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ],

            // Close button at bottom
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('common.close'.tr()),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
