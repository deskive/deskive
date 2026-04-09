import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  Send,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { api } from '@/lib/fetch';

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

const ModernContact: React.FC = () => {
  const intl = useIntl();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Email validation regex
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = intl.formatMessage({ id: 'contact.form.error.nameRequired', defaultMessage: 'Name is required' });
    } else if (formData.name.trim().length < 2) {
      errors.name = intl.formatMessage({ id: 'contact.form.error.nameMinLength', defaultMessage: 'Name must be at least 2 characters' });
    }

    if (!formData.email.trim()) {
      errors.email = intl.formatMessage({ id: 'contact.form.error.emailRequired', defaultMessage: 'Email is required' });
    } else if (!isValidEmail(formData.email)) {
      errors.email = intl.formatMessage({ id: 'contact.form.error.emailInvalid', defaultMessage: 'Please enter a valid email address' });
    }

    if (!formData.subject) {
      errors.subject = intl.formatMessage({ id: 'contact.form.error.subjectRequired', defaultMessage: 'Please select a topic' });
    }

    if (!formData.message.trim()) {
      errors.message = intl.formatMessage({ id: 'contact.form.error.messageRequired', defaultMessage: 'Message is required' });
    } else if (formData.message.trim().length < 10) {
      errors.message = intl.formatMessage({ id: 'contact.form.error.messageMinLength', defaultMessage: 'Message must be at least 10 characters' });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('idle');
    setErrorMessage('');

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Send contact form to backend API - NO AUTH REQUIRED
      await api.post('/contact', formData, { requireAuth: false });

      setSubmitStatus('success');
      setFormErrors({});
      // Reset form after successful submission
      setFormData({
        name: '',
        email: '',
        company: '',
        subject: '',
        message: '',
      });
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error: any) {
      setSubmitStatus('error');
      const message = error?.response?.data?.message || error?.message || 'Failed to send message. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error for this field when user starts typing
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors({
        ...formErrors,
        [name]: undefined
      });
    }
  };


  return (
    <section id="contact" className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-sky-600 font-semibold text-lg mb-4"
          >
            {intl.formatMessage({ id: 'contact.badge' })}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6"
          >
            {intl.formatMessage({ id: 'contact.title' })}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            {intl.formatMessage({ id: 'contact.subtitle' })}
          </motion.p>
        </div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-white border border-gray-200 rounded-3xl p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                    {intl.formatMessage({ id: 'contact.form.name' })} *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all ${
                      formErrors.name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder={intl.formatMessage({ id: 'contact.form.namePlaceholder' })}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                    {intl.formatMessage({ id: 'contact.form.email' })} *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all ${
                      formErrors.email ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder={intl.formatMessage({ id: 'contact.form.emailPlaceholder' })}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-semibold text-gray-900 mb-2">
                  {intl.formatMessage({ id: 'contact.form.company' })}
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  placeholder={intl.formatMessage({ id: 'contact.form.companyPlaceholder' })}
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-semibold text-gray-900 mb-2">
                  {intl.formatMessage({ id: 'contact.form.subject' })} *
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all ${
                    formErrors.subject ? 'border-red-500' : 'border-gray-200'
                  }`}
                >
                  <option value="">{intl.formatMessage({ id: 'contact.form.selectTopic' })}</option>
                  <option value="general">{intl.formatMessage({ id: 'contact.form.subjectGeneral' })}</option>
                  <option value="sales">{intl.formatMessage({ id: 'contact.form.subjectSales' })}</option>
                  <option value="support">{intl.formatMessage({ id: 'contact.form.subjectSupport' })}</option>
                  <option value="partnership">{intl.formatMessage({ id: 'contact.form.subjectPartnership' })}</option>
                  <option value="other">{intl.formatMessage({ id: 'contact.form.subjectOther' })}</option>
                </select>
                {formErrors.subject && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.subject}</p>
                )}
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-900 mb-2">
                  {intl.formatMessage({ id: 'contact.form.message' })} *
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all resize-none ${
                    formErrors.message ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder={intl.formatMessage({ id: 'contact.form.messagePlaceholder' })}
                />
                {formErrors.message && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className={`w-full group bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold border-0 hover:scale-105 transition-all duration-300 flex items-center justify-center ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="ml-2">{intl.formatMessage({ id: 'contact.form.submitting' })}</span>
                  </>
                ) : (
                  <>
                    {intl.formatMessage({ id: 'contact.form.submit' })}
                    <Send className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>

              {/* Success Message */}
              {submitStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 font-medium">{intl.formatMessage({ id: 'contact.form.success' })}</span>
                </motion.div>
              )}

              {/* Error Message */}
              {submitStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-800 font-medium">{errorMessage}</span>
                </motion.div>
              )}
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ModernContact;
