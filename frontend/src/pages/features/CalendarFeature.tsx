import { Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { PageSEO } from '../../components/seo'
import {
  Calendar, 
  Clock, 
  Bell, 
  Users,
  CalendarDays,
  MapPin,
  Repeat,
  CheckCircle,
  ArrowRight,
  Smartphone,
  Briefcase
} from 'lucide-react'

export default function CalendarFeature() {
  const intl = useIntl()
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <PageSEO
        title={intl.formatMessage({ id: 'featurePages.calendar.title' })}
        description={intl.formatMessage({ id: 'featurePages.calendar.description' })}
        keywords={['smart calendar', 'scheduling', 'time management', 'meeting scheduler', 'calendar app', 'event management']}
        ogImage="/og-images/features/calendar.png"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Calendar className="w-8 h-8" />
              </div>
              <span className="text-lg font-semibold text-emerald-100">{intl.formatMessage({ id: 'featurePages.calendar.badge' })}</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">{intl.formatMessage({ id: 'featurePages.calendar.heroTitle' })}</h1>
            <p className="text-xl mb-8 text-emerald-50">
              AI-powered calendar management with smart scheduling, automatic conflict resolution, 
              and seamless integration across all your devices and platforms.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-gray-100">
                <Link to="/auth/register">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                <Link to="/contact">Request Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Calendar Intelligence at Its Best</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Let AI handle the complexity while you focus on what matters most
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Clock className="w-10 h-10 text-emerald-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-gray-600 dark:text-gray-400">
                AI automatically finds the best meeting times based on preferences and availability
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Bell className="w-10 h-10 text-teal-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Intelligent Reminders</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Context-aware notifications that adapt to your schedule and priorities
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Users className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Team Coordination</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Effortlessly coordinate with team members and find mutual availability
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <CalendarDays className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Multiple Views</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Day, week, month, and custom views with powerful filtering and search
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <MapPin className="w-10 h-10 text-red-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Location Intelligence</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Automatic travel time calculation and location-based scheduling
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Repeat className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Recurring Events</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Flexible recurring patterns with smart conflict detection and resolution
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-gray-100 dark:bg-gray-900 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Perfect for Every Schedule</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                From busy executives to creative teams, organize your time effectively
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Briefcase className="w-8 h-8 text-emerald-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Professionals</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Schedule meetings across time zones effortlessly</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Block focus time for deep work automatically</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Manage multiple calendars in one unified view</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Get insights on time allocation and productivity</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Smartphone className="w-8 h-8 text-teal-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Teams</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Share calendars with flexible permission controls</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Book shared resources and meeting rooms</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Coordinate project deadlines and milestones</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Sync with project management tools seamlessly</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Works With Everything</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
            Seamlessly integrate with your existing calendar and productivity tools
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">GC</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Google Calendar</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">OL</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Outlook</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">ZM</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Zoom</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">SL</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Slack</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              Take Control of Your Time Today
            </h2>
            <p className="text-xl mb-8 text-emerald-50">
              Join millions of users who've transformed their productivity with smart scheduling
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-gray-100">
                <Link to="/auth/register">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                <Link to="/features">
                  Explore All Features <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}