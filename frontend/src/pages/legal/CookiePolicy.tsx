/**
 * Cookie Policy Page
 * Comprehensive cookie policy for Deskive SaaS platform
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';

interface TableOfContentsItem {
  id: string;
  title: string;
  subsections?: { id: string; title: string }[];
}

const tableOfContents: TableOfContentsItem[] = [
  { id: 'overview', title: 'What Are Cookies?' },
  { id: 'types-cookies', title: 'Types of Cookies We Use' },
  { id: 'essential-cookies', title: 'Essential Cookies' },
  { id: 'functional-cookies', title: 'Functional Cookies' },
  { id: 'analytics-cookies', title: 'Analytics Cookies' },
  { id: 'marketing-cookies', title: 'Marketing Cookies' },
  { id: 'third-party-cookies', title: 'Third-Party Cookies' },
  { id: 'cookie-management', title: 'Managing Your Cookie Preferences' },
  { id: 'browser-settings', title: 'Browser Cookie Settings' },
  { id: 'mobile-settings', title: 'Mobile Device Settings' },
  { id: 'policy-changes', title: 'Changes to This Policy' },
  { id: 'contact', title: 'Contact Information' },
];

interface CookieCategory {
  name: string;
  description: string;
  essential: boolean;
  examples: string[];
  retention: string;
  badge: 'essential' | 'functional' | 'analytics' | 'marketing';
}

const cookieCategories: CookieCategory[] = [
  {
    name: 'Essential Cookies',
    description: 'These cookies are necessary for the website to function properly and cannot be disabled.',
    essential: true,
    examples: [
      'Authentication tokens',
      'Session management',
      'Security preferences',
      'Load balancing'
    ],
    retention: 'Session to 1 year',
    badge: 'essential'
  },
  {
    name: 'Functional Cookies',
    description: 'These cookies enhance functionality and personalization but are not essential for basic operation.',
    essential: false,
    examples: [
      'Language preferences',
      'Theme settings',
      'Workspace layout',
      'Notification preferences'
    ],
    retention: '30 days to 2 years',
    badge: 'functional'
  },
  {
    name: 'Analytics Cookies',
    description: 'These cookies help us understand how users interact with our service to improve performance.',
    essential: false,
    examples: [
      'Page view tracking',
      'Feature usage analytics',
      'Performance monitoring',
      'Error reporting'
    ],
    retention: '30 days to 2 years',
    badge: 'analytics'
  },
  {
    name: 'Marketing Cookies',
    description: 'These cookies are used to deliver relevant advertisements and track campaign effectiveness.',
    essential: false,
    examples: [
      'Ad targeting',
      'Campaign tracking',
      'Conversion measurement',
      'Remarketing'
    ],
    retention: '30 days to 2 years',
    badge: 'marketing'
  }
];

export default function CookiePolicy() {
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

  const getBadgeVariant = (badge: string) => {
    switch (badge) {
      case 'essential':
        return 'destructive';
      case 'functional':
        return 'default';
      case 'analytics':
        return 'secondary';
      case 'marketing':
        return 'outline';
      default:
        return 'default';
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
              <span className="text-white">Cookie Policy</span>
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
                      Cookie Policy
                    </h1>
                    <p className="text-white/70 text-lg">
                      Learn about how Deskive uses cookies and similar technologies to enhance your experience and provide our services.
                    </p>
                    <div className="mt-4 text-sm text-white/50">
                      Last updated: {lastUpdated}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="prose prose-invert max-w-none space-y-8">
                  {/* Overview */}
                  <section id="overview">
                    <h2 className="text-2xl font-semibold text-white mb-4">1. What Are Cookies?</h2>
                    <p className="text-white/80 mb-4">
                      Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently and to provide a better, more personalized user experience.
                    </p>
                    <p className="text-white/80 mb-4">
                      Deskive uses cookies and similar technologies (such as web beacons, pixels, and local storage) to:
                    </p>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Keep you signed in to your account</li>
                      <li>Remember your preferences and settings</li>
                      <li>Provide security and prevent fraud</li>
                      <li>Analyze how our service is used to improve functionality</li>
                      <li>Deliver relevant content and advertisements</li>
                      <li>Measure the effectiveness of our marketing campaigns</li>
                    </ul>
                    <p className="text-white/80">
                      This Cookie Policy explains what cookies we use, why we use them, and how you can manage your cookie preferences.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Types of Cookies */}
                  <section id="types-cookies">
                    <h2 className="text-2xl font-semibold text-white mb-4">2. Types of Cookies We Use</h2>
                    
                    <p className="text-white/80 mb-6">
                      We categorize cookies based on their purpose and how long they remain on your device:
                    </p>

                    <div className="grid gap-6">
                      {cookieCategories.map((category) => (
                        <Card key={category.name} className="bg-white/5 border-white/10">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg font-semibold text-white">
                                {category.name}
                              </CardTitle>
                              <Badge variant={getBadgeVariant(category.badge)}>
                                {category.essential ? 'Required' : 'Optional'}
                              </Badge>
                            </div>
                            <p className="text-white/70 text-sm">{category.description}</p>
                          </CardHeader>
                          <CardContent>
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-cyan-300 mb-2">Examples:</h4>
                              <div className="flex flex-wrap gap-2">
                                {category.examples.map((example) => (
                                  <Badge key={example} variant="outline" className="text-xs">
                                    {example}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-cyan-300">Retention Period: </span>
                              <span className="text-white/80 text-sm">{category.retention}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <h3 className="text-blue-300 font-medium mb-2">Cookie Duration Types</h3>
                      <ul className="text-white/80 text-sm space-y-1">
                        <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
                        <li><strong>Persistent Cookies:</strong> Remain on your device for a specified period</li>
                        <li><strong>First-Party Cookies:</strong> Set directly by Deskive</li>
                        <li><strong>Third-Party Cookies:</strong> Set by external services we use</li>
                      </ul>
                    </div>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Essential Cookies */}
                  <section id="essential-cookies">
                    <h2 className="text-2xl font-semibold text-white mb-4">3. Essential Cookies</h2>
                    
                    <p className="text-white/80 mb-4">
                      These cookies are strictly necessary for our service to function properly. They enable core functionality such as security, network management, and accessibility.
                    </p>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-white/10 text-sm">
                        <thead>
                          <tr className="bg-white/5">
                            <th className="border border-white/10 p-3 text-left text-white">Cookie Name</th>
                            <th className="border border-white/10 p-3 text-left text-white">Purpose</th>
                            <th className="border border-white/10 p-3 text-left text-white">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-white/10 p-3 text-white/80 font-mono">deskive_session</td>
                            <td className="border border-white/10 p-3 text-white/80">Maintains your login session</td>
                            <td className="border border-white/10 p-3 text-white/80">Session</td>
                          </tr>
                          <tr className="bg-white/2">
                            <td className="border border-white/10 p-3 text-white/80 font-mono">csrf_token</td>
                            <td className="border border-white/10 p-3 text-white/80">Prevents cross-site request forgery</td>
                            <td className="border border-white/10 p-3 text-white/80">Session</td>
                          </tr>
                          <tr>
                            <td className="border border-white/10 p-3 text-white/80 font-mono">deskive_auth</td>
                            <td className="border border-white/10 p-3 text-white/80">Stores authentication information</td>
                            <td className="border border-white/10 p-3 text-white/80">30 days</td>
                          </tr>
                          <tr className="bg-white/2">
                            <td className="border border-white/10 p-3 text-white/80 font-mono">load_balancer</td>
                            <td className="border border-white/10 p-3 text-white/80">Routes requests to appropriate servers</td>
                            <td className="border border-white/10 p-3 text-white/80">Session</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-300 text-sm">
                        <strong>Note:</strong> Essential cookies cannot be disabled as they are necessary for the service to function. Blocking these cookies may prevent you from using Deskive properly.
                      </p>
                    </div>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Functional Cookies */}
                  <section id="functional-cookies">
                    <h2 className="text-2xl font-semibold text-white mb-4">4. Functional Cookies</h2>
                    
                    <p className="text-white/80 mb-4">
                      These cookies allow our service to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we use.
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">Examples include:</h3>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li><strong>User Interface Preferences:</strong> Theme settings, sidebar collapsed state, table sorting preferences</li>
                      <li><strong>Language and Localization:</strong> Your selected language, timezone, date format preferences</li>
                      <li><strong>Workspace Settings:</strong> Default workspace view, notification settings, dashboard layout</li>
                      <li><strong>Accessibility Features:</strong> Font size adjustments, contrast preferences, keyboard navigation settings</li>
                    </ul>
                    
                    <p className="text-white/80">
                      If you disable functional cookies, some features may not work as expected, but the core functionality of Deskive will remain available.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Analytics Cookies */}
                  <section id="analytics-cookies">
                    <h2 className="text-2xl font-semibold text-white mb-4">5. Analytics Cookies</h2>
                    
                    <p className="text-white/80 mb-4">
                      We use analytics cookies to understand how users interact with our service. This information helps us improve our platform and user experience.
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">Information We Collect:</h3>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Pages visited and features used</li>
                      <li>Time spent on different sections</li>
                      <li>User flow patterns and navigation paths</li>
                      <li>Error rates and performance metrics</li>
                      <li>Device and browser information</li>
                      <li>Geographic location (country/region level)</li>
                    </ul>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">Analytics Partners:</h3>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <ul className="text-white/80 space-y-2">
                        <li><strong>Google Analytics:</strong> Web traffic analysis and user behavior insights</li>
                        <li><strong>Mixpanel:</strong> Product usage analytics and feature adoption tracking</li>
                        <li><strong>Hotjar:</strong> User session recordings and heatmap analysis (with opt-in consent)</li>
                      </ul>
                    </div>
                    
                    <p className="text-white/80 mt-4">
                      All analytics data is aggregated and anonymized. We do not share personally identifiable information with analytics providers.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Marketing Cookies */}
                  <section id="marketing-cookies">
                    <h2 className="text-2xl font-semibold text-white mb-4">6. Marketing Cookies</h2>
                    
                    <p className="text-white/80 mb-4">
                      Marketing cookies help us deliver relevant advertisements and measure the effectiveness of our marketing campaigns. These cookies may track you across different websites.
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">How We Use Marketing Cookies:</h3>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Show you relevant ads on other websites</li>
                      <li>Prevent you from seeing the same ad repeatedly</li>
                      <li>Measure ad campaign performance</li>
                      <li>Track conversions and attribution</li>
                      <li>Create lookalike audiences for advertising</li>
                    </ul>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">Advertising Partners:</h3>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-4">
                      <ul className="text-white/80 space-y-2">
                        <li><strong>Google Ads:</strong> Search and display advertising</li>
                        <li><strong>Facebook Pixel:</strong> Social media advertising and retargeting</li>
                        <li><strong>LinkedIn Insight Tag:</strong> Professional network advertising</li>
                        <li><strong>Twitter Universal Website Tag:</strong> Social media advertising</li>
                      </ul>
                    </div>
                    
                    <p className="text-white/80">
                      You can opt out of marketing cookies without affecting your ability to use Deskive. However, you may see less relevant advertising on other websites.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Third-Party Cookies */}
                  <section id="third-party-cookies">
                    <h2 className="text-2xl font-semibold text-white mb-4">7. Third-Party Cookies</h2>
                    
                    <p className="text-white/80 mb-4">
                      Some cookies are set by third-party services that appear on our pages. We don't control these cookies, and they are subject to the privacy policies of their respective providers.
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">Third-Party Services:</h3>
                    <div className="grid gap-4">
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-2">Customer Support</h4>
                          <p className="text-white/70 text-sm mb-2">Intercom, Zendesk - for chat support and help documentation</p>
                          <a href="#" className="text-cyan-300 text-xs hover:underline">Privacy Policy</a>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-2">Payment Processing</h4>
                          <p className="text-white/70 text-sm mb-2">Stripe, PayPal - for secure payment processing</p>
                          <a href="#" className="text-cyan-300 text-xs hover:underline">Privacy Policy</a>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-2">Content Delivery</h4>
                          <p className="text-white/70 text-sm mb-2">Cloudflare, AWS CloudFront - for fast content delivery</p>
                          <a href="#" className="text-cyan-300 text-xs hover:underline">Privacy Policy</a>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-2">Social Media</h4>
                          <p className="text-white/70 text-sm mb-2">Social media widgets and sharing buttons</p>
                          <a href="#" className="text-cyan-300 text-xs hover:underline">Privacy Policy</a>
                        </CardContent>
                      </Card>
                    </div>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Cookie Management */}
                  <section id="cookie-management">
                    <h2 className="text-2xl font-semibold text-white mb-4">8. Managing Your Cookie Preferences</h2>
                    
                    <p className="text-white/80 mb-4">
                      You have several options for managing cookies and controlling your privacy:
                    </p>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">Cookie Consent Manager</h3>
                    <p className="text-white/80 mb-4">
                      When you first visit Deskive, you'll see a cookie consent banner allowing you to choose which types of cookies to accept. You can change your preferences at any time by clicking the "Cookie Settings" link in our footer.
                    </p>
                    
                    <div className="p-4 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-lg border border-cyan-500/30 mb-4">
                      <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
                        Manage Cookie Preferences
                      </Button>
                    </div>
                    
                    <h3 className="text-xl font-medium text-cyan-300 mb-3">Account Settings</h3>
                    <p className="text-white/80">
                      Logged-in users can manage certain cookie preferences through their account settings, including analytics and marketing cookies.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Browser Settings */}
                  <section id="browser-settings">
                    <h2 className="text-2xl font-semibold text-white mb-4">9. Browser Cookie Settings</h2>
                    
                    <p className="text-white/80 mb-4">
                      You can also control cookies through your browser settings. Here's how to manage cookies in popular browsers:
                    </p>
                    
                    <div className="grid gap-4">
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-2">Google Chrome</h4>
                          <p className="text-white/70 text-sm">
                            Settings → Privacy and security → Cookies and other site data
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-2">Mozilla Firefox</h4>
                          <p className="text-white/70 text-sm">
                            Settings → Privacy & Security → Cookies and Site Data
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-2">Safari</h4>
                          <p className="text-white/70 text-sm">
                            Preferences → Privacy → Manage Website Data
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-2">Microsoft Edge</h4>
                          <p className="text-white/70 text-sm">
                            Settings → Cookies and site permissions → Cookies and site data
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-300 text-sm">
                        <strong>Warning:</strong> Disabling all cookies may affect your ability to use Deskive and other websites properly.
                      </p>
                    </div>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Mobile Settings */}
                  <section id="mobile-settings">
                    <h2 className="text-2xl font-semibold text-white mb-4">10. Mobile Device Settings</h2>
                    
                    <p className="text-white/80 mb-4">
                      On mobile devices, you can control tracking through device settings:
                    </p>
                    
                    <div className="grid gap-4">
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-2">iOS Devices</h4>
                          <p className="text-white/70 text-sm mb-2">
                            Settings → Privacy & Security → Tracking → Ask Apps Not to Track
                          </p>
                          <p className="text-white/70 text-sm">
                            Settings → Safari → Prevent Cross-Site Tracking
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-2">Android Devices</h4>
                          <p className="text-white/70 text-sm mb-2">
                            Settings → Privacy → Ads → Opt out of Ads Personalization
                          </p>
                          <p className="text-white/70 text-sm">
                            Chrome → Settings → Site settings → Cookies
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Policy Changes */}
                  <section id="policy-changes">
                    <h2 className="text-2xl font-semibold text-white mb-4">11. Changes to This Policy</h2>
                    
                    <p className="text-white/80 mb-4">
                      We may update this Cookie Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make changes, we will:
                    </p>
                    <ul className="list-disc pl-6 text-white/80 space-y-2 mb-4">
                      <li>Update the "Last updated" date at the top of this policy</li>
                      <li>Notify you through our service or by email for significant changes</li>
                      <li>Request renewed consent where required by law</li>
                    </ul>
                    
                    <p className="text-white/80">
                      We encourage you to review this Cookie Policy periodically to stay informed about how we use cookies.
                    </p>
                  </section>

                  <Separator className="bg-white/10" />

                  {/* Contact Information */}
                  <section id="contact">
                    <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Information</h2>
                    
                    <p className="text-white/80 mb-4">
                      If you have questions about this Cookie Policy or our use of cookies, please contact us:
                    </p>
                    
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-4">
                      <p className="text-white/80 mb-2"><strong>Email:</strong> privacy@deskive.com</p>
                      <p className="text-white/80 mb-2"><strong>Address:</strong> Deskive, Nissho II 1F Room 1-B, 6-5-5 Nagatsuta, Midori-ku, Yokohama, Kanagawa, Japan</p>
                      <p className="text-white/80 mb-2"><strong>Phone:</strong> +81-45-508-9779</p>
                      <p className="text-white/80"><strong>Data Protection Officer:</strong> dpo@deskive.com</p>
                    </div>
                    
                    <p className="text-white/80">
                      For more information about our data practices, please see our{' '}
                      <Link to="/privacy" className="text-cyan-300 hover:text-cyan-200 underline">
                        Privacy Policy
                      </Link>{' '}
                      and{' '}
                      <Link to="/legal/terms-of-service" className="text-cyan-300 hover:text-cyan-200 underline">
                        Terms of Service
                      </Link>.
                    </p>
                  </section>

                  {/* Call to Action */}
                  <div className="mt-12 p-6 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-lg border border-cyan-500/30">
                    <h3 className="text-xl font-semibold text-white mb-2">Take Control of Your Privacy</h3>
                    <p className="text-white/80 mb-4">
                      Manage your cookie preferences and learn more about how we protect your data.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
                        Cookie Preferences
                      </Button>
                      <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
                        <Link to="/privacy">Privacy Policy</Link>
                      </Button>
                      <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
                        <a href="mailto:privacy@deskive.com">Contact Privacy Team</a>
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