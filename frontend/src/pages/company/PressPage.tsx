/**
 * PressPage Component
 * Company press page with press releases, media kit, and brand guidelines
 */

import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  FileText, 
  Download, 
  ExternalLink, 
  Calendar,
  Eye,
  Share2,
  Image as ImageIcon,
  Palette,
  Type,
  Video,
  Mail,
  Phone,
  Globe,
  ArrowRight,
  Award,
  TrendingUp,
  Users
} from 'lucide-react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { PageSEO } from '../../components/seo';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

interface PressRelease {
  id: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  readTime: string;
  views: string;
}

interface MediaAsset {
  id: string;
  title: string;
  type: 'logo' | 'screenshot' | 'icon' | 'brand';
  format: string;
  size: string;
  description: string;
}

const pressReleases: PressRelease[] = [
  {
    id: 'series-b-funding',
    title: 'Deskive Raises $25M Series B to Accelerate AI-Powered Collaboration Features',
    date: 'March 15, 2024',
    category: 'Funding',
    summary: 'Leading collaboration platform secures funding from Sequoia Capital and Andreessen Horowitz to enhance AI capabilities and expand global reach.',
    readTime: '3 min read',
    views: '12.5K'
  },
  {
    id: 'enterprise-milestone',
    title: 'Deskive Reaches 10,000 Enterprise Customers Worldwide',
    date: 'February 28, 2024',
    category: 'Milestone',
    summary: 'Company celebrates major customer milestone while announcing new enterprise features including advanced security and compliance tools.',
    readTime: '2 min read',
    views: '8.2K'
  },
  {
    id: 'ai-assistant-launch',
    title: 'Introducing Deskive AI: Revolutionary Assistant for Team Productivity',
    date: 'January 22, 2024',
    category: 'Product Launch',
    summary: 'New AI-powered assistant helps teams automate routine tasks, generate insights, and streamline workflows with natural language commands.',
    readTime: '4 min read',
    views: '15.7K'
  },
  {
    id: 'security-certification',
    title: 'Deskive Achieves SOC 2 Type II and ISO 27001 Certifications',
    date: 'December 18, 2023',
    category: 'Security',
    summary: 'Platform demonstrates commitment to enterprise security with industry-leading certifications and enhanced data protection measures.',
    readTime: '2 min read',
    views: '6.8K'
  }
];

const mediaAssets: MediaAsset[] = [
  {
    id: 'primary-logo',
    title: 'Primary Logo',
    type: 'logo',
    format: 'PNG, SVG',
    size: '2.4 MB',
    description: 'High-resolution primary logo in dark and light variants'
  },
  {
    id: 'logo-variations',
    title: 'Logo Variations',
    type: 'logo',
    format: 'PNG, SVG',
    size: '5.1 MB',
    description: 'Logo variations including icon-only, horizontal, and stacked versions'
  },
  {
    id: 'product-screenshots',
    title: 'Product Screenshots',
    type: 'screenshot',
    format: 'PNG, JPG',
    size: '18.7 MB',
    description: 'High-quality screenshots of key platform features and interfaces'
  },
  {
    id: 'brand-colors',
    title: 'Brand Colors & Fonts',
    type: 'brand',
    format: 'PDF, ASE',
    size: '890 KB',
    description: 'Complete brand guidelines including color palette and typography'
  },
  {
    id: 'app-icons',
    title: 'App Icons',
    type: 'icon',
    format: 'PNG, ICO',
    size: '1.2 MB',
    description: 'Application icons in various sizes and formats for different platforms'
  },
  {
    id: 'demo-videos',
    title: 'Product Demo Videos',
    type: 'screenshot',
    format: 'MP4, MOV',
    size: '125 MB',
    description: 'Professional product demonstration videos and feature highlights'
  }
];

const awards = [
  {
    title: 'Best Collaboration Tool 2024',
    organization: 'TechCrunch',
    date: '2024'
  },
  {
    title: 'Top 50 SaaS Companies',
    organization: 'Forbes',
    date: '2024'
  },
  {
    title: 'Innovation Award',
    organization: 'Product Hunt',
    date: '2023'
  }
];

export default function PressPage() {
  const intl = useIntl();

  return (
    <PublicLayout>
      <PageSEO
        title="Press & Media - Latest News and Resources"
        description="Access Deskive's press releases, media kit, brand assets, and company news. Download logos, screenshots, and high-resolution images for media coverage."
        keywords={['press', 'media', 'news', 'media kit', 'brand assets', 'press releases']}
      />
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <section className="py-20 lg:py-32 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 rounded-full px-4 py-2 mb-6"
              >
                <FileText className="h-4 w-4 text-cyan-400" />
                <span className="text-cyan-300 font-medium">Press Center</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                Latest News &
                <span 
                  className="block"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Media Resources
                </span>
              </h1>
              <p className="text-xl text-white/70 max-w-3xl mx-auto mb-8">
                Stay updated with the latest Deskive news, announcements, and access our comprehensive media kit 
                for journalists and partners.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0"
                  onClick={() => document.getElementById('press-releases')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Latest News
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => document.getElementById('media-kit')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Media Kit
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, amount: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
            >
              <div className="glass-effect glass-card-hover border-white/10 rounded-2xl p-8">
                <TrendingUp className="h-8 w-8 text-cyan-400 mx-auto mb-4" />
                <div 
                  className="text-3xl font-bold mb-2"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  300%
                </div>
                <p className="text-white/70">Growth in 2023</p>
              </div>
              
              <div className="glass-effect glass-card-hover border-white/10 rounded-2xl p-8">
                <Users className="h-8 w-8 text-cyan-400 mx-auto mb-4" />
                <div 
                  className="text-3xl font-bold mb-2"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  10K+
                </div>
                <p className="text-white/70">Enterprise Customers</p>
              </div>
              
              <div className="glass-effect glass-card-hover border-white/10 rounded-2xl p-8">
                <Award className="h-8 w-8 text-cyan-400 mx-auto mb-4" />
                <div 
                  className="text-3xl font-bold mb-2"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  $25M
                </div>
                <p className="text-white/70">Series B Raised</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Press Releases */}
        <section id="press-releases" className="py-20 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, amount: 0.3 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Press Releases
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                Latest announcements and company news from Deskive
              </p>
            </motion.div>

            <div className="space-y-6">
              {pressReleases.map((release, index) => (
                <motion.div
                  key={release.id}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <Card className="glass-effect glass-card-hover border-white/10">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-300 border border-cyan-500/30">
                              {release.category}
                            </span>
                            <div className="flex items-center gap-4 text-sm text-white/60">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{release.date}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                <span>{release.views} views</span>
                              </div>
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-semibold text-white mb-3 line-clamp-2">
                            {release.title}
                          </h3>
                          
                          <p className="text-white/70 mb-4 line-clamp-2">{release.summary}</p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/50">{release.readTime}</span>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm"
                                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0"
                              >
                                Read More
                                <ExternalLink className="ml-2 h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm"
                                variant="ghost" 
                                className="text-white/60 hover:text-white hover:bg-white/10"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Awards & Recognition */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, amount: 0.3 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Awards & Recognition
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                Industry recognition for innovation and excellence
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {awards.map((award, index) => (
                <motion.div
                  key={award.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <Card className="glass-effect glass-card-hover border-white/10 h-full">
                    <CardContent className="p-6 text-center">
                      <Award className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">{award.title}</h3>
                      <p className="text-white/70 mb-1">{award.organization}</p>
                      <p className="text-white/50 text-sm">{award.date}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Media Kit */}
        <section id="media-kit" className="py-20 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, amount: 0.3 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Media Kit
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                Download high-quality assets including logos, screenshots, and brand guidelines
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mediaAssets.map((asset, index) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <Card className="glass-effect glass-card-hover border-white/10 h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        {asset.type === 'logo' && <ImageIcon className="h-6 w-6 text-cyan-400" />}
                        {asset.type === 'screenshot' && <Video className="h-6 w-6 text-cyan-400" />}
                        {asset.type === 'icon' && <Palette className="h-6 w-6 text-cyan-400" />}
                        {asset.type === 'brand' && <Type className="h-6 w-6 text-cyan-400" />}
                        <div>
                          <h3 className="text-lg font-semibold text-white">{asset.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-white/60">
                            <span>{asset.format}</span>
                            <span>•</span>
                            <span>{asset.size}</span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-white/70 mb-4 text-sm">{asset.description}</p>
                      
                      <Button 
                        className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true, amount: 0.3 }}
              className="text-center mt-12"
            >
              <Card className="glass-effect border-white/10 inline-block">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Complete Media Kit</h3>
                  <p className="text-white/70 mb-4">Download everything in one package</p>
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Full Kit (45 MB)
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Brand Guidelines */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, amount: 0.3 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Brand Guidelines
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                Guidelines for using Deskive brand assets correctly and consistently
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, amount: 0.3 }}
              >
                <Card className="glass-effect border-white/10">
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-semibold text-white mb-6">Usage Guidelines</h3>
                    <div className="space-y-4 text-white/70">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                        <p>Use official logos and assets provided in the media kit</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                        <p>Maintain minimum clear space around logos</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                        <p>Don't modify colors, fonts, or proportions</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                        <p>Use high-contrast backgrounds for readability</p>
                      </div>
                    </div>
                    <Button 
                      className="mt-6 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0"
                    >
                      View Full Guidelines
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, amount: 0.3 }}
                className="space-y-6"
              >
                <Card className="glass-effect border-white/10">
                  <CardContent className="p-6">
                    <h4 className="text-lg font-semibold text-white mb-3">Primary Colors</h4>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg mb-2"></div>
                        <p className="text-xs text-white/70">#06B6D4</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-slate-900 rounded-lg mb-2"></div>
                        <p className="text-xs text-white/70">#0F172A</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-white rounded-lg mb-2"></div>
                        <p className="text-xs text-white/70">#FFFFFF</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-effect border-white/10">
                  <CardContent className="p-6">
                    <h4 className="text-lg font-semibold text-white mb-3">Typography</h4>
                    <div className="text-white/70">
                      <p className="font-bold mb-1">Inter (Primary)</p>
                      <p className="text-sm">Headings, UI elements, and body text</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Press Contact */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, amount: 0.3 }}
              className="text-center p-12 rounded-3xl glass-effect border-white/10"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Press Inquiries
              </h2>
              <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
                For media inquiries, interviews, or additional information, please contact our press team
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <Mail className="h-8 w-8 text-cyan-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-1">Email</h3>
                  <p className="text-white/70">press@deskive.com</p>
                </div>
                <div className="text-center">
                  <Phone className="h-8 w-8 text-cyan-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-1">Phone</h3>
                  <p className="text-white/70">+1 (555) 123-4567</p>
                </div>
                <div className="text-center">
                  <Globe className="h-8 w-8 text-cyan-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-1">Response Time</h3>
                  <p className="text-white/70">Within 24 hours</p>
                </div>
              </div>
              
              <Button
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0"
                onClick={() => window.open('mailto:press@deskive.com?subject=Press Inquiry', '_blank')}
              >
                Contact Press Team
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}