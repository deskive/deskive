import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'features' | 'technical';
}

const ModernFAQ: React.FC = () => {
  const intl = useIntl();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const faqItems: FAQItem[] = [
    // General Questions
    {
      question: intl.formatMessage({ id: 'faq.general.what.question', defaultMessage: 'What is Deskive and how does it work?' }),
      answer: intl.formatMessage({ id: 'faq.general.what.answer', defaultMessage: 'Deskive is an all-in-one workspace platform that combines six essential team tools: Chat, Video Calls, Projects, Files, Calendar, and Notes. It provides a unified platform where teams can collaborate in real-time, manage projects with Kanban boards, share files securely, schedule meetings, and create documentation—all enhanced by AI-powered features.' }),
      category: 'general'
    },
    {
      question: intl.formatMessage({ id: 'faq.general.beginners.question', defaultMessage: 'Is Deskive suitable for beginners?' }),
      answer: intl.formatMessage({ id: 'faq.general.beginners.answer', defaultMessage: 'Absolutely. Deskive is designed with simplicity in mind. Its intuitive interface makes it easy for anyone to get started, whether you are a solo user or part of a larger team.' }),
      category: 'general'
    },
    {
      question: intl.formatMessage({ id: 'faq.general.devices.question', defaultMessage: 'Can I use Deskive on multiple devices?' }),
      answer: intl.formatMessage({ id: 'faq.general.devices.answer', defaultMessage: 'Yes. Deskive runs on modern web browsers and offers desktop and mobile clients. Your data syncs automatically across all devices in real-time so you can seamlessly switch between your computer, tablet, and phone.' }),
      category: 'general'
    },
    {
      question: intl.formatMessage({ id: 'faq.general.opensource.question', defaultMessage: 'Is Deskive open source?' }),
      answer: intl.formatMessage({ id: 'faq.general.opensource.answer', defaultMessage: 'Yes. Deskive is open source, so you can self-host it, inspect the code, and contribute improvements back to the project.' }),
      category: 'general'
    },

    // Features Questions
    {
      question: intl.formatMessage({ id: 'faq.features.ai.question', defaultMessage: 'What AI-powered features are included?' }),
      answer: intl.formatMessage({ id: 'faq.features.ai.answer', defaultMessage: 'Deskive includes AI-powered features across all modules: smart chat summaries, AI content generation for notes, intelligent meeting scheduling suggestions, automatic task prioritization, smart file organization, and an AI assistant available across the platform.' }),
      category: 'features'
    },
    {
      question: intl.formatMessage({ id: 'faq.features.modules.question', defaultMessage: 'What modules are included in Deskive?' }),
      answer: intl.formatMessage({ id: 'faq.features.modules.answer', defaultMessage: 'Deskive includes 6 core modules: Chat (real-time messaging with threads), Video Calls (HD conferencing with screen sharing), Projects (Kanban boards and task management), Files (cloud storage with version control), Calendar (scheduling with smart suggestions), and Notes (rich text documentation).' }),
      category: 'features'
    },
    {
      question: intl.formatMessage({ id: 'faq.features.collaboration.question', defaultMessage: 'How does real-time collaboration work?' }),
      answer: intl.formatMessage({ id: 'faq.features.collaboration.answer', defaultMessage: 'Edits to notes, tasks, and files are synced live between everyone in the workspace. You can see presence indicators, typing status, and changes as they happen—no refresh required.' }),
      category: 'features'
    },

    // Technical Questions
    {
      question: intl.formatMessage({ id: 'faq.technical.security.question', defaultMessage: 'How secure is my data?' }),
      answer: intl.formatMessage({ id: 'faq.technical.security.answer', defaultMessage: 'Data is encrypted at rest and in transit using industry-standard AES-256 encryption. Connections use HTTPS, two-factor authentication is supported, and because Deskive is open source you can audit the security model yourself.' }),
      category: 'technical'
    },
    {
      question: intl.formatMessage({ id: 'faq.technical.export.question', defaultMessage: 'Can I export my data?' }),
      answer: intl.formatMessage({ id: 'faq.technical.export.answer', defaultMessage: 'Yes. You own your data and can export it at any time. Common formats include CSV, JSON, and PDF depending on the module.' }),
      category: 'technical'
    },
    {
      question: intl.formatMessage({ id: 'faq.technical.browsers.question', defaultMessage: 'What browsers and platforms are supported?' }),
      answer: intl.formatMessage({ id: 'faq.technical.browsers.answer', defaultMessage: 'Deskive works on all modern browsers including Chrome, Firefox, Safari, and Edge (latest versions). Native desktop clients are available for macOS and Windows, plus mobile apps for Android and iOS.' }),
      category: 'technical'
    },
    {
      question: intl.formatMessage({ id: 'faq.technical.selfhost.question', defaultMessage: 'Can I self-host Deskive?' }),
      answer: intl.formatMessage({ id: 'faq.technical.selfhost.answer', defaultMessage: 'Yes. Because Deskive is open source you can run the full stack on your own infrastructure. Check the repository for deployment guides and configuration options.' }),
      category: 'technical'
    }
  ];

  const categories = [
    { id: 'all', label: intl.formatMessage({ id: 'faq.category.all', defaultMessage: 'All Questions' }), count: faqItems.length },
    { id: 'general', label: intl.formatMessage({ id: 'faq.category.general', defaultMessage: 'General' }), count: faqItems.filter(i => i.category === 'general').length },
    { id: 'features', label: intl.formatMessage({ id: 'faq.category.features', defaultMessage: 'Features' }), count: faqItems.filter(i => i.category === 'features').length },
    { id: 'technical', label: intl.formatMessage({ id: 'faq.category.technical', defaultMessage: 'Technical' }), count: faqItems.filter(i => i.category === 'technical').length },
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

        </div>
      </div>
    </section>
  );
};

export default ModernFAQ;
export { ModernFAQ };
