/**
 * Privacy Policy Page
 * Comprehensive privacy policy for Deskive SaaS platform
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';

interface TableOfContentsItem {
  id: string;
  title: string;
  subsections?: { id: string; title: string }[];
}

const tableOfContents: TableOfContentsItem[] = [
  { id: 'overview', title: 'Overview' },
  { id: 'information-collection', title: 'Information We Collect' },
  { id: 'information-use', title: 'How We Use Your Information' },
  { id: 'information-sharing', title: 'Information Sharing and Disclosure' },
  { id: 'data-security', title: 'Data Security' },
  { id: 'data-retention', title: 'Data Retention' },
  { id: 'user-rights', title: 'Your Rights and Choices' },
  { id: 'cookies', title: 'Cookies and Similar Technologies' },
  { id: 'international-transfers', title: 'International Data Transfers' },
  { id: 'children-privacy', title: 'Children\'s Privacy' },
  { id: 'policy-changes', title: 'Changes to This Policy' },
  { id: 'contact', title: 'Contact Information' },
];

export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState<string>('overview');

  useEffect(() => {
    const observerOptions = {
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    tableOfContents.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const lastUpdated = 'December 1, 2024';

  return (
    <PublicLayout>
      <div className="min-h-screen py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <nav className="flex items-center space-x-2 text-sm text-white/60">
              <Link to="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-white">Privacy Policy</span>
            </nav>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Table of Contents - Sticky Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-1"
            >
              <Card className="glass-effect sticky top-8">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-white">
                    Table of Contents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tableOfContents.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                        activeSection === item.id
                          ? 'bg-cyan-500/20 text-cyan-300 border-l-2 border-cyan-400'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {item.title}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="lg:col-span-3"
            >
              <Card className="glass-effect">
                <CardHeader>
                  <div className="text-center mb-6">
                    <h1 className="text-4xl font-bold text-white mb-4">
                      Privacy Policy
                    </h1>
                    <p className="text-white/70 text-lg">
                      Your privacy is important to us. This policy explains how Deskive collects, uses, and protects your personal information.
                    </p>
                    <div className="mt-4 text-sm text-white/50">
                      Last updated: {lastUpdated}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="prose prose-invert max-w-none space-y-8">
                  {/* Overview */}
                  <section id="overview">
                    <h2 className="text-2xl font-semibold text-white mb-4">1. Overview</h2>
                    <p className="text-white/80 mb-4">
                      Deskive ("we," "our," or "us") operates a comprehensive workspace collaboration platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service, including our website, applications, and related services (collectively, the "Service").
                    </p>
                    <p className="text-white/80">
                      By using our Service, you agree to the collection and use of information in accordance with this policy. We will not use or share your information with anyone except as described in this Privacy Policy.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Information We Collect */}
                  <section id="information-collection">
                    <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">2.1 Information You Provide</h3>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li><strong>Account Information:</strong> Name, email address, password, and profile information</li>
                      <li><strong>Workspace Content:</strong> Files, documents, messages, notes, and other content you create or share</li>
                      <li><strong>Payment Information:</strong> Billing details, payment methods (processed securely by third-party providers)</li>
                      <li><strong>Communication:</strong> Messages you send to us or through our Service</li>
                    </ul>

                    <h3 className="text-xl font-medium text-cyan-300 mb-3">2.2 Information We Collect Automatically</h3>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li><strong>Usage Data:</strong> How you interact with our Service, features used, and time spent</li>
                      <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                      <li><strong>Log Data:</strong> Server logs, error reports, and performance metrics</li>
                      <li><strong>Cookies and Tracking:</strong> Information collected through cookies and similar technologies</li>
                    </ul>

                    <h3 className="text-xl font-medium text-cyan-300 mb-3">2.3 Information from Third Parties</h3>
                    <p className="text-white/80">
                      We may receive information from third-party services you connect to Deskive, such as calendar applications, file storage services, or authentication providers, in accordance with their privacy policies and your consent.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* How We Use Your Information */}
                  <section id="information-use">
                    <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
                    
                    <p className="text-white/80 mb-4">We use the information we collect to:</p>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Provide, maintain, and improve our Service</li>
                      <li>Process transactions and manage your account</li>
                      <li>Communicate with you about our Service, updates, and support</li>
                      <li>Personalize your experience and provide relevant features</li>
                      <li>Ensure security and prevent fraud or abuse</li>
                      <li>Analyze usage patterns to improve functionality</li>
                      <li>Comply with legal obligations and enforce our terms</li>
                      <li>Send you marketing communications (with your consent)</li>
                    </ul>

                    <h3 className="text-xl font-medium text-cyan-300 mb-3">Legal Basis for Processing</h3>
                    <p className="text-white/80">
                      We process your personal information based on legitimate interests, contractual necessity, legal compliance, and your consent where applicable, in accordance with applicable data protection laws.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Information Sharing */}
                  <section id="information-sharing">
                    <h2 className="text-2xl font-semibold text-white mb-4">4. Information Sharing and Disclosure</h2>
                    
                    <p className="text-white/80 mb-4">We may share your information in the following circumstances:</p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">4.1 With Your Consent</h3>
                    <p className="text-white/80 mb-4">
                      We share information when you explicitly consent, such as when you invite team members to your workspace or connect third-party services.
                    </p>

                    <h3 className="text-xl font-medium text-cyan-300 mb-3">4.2 Service Providers</h3>
                    <p className="text-white/80 mb-4">
                      We work with trusted third-party service providers for hosting, payment processing, analytics, and customer support. These providers are contractually bound to protect your information.
                    </p>

                    <h3 className="text-xl font-medium text-cyan-300 mb-3">4.3 Legal Requirements</h3>
                    <p className="text-white/80 mb-4">
                      We may disclose information to comply with legal obligations, court orders, or government requests, and to protect our rights, users, or the public from harm or illegal activities.
                    </p>

                    <h3 className="text-xl font-medium text-cyan-300 mb-3">4.4 Business Transfers</h3>
                    <p className="text-white/80">
                      In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction, with appropriate notice and protection measures.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Data Security */}
                  <section id="data-security">
                    <h2 className="text-2xl font-semibold text-white mb-4">5. Data Security</h2>
                    
                    <p className="text-white/80 mb-4">
                      We implement robust security measures to protect your information:
                    </p>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li><strong>Encryption:</strong> Data is encrypted in transit and at rest using industry-standard protocols</li>
                      <li><strong>Access Controls:</strong> Strict authentication and authorization mechanisms</li>
                      <li><strong>Infrastructure Security:</strong> Secure hosting with regular security audits</li>
                      <li><strong>Employee Training:</strong> Regular security awareness training for our team</li>
                      <li><strong>Incident Response:</strong> Procedures for detecting and responding to security incidents</li>
                    </ul>
                    <p className="text-white/80">
                      While we strive to protect your information, no method of transmission or storage is 100% secure. We encourage you to use strong passwords and enable two-factor authentication.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Data Retention */}
                  <section id="data-retention">
                    <h2 className="text-2xl font-semibold text-white mb-4">6. Data Retention</h2>
                    
                    <p className="text-white/80 mb-4">
                      We retain your information for as long as necessary to provide our services and comply with legal obligations:
                    </p>
                    <ul className="list-disc pl-6 text-white/80 space-y-2">
                      <li><strong>Account Data:</strong> Retained while your account is active and for 90 days after deletion</li>
                      <li><strong>Content Data:</strong> Retained according to your workspace settings and data retention policies</li>
                      <li><strong>Usage Data:</strong> Aggregated usage data may be retained for analytics purposes</li>
                      <li><strong>Legal Data:</strong> Information may be retained longer to comply with legal requirements</li>
                    </ul>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* User Rights */}
                  <section id="user-rights">
                    <h2 className="text-2xl font-semibold text-white mb-4">7. Your Rights and Choices</h2>
                    
                    <p className="text-white/80 mb-4">You have the following rights regarding your personal information:</p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">7.1 Access and Portability</h3>
                    <p className="text-white/80 mb-4">
                      You can access, download, and export your data through your account settings or by contacting us.
                    </p>

                    <h3 className="text-xl font-medium text-cyan-300 mb-3">7.2 Correction and Updates</h3>
                    <p className="text-white/80 mb-4">
                      You can update your account information and profile details at any time through your account settings.
                    </p>

                    <h3 className="text-xl font-medium text-cyan-300 mb-3">7.3 Deletion</h3>
                    <p className="text-white/80 mb-4">
                      You can delete your account and associated data. Some information may be retained for legal compliance or legitimate business purposes.
                    </p>

                    <h3 className="text-xl font-medium text-cyan-300 mb-3">7.4 Communication Preferences</h3>
                    <p className="text-white/80">
                      You can opt out of marketing communications while still receiving important service-related messages.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Cookies */}
                  <section id="cookies">
                    <h2 className="text-2xl font-semibold text-white mb-4">8. Cookies and Similar Technologies</h2>
                    
                    <p className="text-white/80 mb-4">
                      We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. 
                      For detailed information about our use of cookies, please see our{' '}
                      <Link to="/legal/cookie-policy" className="text-cyan-300 hover:text-cyan-200 underline">
                        Cookie Policy
                      </Link>.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* International Transfers */}
                  <section id="international-transfers">
                    <h2 className="text-2xl font-semibold text-white mb-4">9. International Data Transfers</h2>
                    
                    <p className="text-white/80">
                      Your information may be processed and stored in countries other than your own. We ensure appropriate safeguards are in place for international transfers, including standard contractual clauses and adequacy decisions where applicable.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Children's Privacy */}
                  <section id="children-privacy">
                    <h2 className="text-2xl font-semibold text-white mb-4">10. Children's Privacy</h2>
                    
                    <p className="text-white/80">
                      Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected such information, we will delete it promptly.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Policy Changes */}
                  <section id="policy-changes">
                    <h2 className="text-2xl font-semibold text-white mb-4">11. Changes to This Policy</h2>
                    
                    <p className="text-white/80">
                      We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. We will notify you of significant changes through email or prominent notices in our Service. Your continued use of our Service after changes become effective constitutes acceptance of the updated policy.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Contact Information */}
                  <section id="contact">
                    <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Information</h2>
                    
                    <p className="text-white/80 mb-4">
                      If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                    </p>
                    
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <p className="text-white/80 mb-2"><strong>Email:</strong> privacy@deskive.com</p>
                      <p className="text-white/80 mb-2"><strong>Address:</strong> Deskive, Nissho II 1F Room 1-B, 6-5-5 Nagatsuta, Midori-ku, Yokohama, Kanagawa, Japan</p>
                      <p className="text-white/80 mb-2"><strong>Phone:</strong> +81-45-508-9779</p>
                      <p className="text-white/80"><strong>Data Protection Officer:</strong> dpo@deskive.com</p>
                    </div>
                  </section>

                  {/* Call to Action */}
                  <div className="mt-12 p-6 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-lg border border-cyan-500/30">
                    <h3 className="text-xl font-semibold text-white mb-2">Questions about our Privacy Policy?</h3>
                    <p className="text-white/80 mb-4">
                      We're here to help. Contact our privacy team for any questions or concerns about how we handle your data.
                    </p>
                    <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-white">
                      <a href="mailto:privacy@deskive.com">Contact Privacy Team</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}