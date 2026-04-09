import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// Support & Contact Screen
/// Displays contact information, response times, and FAQ section
class SupportContactScreen extends StatefulWidget {
  const SupportContactScreen({super.key});

  @override
  State<SupportContactScreen> createState() => _SupportContactScreenState();
}

class _SupportContactScreenState extends State<SupportContactScreen> {
  int? _expandedFAQIndex = 0;

  // FAQ data
  final List<FAQItem> _faqs = [
    FAQItem(
      question: 'How do I get started with Deskive?',
      answer:
          'After creating your account, you can create or join a workspace. From there, you can invite team members, set up channels for communication, and start collaborating on projects. Check out our onboarding guide in the app for a quick walkthrough.',
    ),
    FAQItem(
      question: 'How can I invite team members to my workspace?',
      answer:
          'Go to Settings > Team, then tap "Invite Members". You can send invitations via email. Invited members will receive a link to join your workspace directly.',
    ),
    FAQItem(
      question: 'What is the file storage limit?',
      answer:
          'Free plan includes 5GB of storage per workspace. Pro plan offers 100GB, and Enterprise plans include unlimited storage. You can check your current usage in Settings > Billing.',
    ),
    FAQItem(
      question: 'How do I start a video call?',
      answer:
          'You can start a video call from any chat by tapping the video icon in the top right corner. You can also schedule meetings through the Calendar feature and invite participants.',
    ),
    FAQItem(
      question: 'Is my data secure?',
      answer:
          'Yes! We use industry-standard encryption for all data in transit and at rest. We are SOC 2 Type II certified and GDPR compliant. Your data is stored in secure, redundant data centers.',
    ),
    FAQItem(
      question: 'How do I upgrade my subscription?',
      answer:
          'Go to Settings > Billing to view available plans and upgrade. You can switch plans at any time, and billing will be prorated. We accept all major credit cards and offer annual billing discounts.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Support & Contact'),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Section
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    theme.colorScheme.primary.withValues(alpha:0.1),
                    theme.colorScheme.secondary.withValues(alpha:0.05),
                  ],
                ),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          theme.colorScheme.primary,
                          theme.colorScheme.primary.withValues(alpha:0.8),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: theme.colorScheme.primary.withValues(alpha:0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.support_agent,
                      size: 40,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'How can we help?',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'We\'re here to help and answer any questions you might have.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.textTheme.bodySmall?.color,
                    ),
                  ),
                ],
              ),
            ),

            // Contact Card
            Padding(
              padding: const EdgeInsets.all(16),
              child: Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: theme.dividerColor),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Contact Us',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildContactItem(
                        context,
                        icon: Icons.email_outlined,
                        title: 'Email Support',
                        subtitle: 'support@deskive.com',
                        onTap: () => _launchEmail('support@deskive.com'),
                      ),
                      const Divider(height: 24),
                      Text(
                        'Our support team typically responds within 24-48 hours for general inquiries.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.textTheme.bodySmall?.color?.withValues(alpha:0.7),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Response Time Card
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Card(
                elevation: 0,
                color: theme.colorScheme.primary.withValues(alpha:0.05),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: theme.colorScheme.primary.withValues(alpha:0.2),
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.schedule,
                            color: theme.colorScheme.primary,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Response Times',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _buildResponseTimeRow(
                        context,
                        label: 'General Questions',
                        time: '24-48 hours',
                      ),
                      const SizedBox(height: 8),
                      _buildResponseTimeRow(
                        context,
                        label: 'Technical Issues',
                        time: '12-24 hours',
                      ),
                      const SizedBox(height: 8),
                      _buildResponseTimeRow(
                        context,
                        label: 'Critical Issues',
                        time: '4-8 hours',
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // FAQ Section
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Frequently Asked Questions',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Find answers to common questions about Deskive',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.textTheme.bodySmall?.color,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(color: theme.dividerColor),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Column(
                        children: _faqs.asMap().entries.map((entry) {
                          final index = entry.key;
                          final faq = entry.value;
                          return _buildFAQItem(
                            context,
                            faq: faq,
                            isExpanded: _expandedFAQIndex == index,
                            isLast: index == _faqs.length - 1,
                            onTap: () {
                              setState(() {
                                _expandedFAQIndex =
                                    _expandedFAQIndex == index ? null : index;
                              });
                            },
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildContactItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha:0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: theme.colorScheme.primary,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              size: 16,
              color: theme.textTheme.bodySmall?.color,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResponseTimeRow(
    BuildContext context, {
    required String label,
    required String time,
  }) {
    final theme = Theme.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.textTheme.bodySmall?.color,
          ),
        ),
        Text(
          time,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildFAQItem(
    BuildContext context, {
    required FAQItem faq,
    required bool isExpanded,
    required bool isLast,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    faq.question,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                AnimatedRotation(
                  turns: isExpanded ? 0.5 : 0,
                  duration: const Duration(milliseconds: 200),
                  child: Icon(
                    Icons.keyboard_arrow_down,
                    color: theme.textTheme.bodySmall?.color,
                  ),
                ),
              ],
            ),
          ),
        ),
        AnimatedCrossFade(
          firstChild: const SizedBox.shrink(),
          secondChild: Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Text(
              faq.answer,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.textTheme.bodySmall?.color,
                height: 1.5,
              ),
            ),
          ),
          crossFadeState:
              isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 200),
        ),
        if (!isLast) const Divider(height: 1),
      ],
    );
  }

  Future<void> _launchEmail(String email) async {
    final uri = Uri(scheme: 'mailto', path: email);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not open email app. Contact us at $email'),
          ),
        );
      }
    }
  }
}

/// FAQ Item model
class FAQItem {
  final String question;
  final String answer;

  FAQItem({required this.question, required this.answer});
}
