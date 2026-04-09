import 'package:flutter/material.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final lastUpdated = 'December 1, 2024';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Terms of Service'),
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
                    'Terms of Service',
                    style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'These terms govern your use of Deskive and the rights and responsibilities of both parties.',
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
            const Divider(),
            const SizedBox(height: 24),

            // 1. Acceptance of Terms
            _buildSection(
              context,
              '1. Acceptance of Terms',
              'By accessing or using Deskive ("Service"), operated by Deskive Inc. ("Company," "we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.\n\nThese Terms constitute a legally binding agreement between you and Deskive Inc. regarding your use of the Service. By creating an account or using our Service, you represent that you have read, understood, and agree to be bound by these Terms.\n\nIf you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms, and "you" refers to both you individually and the organization.',
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 2. Service Description
            _buildMainSection(context, '2. Service Description'),
            _buildSection(context, '', 'Deskive is a comprehensive workspace collaboration platform that provides:'),
            _buildBulletList([
              'Project management and task tracking tools',
              'Real-time messaging and video communication',
              'File storage and document collaboration',
              'Calendar integration and scheduling',
              'Analytics and reporting features',
              'Third-party integrations and API access',
              'AI-powered productivity features',
            ]),
            _buildSection(
              context,
              '',
              'We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.',
            ),
            _buildSection(
              context,
              '',
              'The Service is provided on an "as is" and "as available" basis. We make no warranties or representations about the Service\'s availability, reliability, or suitability for your specific needs.',
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 3. Account Registration
            _buildMainSection(context, '3. Account Registration'),
            _buildSubSection(
              context,
              '3.1 Account Creation',
              'To use certain features of our Service, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.',
              null,
            ),
            _buildSubSection(
              context,
              '3.2 Account Security',
              'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:',
              [
                'Use strong passwords and enable two-factor authentication when available',
                'Notify us immediately of any unauthorized use of your account',
                'Not share your account credentials with others',
                'Take reasonable steps to prevent unauthorized access to your account',
              ],
            ),
            _buildSubSection(
              context,
              '3.3 Account Eligibility',
              'You must be at least 13 years old to create an account. If you are under 18, you represent that you have your parent\'s or guardian\'s permission to use the Service and that they agree to these Terms on your behalf.',
              null,
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 4. Acceptable Use Policy
            _buildMainSection(context, '4. Acceptable Use Policy'),
            _buildSection(context, '', 'You agree to use the Service in compliance with all applicable laws and regulations. You will not use the Service to:'),
            _buildSubSection(
              context,
              '4.1 Prohibited Activities',
              null,
              [
                'Violate any applicable laws, regulations, or third-party rights',
                'Transmit harmful, offensive, or illegal content',
                'Impersonate others or provide false information',
                'Interfere with or disrupt the Service or its servers',
                'Attempt to gain unauthorized access to other accounts or systems',
                'Use automated systems to access the Service without permission',
                'Reverse engineer, decompile, or disassemble the Service',
                'Remove or modify any proprietary notices or labels',
              ],
            ),
            _buildSubSection(
              context,
              '4.2 Content Standards',
              'All content you upload or share must be:',
              [
                'Legally owned by you or used with proper permission',
                'Free from viruses, malware, or other harmful code',
                'Appropriate for a professional business environment',
                'Compliant with applicable privacy and data protection laws',
              ],
            ),
            _buildSubSection(
              context,
              '4.3 Enforcement',
              'We reserve the right to investigate and take appropriate action against users who violate these terms, including suspending or terminating accounts, removing content, and cooperating with law enforcement authorities.',
              null,
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 5. Subscription and Billing
            _buildMainSection(context, '5. Subscription and Billing'),
            _buildSubSection(
              context,
              '5.1 Subscription Plans',
              'We offer various subscription plans with different features and usage limits. Current pricing and plan details are available on our website. Prices are subject to change with notice.',
              null,
            ),
            _buildSubSection(
              context,
              '5.2 Payment Terms',
              null,
              [
                'Subscriptions are billed in advance on a monthly or annual basis',
                'Payment is due immediately upon subscription or renewal',
                'All fees are non-refundable except as required by law',
                'You authorize us to charge your payment method for all fees',
                'You\'re responsible for keeping payment information current',
              ],
            ),
            _buildSubSection(
              context,
              '5.3 Free Trials and Plans',
              'We may offer free trials or plans with limited features. Free accounts may be subject to usage restrictions, advertisements, or other limitations. We reserve the right to modify or discontinue free offerings at any time.',
              null,
            ),
            _buildSubSection(
              context,
              '5.4 Refunds and Cancellation',
              'You may cancel your subscription at any time through your account settings. Cancellation will take effect at the end of your current billing period. Refunds are provided only as required by applicable law or at our sole discretion.',
              null,
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 6. Intellectual Property
            _buildMainSection(context, '6. Intellectual Property'),
            _buildSubSection(
              context,
              '6.1 Our Rights',
              'The Service, including all software, text, images, trademarks, service marks, copyrights, patents, and other intellectual property, is owned by Deskive Inc. or our licensors. These Terms do not grant you any rights to our intellectual property except as explicitly stated.',
              null,
            ),
            _buildSubSection(
              context,
              '6.2 Limited License',
              'We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service solely for your internal business purposes in accordance with these Terms.',
              null,
            ),
            _buildSubSection(
              context,
              '6.3 Feedback',
              'Any feedback, suggestions, or ideas you provide about the Service become our property, and we may use them without restriction or compensation to you.',
              null,
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 7. User Content and Data
            _buildMainSection(context, '7. User Content and Data'),
            _buildSubSection(
              context,
              '7.1 Your Content',
              'You retain ownership of all content you upload, create, or share through the Service ("Your Content"). By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to use, copy, modify, and distribute Your Content solely to provide and improve the Service.',
              null,
            ),
            _buildSubSection(
              context,
              '7.2 Data Responsibility',
              'You are responsible for:',
              [
                'The accuracy and legality of Your Content',
                'Backing up your important data',
                'Complying with data protection laws regarding Your Content',
                'Obtaining necessary permissions for content you share',
              ],
            ),
            _buildSubSection(
              context,
              '7.3 Data Portability',
              'You can export Your Content from the Service at any time through available export features. We will provide reasonable assistance with data migration during the transition period after account termination.',
              null,
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 8. Privacy and Data Protection
            _buildSection(
              context,
              '8. Privacy and Data Protection',
              'Your privacy is important to us. Our collection, use, and protection of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.\n\nBy using the Service, you consent to the collection, use, and sharing of your information as described in our Privacy Policy. We implement appropriate security measures to protect your data, but we cannot guarantee absolute security.\n\nFor information about cookies and tracking technologies, please see our Cookie Policy.',
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 9. Service Availability
            _buildMainSection(context, '9. Service Availability'),
            _buildSubSection(
              context,
              '9.1 Uptime and Maintenance',
              'While we strive to maintain high availability, we do not guarantee that the Service will be available 100% of the time. The Service may be temporarily unavailable due to maintenance, updates, or technical issues.',
              null,
            ),
            _buildSubSection(
              context,
              '9.2 Service Level Agreement',
              'For paid plans, we target 99.9% uptime (excluding scheduled maintenance). Service level commitments and remedies for downtime are detailed in our Service Level Agreement, available upon request.',
              null,
            ),
            _buildSubSection(
              context,
              '9.3 Third-Party Dependencies',
              'Our Service may depend on third-party services and infrastructure. We are not responsible for the availability or performance of these third-party services, though we will use reasonable efforts to minimize disruptions.',
              null,
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 10. Limitation of Liability
            _buildMainSection(context, '10. Limitation of Liability'),
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.yellow.shade100,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.yellow.shade700, width: 1),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Important Legal Notice',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.yellow.shade900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'This section limits our liability to you. Please read carefully.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.yellow.shade900,
                    ),
                  ),
                ],
              ),
            ),
            _buildSection(
              context,
              '',
              'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL DESKIVE INC., ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:',
            ),
            _buildBulletList([
              'Loss of profits, data, use, or goodwill',
              'Business interruption or lost opportunities',
              'Cost of substitute products or services',
              'Any other intangible losses',
            ]),
            _buildSection(
              context,
              '',
              'OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATING TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU HAVE PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR \$100, WHICHEVER IS GREATER.',
            ),
            _buildSection(
              context,
              '',
              'Some jurisdictions do not allow the exclusion or limitation of liability for consequential or incidental damages, so the above limitations may not apply to you.',
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 11. Indemnification
            _buildSection(
              context,
              '11. Indemnification',
              'You agree to defend, indemnify, and hold harmless Deskive Inc., its officers, directors, employees, agents, licensors, and suppliers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys\' fees) arising out of or relating to:',
            ),
            _buildBulletList([
              'Your use or misuse of the Service',
              'Your violation of these Terms',
              'Your violation of any rights of another party',
              'Your Content or any content you share through the Service',
            ]),
            _buildSection(
              context,
              '',
              'This indemnification obligation will survive termination of these Terms and your use of the Service.',
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 12. Termination
            _buildMainSection(context, '12. Termination'),
            _buildSubSection(
              context,
              '12.1 Termination by You',
              'You may terminate your account at any time through your account settings or by contacting us. Termination will be effective at the end of your current billing period for paid accounts.',
              null,
            ),
            _buildSubSection(
              context,
              '12.2 Termination by Us',
              'We may suspend or terminate your account immediately if you:',
              [
                'Violate these Terms or our Acceptable Use Policy',
                'Fail to pay required fees',
                'Engage in activities that harm the Service or other users',
                'Provide false or misleading information',
              ],
            ),
            _buildSubSection(
              context,
              '12.3 Effect of Termination',
              'Upon termination, your right to use the Service will cease immediately. We will provide you with a reasonable opportunity to export Your Content, after which it may be permanently deleted. Sections that by their nature should survive termination will remain in effect.',
              null,
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 13. Modifications to Terms
            _buildSection(
              context,
              '13. Modifications to Terms',
              'We reserve the right to modify these Terms at any time. When we make changes, we will:',
            ),
            _buildBulletList([
              'Update the "Last updated" date at the top of these Terms',
              'Notify you through email or prominent notices in the Service',
              'Provide at least 30 days\' notice for material changes',
            ]),
            _buildSection(
              context,
              '',
              'Your continued use of the Service after changes become effective constitutes acceptance of the modified Terms. If you do not agree to the changes, you must stop using the Service and terminate your account.',
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 14. Governing Law
            _buildMainSection(context, '14. Governing Law'),
            _buildSection(
              context,
              '',
              'These Terms shall be interpreted and governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms will be brought exclusively in the federal or state courts located in Delaware.',
            ),
            _buildSection(
              context,
              '',
              'For users outside the United States, local consumer protection laws may provide additional rights that cannot be waived by these Terms.',
            ),
            _buildSubSection(
              context,
              'Dispute Resolution',
              'Before filing any legal action, you agree to first contact us to attempt to resolve any dispute informally. We\'re committed to working with you to resolve any concerns about the Service.',
              null,
            ),

            const Divider(),
            const SizedBox(height: 16),

            // 15. Contact Information
            _buildMainSection(context, '15. Contact Information'),
            _buildSection(
              context,
              '',
              'If you have questions about these Terms or need to contact us regarding legal matters, please reach out:',
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
                    'Questions about our Terms?',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Our legal team is here to help clarify any questions you may have about these terms of service.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      ElevatedButton(
                        onPressed: () {
                          // Open email client - launch mailto:support@deskive.com
                        },
                        child: const Text('Contact Support'),
                      ),
                      OutlinedButton(
                        onPressed: () {
                          Navigator.pop(context);
                        },
                        child: const Text('Read Privacy Policy'),
                      ),
                    ],
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
}
