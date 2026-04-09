import 'package:flutter/material.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final lastUpdated = 'December 1, 2024';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy Policy'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Center(
              child: Column(
                children: [
                  Text(
                    'Privacy Policy',
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Your privacy is important to us. This policy explains how Deskive collects, uses, and protects your personal information.',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Colors.grey[600],
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Last updated: $lastUpdated',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey,
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Privacy at a Glance
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Theme.of(context).primaryColor,
                    Theme.of(context).primaryColor.withValues(alpha: 0.7),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Theme.of(context).primaryColor.withValues(alpha: 0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Privacy at a Glance',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: _buildGlanceItem(
                          context,
                          icon: Icons.lock_outline,
                          title: 'Your Data is Secure',
                          description: 'Enterprise-grade encryption and security',
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildGlanceItem(
                          context,
                          icon: Icons.block,
                          title: 'We Don\'t Sell Data',
                          description: 'Your information is never sold to third parties',
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildGlanceItem(
                          context,
                          icon: Icons.verified_user,
                          title: 'You\'re in Control',
                          description: 'Access, modify, or delete your data anytime',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 24),

            // 1. Overview
            _buildSection(
              context,
              '1. Overview',
              'Deskive ("we," "our," or "us") operates a comprehensive workspace collaboration platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service, including our website, applications, and related services (collectively, the "Service").\n\nBy using our Service, you agree to the collection and use of information in accordance with this policy. We will not use or share your information with anyone except as described in this Privacy Policy.',
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 2. Information We Collect
            _buildMainSection(context, '2. Information We Collect'),
            _buildSubSection(
              context,
              '2.1 Information You Provide',
              null,
              [
                'Account Information: Name, email address, password, and profile information',
                'Workspace Content: Files, documents, messages, notes, and other content you create or share',
                'Payment Information: Billing details, payment methods (processed securely by third-party providers)',
                'Communication: Messages you send to us or through our Service',
              ],
            ),
            _buildSubSection(
              context,
              '2.2 Information We Collect Automatically',
              null,
              [
                'Usage Data: How you interact with our Service, features used, and time spent',
                'Device Information: IP address, browser type, operating system, device identifiers',
                'Log Data: Server logs, error reports, and performance metrics',
                'Cookies and Tracking: Information collected through cookies and similar technologies',
              ],
            ),
            _buildSubSection(
              context,
              '2.3 Information from Third Parties',
              'We may receive information from third-party services you connect to Deskive, such as calendar applications, file storage services, or authentication providers, in accordance with their privacy policies and your consent.',
              null,
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 3. How We Use Your Information
            _buildMainSection(context, '3. How We Use Your Information'),
            _buildSection(context, '', 'We use the information we collect to:'),
            _buildBulletList([
              'Provide, maintain, and improve our Service',
              'Process transactions and manage your account',
              'Communicate with you about our Service, updates, and support',
              'Personalize your experience and provide relevant features',
              'Ensure security and prevent fraud or abuse',
              'Analyze usage patterns to improve functionality',
              'Comply with legal obligations and enforce our terms',
              'Send you marketing communications (with your consent)',
            ]),
            _buildSubSection(
              context,
              'Legal Basis for Processing',
              'We process your personal information based on legitimate interests, contractual necessity, legal compliance, and your consent where applicable, in accordance with applicable data protection laws.',
              null,
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 4. Information Sharing and Disclosure
            _buildMainSection(context, '4. Information Sharing and Disclosure'),
            _buildSection(context, '', 'We may share your information in the following circumstances:'),
            _buildSubSection(
              context,
              '4.1 With Your Consent',
              'We share information when you explicitly consent, such as when you invite team members to your workspace or connect third-party services.',
              null,
            ),
            _buildSubSection(
              context,
              '4.2 Service Providers',
              'We work with trusted third-party service providers for hosting, payment processing, analytics, and customer support. These providers are contractually bound to protect your information.',
              null,
            ),
            _buildSubSection(
              context,
              '4.3 Legal Requirements',
              'We may disclose information to comply with legal obligations, court orders, or government requests, and to protect our rights, users, or the public from harm or illegal activities.',
              null,
            ),
            _buildSubSection(
              context,
              '4.4 Business Transfers',
              'In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction, with appropriate notice and protection measures.',
              null,
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 5. Data Security
            _buildMainSection(context, '5. Data Security'),
            _buildSection(context, '', 'We implement robust security measures to protect your information:'),
            _buildBulletList([
              'Encryption: Data is encrypted in transit and at rest using industry-standard protocols',
              'Access Controls: Strict authentication and authorization mechanisms',
              'Infrastructure Security: Secure hosting with regular security audits',
              'Employee Training: Regular security awareness training for our team',
              'Incident Response: Procedures for detecting and responding to security incidents',
            ]),
            _buildSection(
              context,
              '',
              'While we strive to protect your information, no method of transmission or storage is 100% secure. We encourage you to use strong passwords and enable two-factor authentication.',
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 6. Data Retention
            _buildMainSection(context, '6. Data Retention'),
            _buildSection(
              context,
              '',
              'We retain your information for as long as necessary to provide our services and comply with legal obligations:',
            ),
            _buildBulletList([
              'Account Data: Retained while your account is active and for 90 days after deletion',
              'Content Data: Retained according to your workspace settings and data retention policies',
              'Usage Data: Aggregated usage data may be retained for analytics purposes',
              'Legal Data: Information may be retained longer to comply with legal requirements',
            ]),

            const Divider(),
            const SizedBox(height: 16),

            // 7. Your Rights and Choices
            _buildMainSection(context, '7. Your Rights and Choices'),
            _buildSection(context, '', 'You have the following rights regarding your personal information:'),
            _buildSubSection(
              context,
              '7.1 Access and Portability',
              'You can access, download, and export your data through your account settings or by contacting us.',
              null,
            ),
            _buildSubSection(
              context,
              '7.2 Correction and Updates',
              'You can update your account information and profile details at any time through your account settings.',
              null,
            ),
            _buildSubSection(
              context,
              '7.3 Deletion',
              'You can delete your account and associated data. Some information may be retained for legal compliance or legitimate business purposes.',
              null,
            ),
            _buildSubSection(
              context,
              '7.4 Communication Preferences',
              'You can opt out of marketing communications while still receiving important service-related messages.',
              null,
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 8. Cookies and Similar Technologies
            _buildSection(
              context,
              '8. Cookies and Similar Technologies',
              'We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. For detailed information about our use of cookies, please see our Cookie Policy.',
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 9. International Data Transfers
            _buildSection(
              context,
              '9. International Data Transfers',
              'Your information may be processed and stored in countries other than your own. We ensure appropriate safeguards are in place for international transfers, including standard contractual clauses and adequacy decisions where applicable.',
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 10. Children's Privacy
            _buildSection(
              context,
              '10. Children\'s Privacy',
              'Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will delete it promptly.',
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 11. Changes to This Policy
            _buildSection(
              context,
              '11. Changes to This Policy',
              'We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. We will notify you of significant changes through email or prominent notices in our Service. Your continued use of our Service after changes become effective constitutes acceptance of the updated policy.',
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 12. Contact Information
            _buildMainSection(context, '12. Contact Information'),
            _buildSection(
              context,
              '',
              'If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:',
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Theme.of(context).primaryColor.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Email: support@deskive.com',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Address: Deskive Contributors K.K.\nNissho II 1F Room 1-B, 6-5-5 Nagatsuta,\nMidori-ku, Yokohama, Kanagawa, Japan',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Phone: +81 45-508-9779',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Call to Action
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Theme.of(context).primaryColor.withValues(alpha: 0.2),
                    Colors.teal.withValues(alpha: 0.2),
                  ],
                ),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Theme.of(context).primaryColor.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Questions about our Privacy Policy?',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'We\'re here to help. Contact our privacy team for any questions or concerns about how we handle your data.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      // Open email client
                    },
                    child: const Text('Contact Privacy Team'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildMainSection(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title.isNotEmpty) ...[
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
          ],
          Text(
            content,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  height: 1.6,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubSection(
    BuildContext context,
    String title,
    String? content,
    List<String>? bulletPoints,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16, left: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: Theme.of(context).primaryColor,
                ),
          ),
          const SizedBox(height: 8),
          if (content != null)
            Text(
              content,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    height: 1.6,
                  ),
            ),
          if (bulletPoints != null) _buildBulletList(bulletPoints),
        ],
      ),
    );
  }

  Widget _buildBulletList(List<String> items) {
    return Padding(
      padding: const EdgeInsets.only(left: 16, top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: items
            .map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('• ', style: TextStyle(fontSize: 16)),
                    Expanded(
                      child: Text(
                        item,
                        style: const TextStyle(height: 1.6),
                      ),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildGlanceItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(50),
          ),
          child: Icon(
            icon,
            color: Colors.white,
            size: 32,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.white,
            fontSize: 14,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6),
        Text(
          description,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.9),
            fontSize: 12,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
