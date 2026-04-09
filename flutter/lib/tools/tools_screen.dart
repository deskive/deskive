import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../theme/app_theme.dart';
import 'approvals/approvals_screen.dart';
import 'whiteboard/whiteboard_list_screen.dart';
import 'templates/templates_screen.dart';
import 'document_builder/document_builder_screen.dart';
import 'e_signature/e_signature_screen.dart';
import 'budget/screens/budget_list_screen.dart';

class ToolsScreen extends StatelessWidget {
  const ToolsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('tools.title'.tr()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Tools Grid
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.3,
              children: [
                _buildToolCard(
                  context: context,
                  icon: Icons.dashboard_customize_outlined,
                  title: 'tools.templates'.tr(),
                  subtitle: 'tools.templates_subtitle'.tr(),
                  color: Colors.teal,
                  isDark: isDark,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const TemplatesScreen(),
                      ),
                    );
                  },
                ),
                _buildToolCard(
                  context: context,
                  icon: Icons.description_outlined,
                  title: 'tools.document_builder'.tr(),
                  subtitle: 'tools.document_builder_subtitle'.tr(),
                  color: Colors.orange,
                  isDark: isDark,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const DocumentBuilderScreen(),
                      ),
                    );
                  },
                ),
                _buildToolCard(
                  context: context,
                  icon: Icons.approval_outlined,
                  title: 'tools.approvals'.tr(),
                  subtitle: 'tools.approvals_subtitle'.tr(),
                  color: Colors.blue,
                  isDark: isDark,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const ApprovalsScreen(),
                      ),
                    );
                  },
                ),
                _buildToolCard(
                  context: context,
                  icon: Icons.draw_outlined,
                  title: 'tools.whiteboard'.tr(),
                  subtitle: 'tools.whiteboard_subtitle'.tr(),
                  color: Colors.purple,
                  isDark: isDark,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const WhiteboardListScreen(),
                      ),
                    );
                  },
                ),
                _buildToolCard(
                  context: context,
                  icon: Icons.edit_document,
                  title: 'E-Signature',
                  subtitle: 'Create and manage signatures',
                  color: Colors.indigo,
                  isDark: isDark,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const ESignatureScreen(),
                      ),
                    );
                  },
                ),
                _buildToolCard(
                  context: context,
                  icon: Icons.account_balance_wallet_outlined,
                  title: 'tools.budget'.tr(),
                  subtitle: 'tools.budget_subtitle'.tr(),
                  color: Colors.green,
                  isDark: isDark,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const BudgetListScreen(),
                      ),
                    );
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildToolCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required bool isDark,
    required VoidCallback onTap,
    bool isDisabled = false,
  }) {
    return InkWell(
      onTap: isDisabled ? null : onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: context.borderColor,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: (isDisabled ? Colors.grey : color).withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: isDisabled ? Colors.grey : color,
                size: 22,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isDisabled
                    ? (isDark ? Colors.white38 : Colors.grey)
                    : (isDark ? Colors.white : Colors.black),
              ),
            ),
            const SizedBox(height: 2),
            Flexible(
              child: Text(
                subtitle,
                style: TextStyle(
                  fontSize: 11,
                  color: isDark ? Colors.white38 : Colors.grey[600],
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
