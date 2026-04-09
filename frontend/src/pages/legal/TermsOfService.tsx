/**
 * Terms of Service Page
 * Comprehensive terms of service for Deskive SaaS platform
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
  { id: 'acceptance', title: 'Acceptance of Terms' },
  { id: 'service-description', title: 'Service Description' },
  { id: 'account-registration', title: 'Account Registration' },
  { id: 'acceptable-use', title: 'Acceptable Use Policy' },
  { id: 'subscription-billing', title: 'Subscription and Billing' },
  { id: 'intellectual-property', title: 'Intellectual Property' },
  { id: 'user-content', title: 'User Content and Data' },
  { id: 'privacy-data', title: 'Privacy and Data Protection' },
  { id: 'service-availability', title: 'Service Availability' },
  { id: 'limitation-liability', title: 'Limitation of Liability' },
  { id: 'indemnification', title: 'Indemnification' },
  { id: 'termination', title: 'Termination' },
  { id: 'modifications', title: 'Modifications to Terms' },
  { id: 'governing-law', title: 'Governing Law' },
  { id: 'contact', title: 'Contact Information' },
];

export default function TermsOfService() {
  const [activeSection, setActiveSection] = useState<string>('acceptance');

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
              <span className="text-white">Terms of Service</span>
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
                      Terms of Service
                    </h1>
                    <p className="text-white/70 text-lg">
                      These terms govern your use of Deskive and the rights and responsibilities of both parties.
                    </p>
                    <div className="mt-4 text-sm text-white/50">
                      Last updated: {lastUpdated}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="prose prose-invert max-w-none space-y-8">
                  {/* Acceptance of Terms */}
                  <section id="acceptance">
                    <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
                    <p className="text-white/80 mb-4">
                      By accessing or using Deskive ("Service"), operated by Deskive Inc. ("Company," "we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
                    </p>
                    <p className="text-white/80 mb-4">
                      These Terms constitute a legally binding agreement between you and Deskive Inc. regarding your use of the Service. By creating an account or using our Service, you represent that you have read, understood, and agree to be bound by these Terms.
                    </p>
                    <p className="text-white/80">
                      If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms, and "you" refers to both you individually and the organization.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Service Description */}
                  <section id="service-description">
                    <h2 className="text-2xl font-semibold text-white mb-4">2. Service Description</h2>
                    
                    <p className="text-white/80 mb-4">
                      Deskive is a comprehensive workspace collaboration platform that provides:
                    </p>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Project management and task tracking tools</li>
                      <li>Real-time messaging and video communication</li>
                      <li>File storage and document collaboration</li>
                      <li>Calendar integration and scheduling</li>
                      <li>Analytics and reporting features</li>
                      <li>Third-party integrations and API access</li>
                      <li>AI-powered productivity features</li>
                    </ul>
                    
                    <p className="text-white/80 mb-4">
                      We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.
                    </p>
                    
                    <p className="text-white/80">
                      The Service is provided on an "as is" and "as available" basis. We make no warranties or representations about the Service's availability, reliability, or suitability for your specific needs.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Account Registration */}
                  <section id="account-registration">
                    <h2 className="text-2xl font-semibold text-white mb-4">3. Account Registration</h2>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">3.1 Account Creation</h3>
                    <p className="text-white/80 mb-4">
                      To use certain features of our Service, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">3.2 Account Security</h3>
                    <p className="text-white/80 mb-4">
                      You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
                    </p>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Use strong passwords and enable two-factor authentication when available</li>
                      <li>Notify us immediately of any unauthorized use of your account</li>
                      <li>Not share your account credentials with others</li>
                      <li>Take reasonable steps to prevent unauthorized access to your account</li>
                    </ul>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">3.3 Account Eligibility</h3>
                    <p className="text-white/80">
                      You must be at least 13 years old to create an account. If you are under 18, you represent that you have your parent's or guardian's permission to use the Service and that they agree to these Terms on your behalf.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Acceptable Use Policy */}
                  <section id="acceptable-use">
                    <h2 className="text-2xl font-semibold text-white mb-4">4. Acceptable Use Policy</h2>
                    
                    <p className="text-white/80 mb-4">
                      You agree to use the Service in compliance with all applicable laws and regulations. You will not use the Service to:
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">4.1 Prohibited Activities</h3>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Violate any applicable laws, regulations, or third-party rights</li>
                      <li>Transmit harmful, offensive, or illegal content</li>
                      <li>Impersonate others or provide false information</li>
                      <li>Interfere with or disrupt the Service or its servers</li>
                      <li>Attempt to gain unauthorized access to other accounts or systems</li>
                      <li>Use automated systems to access the Service without permission</li>
                      <li>Reverse engineer, decompile, or disassemble the Service</li>
                      <li>Remove or modify any proprietary notices or labels</li>
                    </ul>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">4.2 Content Standards</h3>
                    <p className="text-white/80 mb-4">All content you upload or share must be:</p>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Legally owned by you or used with proper permission</li>
                      <li>Free from viruses, malware, or other harmful code</li>
                      <li>Appropriate for a professional business environment</li>
                      <li>Compliant with applicable privacy and data protection laws</li>
                    </ul>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">4.3 Enforcement</h3>
                    <p className="text-white/80">
                      We reserve the right to investigate and take appropriate action against users who violate these terms, including suspending or terminating accounts, removing content, and cooperating with law enforcement authorities.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Subscription and Billing */}
                  <section id="subscription-billing">
                    <h2 className="text-2xl font-semibold text-white mb-4">5. Subscription and Billing</h2>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">5.1 Subscription Plans</h3>
                    <p className="text-white/80 mb-4">
                      We offer various subscription plans with different features and usage limits. Current pricing and plan details are available on our website. Prices are subject to change with notice.
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">5.2 Payment Terms</h3>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Subscriptions are billed in advance on a monthly or annual basis</li>
                      <li>Payment is due immediately upon subscription or renewal</li>
                      <li>All fees are non-refundable except as required by law</li>
                      <li>You authorize us to charge your payment method for all fees</li>
                      <li>You're responsible for keeping payment information current</li>
                    </ul>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">5.3 Free Trials and Plans</h3>
                    <p className="text-white/80 mb-4">
                      We may offer free trials or plans with limited features. Free accounts may be subject to usage restrictions, advertisements, or other limitations. We reserve the right to modify or discontinue free offerings at any time.
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">5.4 Refunds and Cancellation</h3>
                    <p className="text-white/80">
                      You may cancel your subscription at any time through your account settings. Cancellation will take effect at the end of your current billing period. Refunds are provided only as required by applicable law or at our sole discretion.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Intellectual Property */}
                  <section id="intellectual-property">
                    <h2 className="text-2xl font-semibold text-white mb-4">6. Intellectual Property</h2>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">6.1 Our Rights</h3>
                    <p className="text-white/80 mb-4">
                      The Service, including all software, text, images, trademarks, service marks, copyrights, patents, and other intellectual property, is owned by Deskive Inc. or our licensors. These Terms do not grant you any rights to our intellectual property except as explicitly stated.
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">6.2 Limited License</h3>
                    <p className="text-white/80 mb-4">
                      We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service solely for your internal business purposes in accordance with these Terms.
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">6.3 Feedback</h3>
                    <p className="text-white/80">
                      Any feedback, suggestions, or ideas you provide about the Service become our property, and we may use them without restriction or compensation to you.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* User Content and Data */}
                  <section id="user-content">
                    <h2 className="text-2xl font-semibold text-white mb-4">7. User Content and Data</h2>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">7.1 Your Content</h3>
                    <p className="text-white/80 mb-4">
                      You retain ownership of all content you upload, create, or share through the Service ("Your Content"). By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to use, copy, modify, and distribute Your Content solely to provide and improve the Service.
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">7.2 Data Responsibility</h3>
                    <p className="text-white/80 mb-4">
                      You are responsible for:
                    </p>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>The accuracy and legality of Your Content</li>
                      <li>Backing up your important data</li>
                      <li>Complying with data protection laws regarding Your Content</li>
                      <li>Obtaining necessary permissions for content you share</li>
                    </ul>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">7.3 Data Portability</h3>
                    <p className="text-white/80">
                      You can export Your Content from the Service at any time through available export features. We will provide reasonable assistance with data migration during the transition period after account termination.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Privacy and Data Protection */}
                  <section id="privacy-data">
                    <h2 className="text-2xl font-semibold text-white mb-4">8. Privacy and Data Protection</h2>
                    
                    <p className="text-white/80 mb-4">
                      Your privacy is important to us. Our collection, use, and protection of your personal information is governed by our{' '}
                      <Link to="/privacy" className="text-cyan-300 hover:text-cyan-200 underline">
                        Privacy Policy
                      </Link>, which is incorporated into these Terms by reference.
                    </p>
                    
                    <p className="text-white/80 mb-4">
                      By using the Service, you consent to the collection, use, and sharing of your information as described in our Privacy Policy. We implement appropriate security measures to protect your data, but we cannot guarantee absolute security.
                    </p>
                    
                    <p className="text-white/80">
                      For information about cookies and tracking technologies, please see our{' '}
                      <Link to="/legal/cookie-policy" className="text-cyan-300 hover:text-cyan-200 underline">
                        Cookie Policy
                      </Link>.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Service Availability */}
                  <section id="service-availability">
                    <h2 className="text-2xl font-semibold text-white mb-4">9. Service Availability</h2>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">9.1 Uptime and Maintenance</h3>
                    <p className="text-white/80 mb-4">
                      While we strive to maintain high availability, we do not guarantee that the Service will be available 100% of the time. The Service may be temporarily unavailable due to maintenance, updates, or technical issues.
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">9.2 Service Level Agreement</h3>
                    <p className="text-white/80 mb-4">
                      For paid plans, we target 99.9% uptime (excluding scheduled maintenance). Service level commitments and remedies for downtime are detailed in our Service Level Agreement, available upon request.
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">9.3 Third-Party Dependencies</h3>
                    <p className="text-white/80">
                      Our Service may depend on third-party services and infrastructure. We are not responsible for the availability or performance of these third-party services, though we will use reasonable efforts to minimize disruptions.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Limitation of Liability */}
                  <section id="limitation-liability">
                    <h2 className="text-2xl font-semibold text-white mb-4">10. Limitation of Liability</h2>
                    
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                      <p className="text-yellow-300 font-medium">Important Legal Notice</p>
                      <p className="text-white/80 text-sm mt-1">
                        This section limits our liability to you. Please read carefully.
                      </p>
                    </div>
                    
                    <p className="text-white/80 mb-4">
                      TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL DESKIVE INC., ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
                    </p>
                    
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Loss of profits, data, use, or goodwill</li>
                      <li>Business interruption or lost opportunities</li>
                      <li>Cost of substitute products or services</li>
                      <li>Any other intangible losses</li>
                    </ul>
                    
                    <p className="text-white/80 mb-4">
                      OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATING TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU HAVE PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS GREATER.
                    </p>
                    
                    <p className="text-white/80">
                      Some jurisdictions do not allow the exclusion or limitation of liability for consequential or incidental damages, so the above limitations may not apply to you.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Indemnification */}
                  <section id="indemnification">
                    <h2 className="text-2xl font-semibold text-white mb-4">11. Indemnification</h2>
                    
                    <p className="text-white/80 mb-4">
                      You agree to defend, indemnify, and hold harmless Deskive Inc., its officers, directors, employees, agents, licensors, and suppliers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:
                    </p>
                    
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Your use or misuse of the Service</li>
                      <li>Your violation of these Terms</li>
                      <li>Your violation of any rights of another party</li>
                      <li>Your Content or any content you share through the Service</li>
                    </ul>
                    
                    <p className="text-white/80">
                      This indemnification obligation will survive termination of these Terms and your use of the Service.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Termination */}
                  <section id="termination">
                    <h2 className="text-2xl font-semibold text-white mb-4">12. Termination</h2>

                    {/* <h3 className="text-xl font-medium text-cyan-300 mb-3">12.1 Termination by You</h3>
                    <p className="text-white/80 mb-4">
                      You may terminate your account at any time through your account settings or by contacting us. Termination will be effective at the end of your current billing period for paid accounts.
                    </p> */}

                    <h3 className="text-xl font-medium text-cyan-300 mb-3">12.2 Termination by Us</h3>
                    <p className="text-white/80 mb-4">
                      We may suspend or terminate your account immediately if you:
                    </p>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Violate these Terms or our Acceptable Use Policy</li>
                      <li>Fail to pay required fees</li>
                      <li>Engage in activities that harm the Service or other users</li>
                      <li>Provide false or misleading information</li>
                    </ul>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">12.3 Effect of Termination</h3>
                    <p className="text-white/80">
                      Upon termination, your right to use the Service will cease immediately. We will provide you with a reasonable opportunity to export Your Content, after which it may be permanently deleted. Sections that by their nature should survive termination will remain in effect.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Modifications to Terms */}
                  <section id="modifications">
                    <h2 className="text-2xl font-semibold text-white mb-4">13. Modifications to Terms</h2>
                    
                    <p className="text-white/80 mb-4">
                      We reserve the right to modify these Terms at any time. When we make changes, we will:
                    </p>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Update the "Last updated" date at the top of these Terms</li>
                      <li>Notify you through email or prominent notices in the Service</li>
                      <li>Provide at least 30 days' notice for material changes</li>
                    </ul>
                    
                    <p className="text-white/80">
                      Your continued use of the Service after changes become effective constitutes acceptance of the modified Terms. If you do not agree to the changes, you must stop using the Service and terminate your account.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Governing Law */}
                  <section id="governing-law">
                    <h2 className="text-2xl font-semibold text-white mb-4">14. Governing Law</h2>
                    
                    <p className="text-white/80 mb-4">
                      These Terms shall be interpreted and governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms will be brought exclusively in the federal or state courts located in Delaware.
                    </p>
                    
                    <p className="text-white/80 mb-4">
                      For users outside the United States, local consumer protection laws may provide additional rights that cannot be waived by these Terms.
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">Dispute Resolution</h3>
                    <p className="text-white/80">
                      Before filing any legal action, you agree to first contact us to attempt to resolve any dispute informally. We're committed to working with you to resolve any concerns about the Service.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Contact Information */}
                  <section id="contact">
                    <h2 className="text-2xl font-semibold text-white mb-4">15. Contact Information</h2>
                    
                    <p className="text-white/80 mb-4">
                      If you have questions about these Terms or need to contact us regarding legal matters, please reach out:
                    </p>
                    
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <p className="text-white/80 mb-2"><strong>Email:</strong> legal@deskive.com</p>
                      <p className="text-white/80 mb-2"><strong>Address:</strong> Deskive, Nissho II 1F Room 1-B, 6-5-5 Nagatsuta, Midori-ku, Yokohama, Kanagawa, Japan</p>
                      <p className="text-white/80"><strong>Phone:</strong> +81-45-508-9779</p>
                    </div>
                  </section>

                  {/* Call to Action */}
                  <div className="mt-12 p-6 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-lg border border-cyan-500/30">
                    <h3 className="text-xl font-semibold text-white mb-2">Questions about our Terms?</h3>
                    <p className="text-white/80 mb-4">
                      Our legal team is here to help clarify any questions you may have about these terms of service.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-white">
                        <a href="mailto:legal@deskive.com">Contact Legal Team</a>
                      </Button>
                      <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
                        <Link to="/privacy">Read Privacy Policy</Link>
                      </Button>
                    </div>
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