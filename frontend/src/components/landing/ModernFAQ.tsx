import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'pricing' | 'features' | 'technical' | 'account';
}

const ModernFAQ: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  // FAQ items covering all aspects of Deskive
  const faqItems: FAQItem[] = [
    // General Questions
    {
      question: intl.formatMessage({ id: 'faq.general.what.question', defaultMessage: 'What is Deskive and how does it work?' }),
      answer: intl.formatMessage({ id: 'faq.general.what.answer', defaultMessage: 'Deskive is an all-in-one workspace platform that combines six essential team tools: Chat, Video Calls, Projects, Files, Calendar, and Notes. It works by providing a unified platform where teams can collaborate in real-time, manage projects with Kanban boards, share files securely, schedule meetings, and create documentation—all enhanced by AI-powered features.' }),
      category: 'general'
    },
    {
      question: intl.formatMessage({ id: 'faq.general.beginners.question', defaultMessage: 'Is Deskive suitable for beginners?' }),
      answer: intl.formatMessage({ id: 'faq.general.beginners.answer', defaultMessage: 'Absolutely! Deskive is designed with simplicity in mind. Our intuitive interface makes it easy for anyone to get started. The Free plan is perfect for beginners, offering essential features forever free with no credit card required.' }),
      category: 'general'
    },
    {
      question: intl.formatMessage({ id: 'faq.general.devices.question', defaultMessage: 'Can I use Deskive on multiple devices?' }),
      answer: intl.formatMessage({ id: 'faq.general.devices.answer', defaultMessage: 'Yes! Deskive is available on web browsers, desktop apps (macOS and Windows), and mobile apps (Android available, iOS coming soon). Your data syncs automatically across all devices in real-time, so you can seamlessly switch between your computer, tablet, and phone.' }),
      category: 'general'
    },

    // Pricing Questions
    {
      question: intl.formatMessage({ id: 'faq.pricing.free.question', defaultMessage: 'Is there a free plan?' }),
      answer: intl.formatMessage({ id: 'faq.pricing.free.answer', defaultMessage: 'Yes! Our Free plan is completely free forever. It includes 5 team members, 1 GB storage, basic chat & messaging, file sharing, mobile app access, and 2FA authentication. No credit card required, no time limits.' }),
      category: 'pricing'
    },
    {
      question: intl.formatMessage({ id: 'faq.pricing.change.question', defaultMessage: 'Can I change my plan anytime?' }),
      answer: intl.formatMessage({ id: 'faq.pricing.change.answer', defaultMessage: 'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you\'ll get immediate access to new features. When downgrading, changes take effect at the next billing cycle.' }),
      category: 'pricing'
    },
    {
      question: intl.formatMessage({ id: 'faq.pricing.payment.question', defaultMessage: 'What payment methods do you accept?' }),
      answer: intl.formatMessage({ id: 'faq.pricing.payment.answer', defaultMessage: 'We accept all major credit cards including Visa, MasterCard, and American Express. All payments are processed securely through Stripe with bank-level encryption.' }),
      category: 'pricing'
    },
    {
      question: intl.formatMessage({ id: 'faq.pricing.cancel.question', defaultMessage: 'How do I cancel my subscription?' }),
      answer: intl.formatMessage({ id: 'faq.pricing.cancel.answer', defaultMessage: 'You can cancel your subscription at any time through Stripe subscription management. Your subscription will remain active until the end of your current billing period.' }),
      category: 'pricing'
    },

    // Features Questions
    {
      question: intl.formatMessage({ id: 'faq.features.ai.question', defaultMessage: 'What AI-powered features are included?' }),
      answer: intl.formatMessage({ id: 'faq.features.ai.answer', defaultMessage: 'Deskive includes AI-powered features across all modules: Smart chat summaries, AI content generation for notes, intelligent meeting scheduling suggestions, automatic task prioritization, smart file organization, and an AI assistant available across the platform.' }),
      category: 'features'
    },
    {
      question: intl.formatMessage({ id: 'faq.features.modules.question', defaultMessage: 'What modules are included in Deskive?' }),
      answer: intl.formatMessage({ id: 'faq.features.modules.answer', defaultMessage: 'Deskive includes 6 core modules: Chat (real-time messaging with threads), Video Calls (HD conferencing with screen sharing), Projects (Kanban boards and task management), Files (cloud storage with version control), Calendar (scheduling with smart suggestions), and Notes (rich text documentation).' }),
      category: 'features'
    },
    {
      question: intl.formatMessage({ id: 'faq.features.video.question', defaultMessage: 'What video call features are available?' }),
      answer: intl.formatMessage({ id: 'faq.features.video.answer', defaultMessage: 'Deskive offers HD video conferencing with screen sharing, meeting recording, background blur, virtual backgrounds, and public meeting links for external participants. Video calls support up to 10 participants on Starter and unlimited on Professional/Enterprise plans.' }),
      category: 'features'
    },
    {
      question: intl.formatMessage({ id: 'faq.features.storage.question', defaultMessage: 'How much storage do I get?' }),
      answer: intl.formatMessage({ id: 'faq.features.storage.answer', defaultMessage: 'Storage varies by plan: Free (1 GB), Starter (25 GB), Professional (100 GB), Enterprise (1 TB+). All plans include file versioning and secure cloud storage.' }),
      category: 'features'
    },
    {
      question: intl.formatMessage({ id: 'faq.features.integrations.question', defaultMessage: 'Are there integrations available?' }),
      answer: intl.formatMessage({ id: 'faq.features.integrations.answer', defaultMessage: 'Yes! Starter plans include 5 custom integrations, Professional plans include unlimited integrations, and Enterprise plans include custom integrations with API access and dedicated support.' }),
      category: 'features'
    },

    // Technical Questions
    {
      question: intl.formatMessage({ id: 'faq.technical.security.question', defaultMessage: 'How secure is my data?' }),
      answer: intl.formatMessage({ id: 'faq.technical.security.answer', defaultMessage: 'We take security seriously. All data is encrypted at rest and in transit using AES-256 encryption. We use secure HTTPS connections, offer two-factor authentication, and comply with GDPR and CCPA regulations. Enterprise plans include additional security features like SSO (SAML) and audit logs.' }),
      category: 'technical'
    },
    {
      question: intl.formatMessage({ id: 'faq.technical.export.question', defaultMessage: 'Can I export my data?' }),
      answer: intl.formatMessage({ id: 'faq.technical.export.answer', defaultMessage: 'Yes! You own your data and can export it anytime. Starter plans support CSV export, while Professional and Enterprise plans offer exports in multiple formats including CSV, JSON, and PDF.' }),
      category: 'technical'
    },
    {
      question: intl.formatMessage({ id: 'faq.technical.browsers.question', defaultMessage: 'What browsers and platforms are supported?' }),
      answer: intl.formatMessage({ id: 'faq.technical.browsers.answer', defaultMessage: 'Deskive works on all modern browsers including Chrome, Firefox, Safari, and Edge (latest versions). We also offer native desktop apps for macOS (Apple Silicon & Intel) and Windows, plus mobile apps (Android available, iOS coming soon).' }),
      category: 'technical'
    },
    {
      question: intl.formatMessage({ id: 'faq.technical.uptime.question', defaultMessage: 'What is your uptime guarantee?' }),
      answer: intl.formatMessage({ id: 'faq.technical.uptime.answer', defaultMessage: 'Professional plans include a 99.9% uptime SLA. Enterprise plans offer custom SLAs with dedicated infrastructure and priority incident response. We monitor our systems 24/7.' }),
      category: 'technical'
    },

    // Account Questions
    {
      question: intl.formatMessage({ id: 'faq.account.data.question', defaultMessage: 'What happens to my data if I cancel?' }),
      answer: intl.formatMessage({ id: 'faq.account.data.answer', defaultMessage: 'You can cancel your subscription at any time. Your subscription will remain active until the end of your billing period. You can export your data anytime before or after cancellation. For data deletion requests, visit the Data Deletion page in our footer.' }),
      category: 'account'
    },
    {
      question: intl.formatMessage({ id: 'faq.account.team.question', defaultMessage: 'How do I add team members?' }),
      answer: intl.formatMessage({ id: 'faq.account.team.answer', defaultMessage: 'Go to your workspace settings and select "Members". You can invite team members by email or generate an invite link. You can assign roles (Admin, Member, Viewer) to control access levels. Team member limits vary by plan: Free (5), Starter (25), Professional (100), Enterprise (unlimited).' }),
      category: 'account'
    },
    {
      question: intl.formatMessage({ id: 'faq.account.support.question', defaultMessage: 'How do I get support?' }),
      answer: intl.formatMessage({ id: 'faq.account.support.answer', defaultMessage: 'Support options vary by plan: Free users get community support and documentation. Starter users have email support. Professional users get priority support with faster response times. Enterprise users receive 24/7 phone support and a dedicated account manager.' }),
      category: 'account'
    }
  ];

  const categories = [
    { id: 'all', label: intl.formatMessage({ id: 'faq.category.all', defaultMessage: 'All Questions' }), count: faqItems.length },
    { id: 'general', label: intl.formatMessage({ id: 'faq.category.general', defaultMessage: 'General' }), count: faqItems.filter(i => i.category === 'general').length },
    { id: 'pricing', label: intl.formatMessage({ id: 'faq.category.pricing', defaultMessage: 'Pricing & Billing' }), count: faqItems.filter(i => i.category === 'pricing').length },
    { id: 'features', label: intl.formatMessage({ id: 'faq.category.features', defaultMessage: 'Features' }), count: faqItems.filter(i => i.category === 'features').length },
    { id: 'technical', label: intl.formatMessage({ id: 'faq.category.technical', defaultMessage: 'Technical' }), count: faqItems.filter(i => i.category === 'technical').length },
    { id: 'account', label: intl.formatMessage({ id: 'faq.category.account', defaultMessage: 'Account' }), count: faqItems.filter(i => i.category === 'account').length },
  ];

  const filteredFAQs = selectedCategory === 'all'
    ? faqItems
    : faqItems.filter(item => item.category === selectedCategory);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const
      }
    }
  };

  return (
    <section id="faq" className="py-24 md:py-32 bg-gradient-to-br from-gray-50 via-white to-sky-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div
          style={{
            backgroundImage: `
              linear-gradient(rgba(14, 165, 233, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14, 165, 233, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
          className="w-full h-full"
        />
      </div>

      {/* Subtle gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-200/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-200/30 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
            className="text-center mb-12"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-100 border border-sky-200 mb-6"
            >
              <HelpCircle className="h-4 w-4 text-sky-600" />
              <span className="text-sm font-medium text-sky-700">
                {intl.formatMessage({ id: 'faq.badge', defaultMessage: 'Got Questions?' })}
              </span>
            </motion.div>

            <motion.h2
              variants={itemVariants}
              className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 text-gray-900"
            >
              {intl.formatMessage({ id: 'faq.title', defaultMessage: 'Frequently Asked' })}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
                {intl.formatMessage({ id: 'faq.titleHighlight', defaultMessage: 'Questions' })}
              </span>
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="text-lg text-gray-600 max-w-2xl mx-auto"
            >
              {intl.formatMessage({ id: 'faq.subtitle', defaultMessage: 'Everything you need to know about Deskive' })}
            </motion.p>
          </motion.div>

          {/* Category Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex flex-wrap gap-2 justify-center mb-10"
          >
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setOpenFAQ(null);
                }}
                className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/25'
                    : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 hover:border-sky-300'
                }`}
              >
                {category.label}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  selectedCategory === category.id
                    ? 'bg-white/20'
                    : 'bg-gray-100'
                }`}>
                  {category.count}
                </span>
              </button>
            ))}
          </motion.div>

          {/* FAQ Items */}
          <motion.div
            key={selectedCategory}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={containerVariants}
            className="space-y-4"
          >
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No questions found in this category.
              </div>
            ) : (
              filteredFAQs.map((item, index) => (
                <motion.div
                  key={`${selectedCategory}-${index}`}
                  variants={itemVariants}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-sky-200 transition-all duration-300"
                >
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left group"
                >
                  <span className="font-semibold text-gray-900 pr-8 group-hover:text-sky-600 transition-colors">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ${
                      openFAQ === index ? 'rotate-180 text-sky-500' : ''
                    }`}
                  />
                </button>
                <motion.div
                  initial={false}
                  animate={{
                    height: openFAQ === index ? 'auto' : 0,
                    opacity: openFAQ === index ? 1 : 0
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-5">
                    <p className="text-gray-600 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
              ))
            )}
          </motion.div>

          {/* Contact CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-gray-600 mb-6 text-lg">
              {intl.formatMessage({ id: 'faq.contact.text', defaultMessage: "Still have questions? We're here to help!" })}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-sky-300 px-6 py-3"
                onClick={() => {
                  const contactElement = document.getElementById('contact');
                  if (contactElement) {
                    contactElement.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                {intl.formatMessage({ id: 'faq.contact.button', defaultMessage: 'Contact Support' })}
              </Button>
              <Button
                className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white border-0 px-6 py-3 group shadow-lg shadow-sky-500/25"
                onClick={() => navigate('/auth/register')}
              >
                {intl.formatMessage({ id: 'faq.getStarted.button', defaultMessage: 'Get Started Free' })}
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ModernFAQ;
export { ModernFAQ };
