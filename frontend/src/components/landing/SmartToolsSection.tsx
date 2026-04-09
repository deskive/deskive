import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { Button } from '../ui/button';
import {
  Brain,
  Sparkles,
  Search,
  MessageCircle,
  FileText,
  Zap,
  ArrowRight,
  Globe,
  Github,
  Chrome,
  Database,
  Mail,
  Calendar
} from 'lucide-react';

const SmartToolsSection: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();

  return (
    <section className="py-20 md:py-32 bg-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          style={{
            backgroundImage: `
              linear-gradient(rgba(168, 85, 247, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(168, 85, 247, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
          className="w-full h-full"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-sky-600 font-semibold text-lg mb-4"
          >
            {intl.formatMessage({ id: 'smartTools.badge' })}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6"
          >
            {intl.formatMessage({ id: 'smartTools.title' })}{' '}
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              {intl.formatMessage({ id: 'smartTools.titleHighlight' })}
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-gray-600"
          >
            {intl.formatMessage({ id: 'smartTools.subtitle' })}
          </motion.p>
        </div>

        {/* AI Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-7xl mx-auto">
            {/* Left - AI Image */}
            <div className="relative">
              <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
                {/* Browser Chrome */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4 flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 bg-white rounded-lg px-4 py-2 text-sm text-gray-600 font-medium shadow-sm">
                    https://deskive.com/ai
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <Brain className="w-4 h-4 text-sky-600" />
                    </div>
                  </div>
                </div>

                {/* Image Preview */}
                <div className="relative bg-gray-900">
                  <img
                    src="https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1400&h=900&fit=crop&q=90"
                    alt="Deskive AI Assistant"
                    className="w-full h-auto object-cover"
                    style={{ aspectRatio: '16/10' }}
                  />

                  {/* Overlay with Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-lg">
                          Deskive Brain
                        </h4>
                        <p className="text-sm text-white/80">
                          AI-powered assistant for all your work
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Badge */}
                  <div className="absolute top-6 right-6 bg-gradient-to-r from-sky-500 to-blue-600 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                    <Sparkles className="w-4 h-4 text-white" />
                    <span className="text-white text-sm font-semibold">AI Powered</span>
                  </div>
                </div>
              </div>

              {/* Glow Effect */}
              <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-sky-500/20 to-blue-500/20 blur-3xl opacity-50"></div>
            </div>

            {/* Right - Content */}
            <div>
              <motion.p
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-sky-600 font-bold text-lg mb-4"
              >
                {intl.formatMessage({ id: 'productPages.chat.badge' })}
              </motion.p>
              <motion.h3
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-black text-gray-900 mb-6"
              >
                {intl.formatMessage({ id: 'productPages.chat.title' })}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-xl text-gray-600 mb-8"
              >
                {intl.formatMessage({ id: 'productPages.chat.subtitle' })}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="flex flex-wrap gap-4"
              >
                <Button
                  onClick={() => navigate('/ai')}
                  className="group bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold border-0 hover:scale-105 transition-all duration-300"
                >
                  {intl.formatMessage({ id: 'hero.cta.tryFree' })}
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  onClick={() => navigate('/ai')}
                  className="group bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold border-0 hover:scale-105 transition-all duration-300"
                >
                  Learn more
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Connected Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-7xl mx-auto">
            {/* Left - Content */}
            <div className="lg:order-2">
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-sky-600 font-bold text-lg mb-4"
              >
                {intl.formatMessage({ id: 'productPages.files.badge' })}
              </motion.p>
              <motion.h3
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-black text-gray-900 mb-6"
              >
                {intl.formatMessage({ id: 'productPages.files.title' })}
                <br />
                {intl.formatMessage({ id: 'productPages.files.titleHighlight' })}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-xl text-gray-600 mb-8"
              >
                {intl.formatMessage({ id: 'productPages.files.subtitle' })}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <Button
                  onClick={() => navigate('/files')}
                  className="group bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold border-0 hover:scale-105 transition-all duration-300"
                >
                  {intl.formatMessage({ id: 'productPages.files.cta' })}
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
            </div>

            {/* Right - Search Image */}
            <div className="lg:order-1">
              <div className="relative">
                <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
                  {/* Browser Chrome */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4 flex items-center gap-3">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex-1 bg-white rounded-lg px-4 py-2 text-sm text-gray-600 font-medium shadow-sm">
                      https://deskive.com/search
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <Search className="w-4 h-4 text-sky-600" />
                      </div>
                    </div>
                  </div>

                  {/* Image Preview */}
                  <div className="relative bg-gray-900">
                    <img
                      src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&h=900&fit=crop&q=90"
                      alt="Connected Search"
                      className="w-full h-auto object-cover"
                      style={{ aspectRatio: '16/10' }}
                    />

                    {/* Overlay with Info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Search className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg">
                            Connected Search
                          </h4>
                          <p className="text-sm text-white/80">
                            Search across all your apps from one place
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Search Badge */}
                    <div className="absolute top-6 right-6 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                      <Zap className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-semibold">Universal Search</span>
                    </div>
                  </div>
                </div>

                {/* Glow Effect */}
                <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-3xl opacity-50"></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SmartToolsSection;
