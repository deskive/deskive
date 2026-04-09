/**
 * Public Support Page
 * Contact form style support page with support type selection
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  HelpCircle,
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Bug,
  CreditCard,
  User,
  Lightbulb,
  HelpCircle as HelpIcon,
} from 'lucide-react';

// Components
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { PublicLayout } from '../../layouts/PublicLayout';
import { PageSEO } from '../../components/seo';
import { supportApi } from '../../lib/api/support-api';

// Support types defined locally to avoid Vite HMR issues
type SupportType =
  | 'technical_issue'
  | 'billing'
  | 'account'
  | 'feature_request'
  | 'bug_report'
  | 'general';

interface SupportFormData {
  name: string;
  email: string;
  company?: string;
  supportType: SupportType;
  subject: string;
  message: string;
}

// FAQ Item Component
interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onToggle }) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        className="w-full flex items-center justify-between py-4 text-left hover:text-blue-600 transition-colors"
        onClick={onToggle}
      >
        <span className="font-medium text-gray-900 dark:text-white">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="pb-4 text-gray-600 dark:text-gray-300 leading-relaxed"
        >
          {answer}
        </motion.div>
      )}
    </div>
  );
};

// Support type options with icons
const supportTypes: { value: SupportType; label: string; icon: React.ReactNode }[] = [
  { value: 'technical_issue', label: 'Technical Issue', icon: <Bug className="w-4 h-4" /> },
  { value: 'billing', label: 'Billing Question', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'account', label: 'Account Related', icon: <User className="w-4 h-4" /> },
  { value: 'feature_request', label: 'Feature Request', icon: <Lightbulb className="w-4 h-4" /> },
  { value: 'bug_report', label: 'Bug Report', icon: <Bug className="w-4 h-4" /> },
  { value: 'general', label: 'General Question', icon: <HelpIcon className="w-4 h-4" /> },
];

// Main Public Support Page Component
export default function PublicSupportPage() {
  const intl = useIntl();
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const [formData, setFormData] = useState<SupportFormData>({
    name: '',
    email: '',
    company: '',
    supportType: 'general',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // FAQ Data
  const faqs = [
    {
      question: intl.formatMessage({ id: 'support.faq.gettingStarted.question' }),
      answer: intl.formatMessage({ id: 'support.faq.gettingStarted.answer' }),
    },
    {
      question: intl.formatMessage({ id: 'support.faq.inviteMembers.question' }),
      answer: intl.formatMessage({ id: 'support.faq.inviteMembers.answer' }),
    },
    {
      question: intl.formatMessage({ id: 'support.faq.fileStorage.question' }),
      answer: intl.formatMessage({ id: 'support.faq.fileStorage.answer' }),
    },
    {
      question: intl.formatMessage({ id: 'support.faq.videoCall.question' }),
      answer: intl.formatMessage({ id: 'support.faq.videoCall.answer' }),
    },
    {
      question: intl.formatMessage({ id: 'support.faq.security.question' }),
      answer: intl.formatMessage({ id: 'support.faq.security.answer' }),
    },
    {
      question: intl.formatMessage({ id: 'support.faq.billing.question' }),
      answer: intl.formatMessage({ id: 'support.faq.billing.answer' }),
    },
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSupportTypeChange = (value: SupportType) => {
    setFormData({
      ...formData,
      supportType: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      await supportApi.submitSupportRequest(formData);
      setSubmitStatus('success');
      // Reset form after successful submission
      setFormData({
        name: '',
        email: '',
        company: '',
        supportType: 'general',
        subject: '',
        message: '',
      });
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to send your request. Please try again.'
      );
      console.error('Support form error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <PageSEO
        title={intl.formatMessage({ id: 'support.seo.title' })}
        description={intl.formatMessage({ id: 'support.seo.description' })}
      />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent dark:from-blue-900/20" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/30 mb-6">
              <HelpCircle className="w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
              {intl.formatMessage({ id: 'support.title' })}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {intl.formatMessage({ id: 'support.description' })}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Support Form Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Support Form */}
              <Card className="border-gray-200 dark:border-gray-700 shadow-lg">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    {intl.formatMessage({ id: 'support.form.title' })}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name and Email Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">
                          {intl.formatMessage({ id: 'support.form.name' })} *
                        </Label>
                        <Input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          placeholder={intl.formatMessage({ id: 'support.form.namePlaceholder' })}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          {intl.formatMessage({ id: 'support.form.email' })} *
                        </Label>
                        <Input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          placeholder={intl.formatMessage({ id: 'support.form.emailPlaceholder' })}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Company */}
                    <div className="space-y-2">
                      <Label htmlFor="company">
                        {intl.formatMessage({ id: 'support.form.company' })}
                      </Label>
                      <Input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder={intl.formatMessage({ id: 'support.form.companyPlaceholder' })}
                        className="w-full"
                      />
                    </div>

                    {/* Support Type Dropdown */}
                    <div className="space-y-2">
                      <Label htmlFor="supportType">
                        {intl.formatMessage({ id: 'support.form.supportType' })} *
                      </Label>
                      <Select
                        value={formData.supportType}
                        onValueChange={handleSupportTypeChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={intl.formatMessage({ id: 'support.form.supportTypePlaceholder' })} />
                        </SelectTrigger>
                        <SelectContent>
                          {supportTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                {type.icon}
                                <span>{intl.formatMessage({ id: `support.form.supportTypes.${type.value}` })}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject">
                        {intl.formatMessage({ id: 'support.form.subject' })} *
                      </Label>
                      <Input
                        type="text"
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder={intl.formatMessage({ id: 'support.form.subjectPlaceholder' })}
                        className="w-full"
                      />
                    </div>

                    {/* Message / Report */}
                    <div className="space-y-2">
                      <Label htmlFor="message">
                        {intl.formatMessage({ id: 'support.form.message' })} *
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        rows={6}
                        required
                        value={formData.message}
                        onChange={handleChange}
                        placeholder={intl.formatMessage({ id: 'support.form.messagePlaceholder' })}
                        className="w-full resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          {intl.formatMessage({ id: 'support.form.sending' })}
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          {intl.formatMessage({ id: 'support.form.submit' })}
                        </>
                      )}
                    </Button>

                    {/* Success Message */}
                    {submitStatus === 'success' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3"
                      >
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-green-700 dark:text-green-300">
                          {intl.formatMessage({ id: 'support.form.successMessage' })}
                        </span>
                      </motion.div>
                    )}

                    {/* Error Message */}
                    {submitStatus === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3"
                      >
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <span className="text-red-700 dark:text-red-300">{errorMessage}</span>
                      </motion.div>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <div className="space-y-8">
                {/* Contact Details Card */}
                <Card className="border-gray-200 dark:border-gray-700">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      {intl.formatMessage({ id: 'support.contact.title' })}
                    </h3>
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {intl.formatMessage({ id: 'support.contact.emailLabel' })}
                          </p>
                          <a
                            href="mailto:support@deskive.com"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            support@deskive.com
                          </a>
                        </div>
                      </div>
                    </div>
                    <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                      {intl.formatMessage({ id: 'support.contact.description' })}
                    </p>
                  </CardContent>
                </Card>

                {/* Response Time Card */}
                <Card className="border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      {intl.formatMessage({ id: 'support.responseTime.title' })}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">
                          {intl.formatMessage({ id: 'support.responseTime.general' })}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">24-48 hours</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">
                          {intl.formatMessage({ id: 'support.responseTime.technical' })}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">12-24 hours</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300">
                          {intl.formatMessage({ id: 'support.responseTime.critical' })}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">4-8 hours</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {intl.formatMessage({ id: 'support.faq.title' })}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {intl.formatMessage({ id: 'support.faq.description' })}
              </p>
            </div>

            <Card className="border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-6">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {faqs.map((faq, index) => (
                    <FAQItem
                      key={index}
                      question={faq.question}
                      answer={faq.answer}
                      isOpen={openFAQ === index}
                      onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
