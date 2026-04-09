/**
 * CareersPage Component
 * Company careers page showing job openings, company culture, and benefits
 */

import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  Users,
  MapPin,
  Clock,
  Briefcase,
  Heart,
  Coffee,
  Laptop,
  GraduationCap,
  Plane,
  Shield,
  Zap,
  Target,
  Award,
  Globe,
  ArrowRight,
  Star,
  ChevronRight
} from 'lucide-react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { PageSEO } from '../../components/seo';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
  posted: string;
}

const jobOpenings: JobOpening[] = [
  {
    id: 'senior-frontend-dev',
    title: 'Senior Frontend Developer',
    department: 'Engineering',
    location: 'San Francisco, CA / Remote',
    type: 'Full-time',
    description: 'Join our frontend team to build beautiful, responsive interfaces for our collaboration platform using React, TypeScript, and modern web technologies.',
    requirements: [
      '5+ years of React/TypeScript experience',
      'Experience with state management (Redux, Zustand)',
      'Strong CSS skills and design sensibility',
      'Experience with testing frameworks'
    ],
    posted: '2 days ago'
  },
  {
    id: 'product-manager',
    title: 'Senior Product Manager',
    department: 'Product',
    location: 'New York, NY / Remote',
    type: 'Full-time',
    description: 'Lead product strategy and roadmap for our core collaboration features, working closely with engineering and design teams.',
    requirements: [
      '4+ years of product management experience',
      'SaaS/B2B product experience',
      'Strong analytical and data-driven mindset',
      'Excellent communication skills'
    ],
    posted: '1 week ago'
  },
  {
    id: 'backend-engineer',
    title: 'Backend Engineer',
    department: 'Engineering',
    location: 'Austin, TX / Remote',
    type: 'Full-time',
    description: 'Build scalable APIs and services that power our collaboration platform, working with Node.js, Python, and cloud technologies.',
    requirements: [
      '3+ years of backend development experience',
      'Experience with Node.js, Python, or Go',
      'Database design and optimization skills',
      'Cloud platform experience (AWS, GCP, Azure)'
    ],
    posted: '3 days ago'
  },
  {
    id: 'ux-designer',
    title: 'UX Designer',
    department: 'Design',
    location: 'Remote',
    type: 'Full-time',
    description: 'Design intuitive user experiences for our collaboration tools, conducting user research and creating prototypes.',
    requirements: [
      '3+ years of UX design experience',
      'Proficiency in Figma, Sketch, or similar tools',
      'User research and usability testing experience',
      'Portfolio showcasing design process'
    ],
    posted: '5 days ago'
  },
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    department: 'Engineering',
    location: 'Seattle, WA / Remote',
    type: 'Full-time',
    description: 'Build and maintain our infrastructure, CI/CD pipelines, and monitoring systems to ensure reliable service delivery.',
    requirements: [
      '4+ years of DevOps/Infrastructure experience',
      'Kubernetes and Docker expertise',
      'CI/CD pipeline design and implementation',
      'Monitoring and observability tools'
    ],
    posted: '1 week ago'
  },
  {
    id: 'customer-success',
    title: 'Customer Success Manager',
    department: 'Customer Success',
    location: 'Chicago, IL / Remote',
    type: 'Full-time',
    description: 'Help our enterprise customers succeed with Deskive, driving adoption, retention, and growth within existing accounts.',
    requirements: [
      '3+ years of customer success experience',
      'B2B SaaS experience preferred',
      'Strong relationship building skills',
      'Data-driven approach to customer health'
    ],
    posted: '4 days ago'
  }
];

const companyValues = [
  {
    icon: Target,
    title: 'Mission-Driven',
    description: 'We believe in empowering teams to do their best work through seamless collaboration.'
  },
  {
    icon: Heart,
    title: 'People-First',
    description: 'Our team members are our greatest asset. We invest in their growth and well-being.'
  },
  {
    icon: Zap,
    title: 'Innovation',
    description: 'We constantly push boundaries to create better solutions for modern teams.'
  },
  {
    icon: Globe,
    title: 'Global Impact',
    description: 'We serve teams worldwide and embrace diverse perspectives and cultures.'
  }
];

const benefits = [
  {
    icon: Shield,
    title: 'Comprehensive Health',
    description: 'Medical, dental, vision insurance with 100% premium coverage for employees'
  },
  {
    icon: Plane,
    title: 'Unlimited PTO',
    description: 'Take the time you need to recharge with our flexible time-off policy'
  },
  {
    icon: Laptop,
    title: 'Work From Anywhere',
    description: 'Remote-first culture with optional co-working space stipends'
  },
  {
    icon: GraduationCap,
    title: 'Learning Budget',
    description: '$2,500 annual budget for conferences, courses, and professional development'
  },
  {
    icon: Coffee,
    title: 'Wellness Perks',
    description: 'Gym membership, mental health support, and quarterly team retreats'
  },
  {
    icon: Award,
    title: 'Equity Package',
    description: 'Competitive equity compensation to share in our company success'
  }
];

export default function CareersPage() {
  const intl = useIntl();

  return (
    <PublicLayout>
      <PageSEO
        title="Careers - Join Our Team at Deskive"
        description="Join Deskive's mission to transform team collaboration. Explore open positions in engineering, product, design, and more. Remote-first culture with comprehensive benefits."
        keywords={['careers', 'jobs', 'hiring', 'remote work', 'tech jobs', 'software jobs']}
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
                <Users className="h-4 w-4 text-cyan-400" />
                <span className="text-cyan-300 font-medium">
                  {intl.formatMessage({ id: 'company.careers.hero.badge' })}
                </span>
              </motion.div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                {intl.formatMessage({ id: 'company.careers.hero.title' })}
                <span
                  className="block"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {intl.formatMessage({ id: 'company.careers.hero.titleHighlight' })}
                </span>
              </h1>
              <p className="text-xl text-white/70 max-w-3xl mx-auto mb-8">
                {intl.formatMessage({ id: 'company.careers.hero.subtitle' })}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0"
                  onClick={() => document.getElementById('open-positions')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {intl.formatMessage({ id: 'company.careers.hero.cta' })}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 text-white/60">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span>{intl.formatMessage({ id: 'company.careers.hero.rating' })}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Company Values */}
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
                {intl.formatMessage({ id: 'company.careers.values.title' })}
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                {intl.formatMessage({ id: 'company.careers.values.subtitle' })}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {companyValues.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <Card className="glass-effect glass-card-hover border-white/10 h-full">
                    <CardContent className="p-6 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-full mb-4">
                        <value.icon className="h-6 w-6 text-cyan-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">{value.title}</h3>
                      <p className="text-white/70">{value.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits & Perks */}
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
                {intl.formatMessage({ id: 'company.careers.benefits.title' })}
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                {intl.formatMessage({ id: 'company.careers.benefits.subtitle' })}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <Card className="glass-effect glass-card-hover border-white/10 h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-lg flex items-center justify-center">
                          <benefit.icon className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                          <p className="text-white/70">{benefit.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section id="open-positions" className="py-20 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, amount: 0.3 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {intl.formatMessage({ id: 'company.careers.positions.title' })}
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                {intl.formatMessage({ id: 'company.careers.positions.subtitle' })}
              </p>
            </motion.div>

            <div className="space-y-6">
              {jobOpenings.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <Card className="glass-effect glass-card-hover border-white/10">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-xl font-semibold text-white mb-1">{job.title}</h3>
                              <div className="flex items-center gap-4 text-sm text-white/60">
                                <div className="flex items-center gap-1">
                                  <Briefcase className="h-4 w-4" />
                                  <span>{job.department}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{job.location}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{job.type}</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">
                              {job.posted}
                            </span>
                          </div>
                          
                          <p className="text-white/70 mb-4">{job.description}</p>
                          
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-white mb-2">Key Requirements:</h4>
                            <ul className="text-sm text-white/70 space-y-1">
                              {job.requirements.slice(0, 3).map((req, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <ChevronRight className="h-3 w-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                                  <span>{req}</span>
                                </li>
                              ))}
                              {job.requirements.length > 3 && (
                                <li className="text-white/50">
                                  +{job.requirements.length - 3} more requirements
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                          <Button 
                            className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0"
                            onClick={() => window.open(`mailto:careers@deskive.com?subject=Application for ${job.title}`, '_blank')}
                          >
                            Apply Now
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            Learn More
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Application Process */}
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
                {intl.formatMessage({ id: 'company.careers.hiringProcess.title' })}
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                {intl.formatMessage({ id: 'company.careers.hiringProcess.subtitle' })}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { step: '1', title: 'Application', description: 'Submit your application with resume and cover letter' },
                { step: '2', title: 'Phone Screen', description: '30-minute call with our recruiting team' },
                { step: '3', title: 'Technical Interview', description: 'Role-specific technical assessment and discussion' },
                { step: '4', title: 'Final Interview', description: 'Meet with team members and hiring manager' }
              ].map((process, index) => (
                <motion.div
                  key={process.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true, amount: 0.3 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full text-white font-bold text-lg mb-4">
                    {process.step}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{process.title}</h3>
                  <p className="text-white/70">{process.description}</p>
                  {index < 3 && (
                    <div className="hidden md:block absolute top-6 left-full w-8 h-0.5 bg-gradient-to-r from-cyan-500/50 to-transparent transform -translate-x-4" 
                         style={{ zIndex: -1 }} />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
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
                {intl.formatMessage({ id: 'company.careers.noRole.title' })}
              </h2>
              <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
                {intl.formatMessage({ id: 'company.careers.noRole.subtitle' })}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0"
                  onClick={() => window.open('mailto:careers@deskive.com?subject=General Application', '_blank')}
                >
                  {intl.formatMessage({ id: 'company.careers.noRole.cta' })}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <span className="text-white/60 text-sm">{intl.formatMessage({ id: 'company.careers.noRole.info' })}</span>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}