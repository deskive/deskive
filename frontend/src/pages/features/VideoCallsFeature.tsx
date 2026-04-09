import { Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { PageSEO } from '../../components/seo'
import {
  Video,
  Mic,
  Monitor,
  Users,
  Settings,
  Shield,
  Globe,
  CheckCircle,
  ArrowRight,
  Phone,
  Camera
} from 'lucide-react'

export default function VideoCallsFeature() {
  const intl = useIntl()
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <PageSEO
        title="Video Conferencing - Crystal Clear Video Calls"
        description="Professional video conferencing with HD quality, screen sharing, recording, and breakout rooms. Connect face-to-face from anywhere."
        keywords={['video conferencing', 'video calls', 'online meetings', 'screen sharing', 'video chat', 'webinar']}
        ogImage="/og-images/features/video-calls.png"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cyan-600 to-blue-700 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Video className="w-8 h-8" />
              </div>
              <span className="text-lg font-semibold text-cyan-100">HD Video Calls</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              Crystal Clear Communication
            </h1>
            <p className="text-xl mb-8 text-cyan-50">
              Connect with your team through high-definition video calls, screen sharing, 
              and collaborative features that make remote work feel like being in the same room.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
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
          <h2 className="text-4xl font-bold mb-4">Professional Video Conferencing</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Everything you need for seamless video communication and collaboration
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Camera className="w-10 h-10 text-cyan-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">HD Video Quality</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Crystal clear 1080p HD video with automatic quality optimization for all connections
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Monitor className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Screen Sharing</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Share your entire screen, specific applications, or browser tabs with one click
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Users className="w-10 h-10 text-indigo-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Large Meetings</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Host meetings with up to 500 participants with advanced moderation controls
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Mic className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Audio Enhancement</h3>
              <p className="text-gray-600 dark:text-gray-400">
                AI-powered noise cancellation and echo reduction for crystal clear audio
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Shield className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Enterprise Security</h3>
              <p className="text-gray-600 dark:text-gray-400">
                End-to-end encryption, waiting rooms, and meeting locks for secure conversations
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Settings className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Meeting Recording</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Record meetings with automatic transcription and searchable content
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
              <h2 className="text-4xl font-bold mb-4">Perfect for Every Meeting Type</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                From one-on-ones to all-hands meetings, deliver exceptional video experiences
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Phone className="w-8 h-8 text-cyan-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Remote Teams</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Daily standups and team check-ins</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Virtual coffee breaks and team building</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Code reviews and pair programming sessions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Project planning and retrospectives</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Globe className="w-8 h-8 text-blue-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Client Meetings</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Professional client presentations and demos</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Sales calls and product walkthroughs</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Training sessions and workshops</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Support and consultation calls</span>
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
          <h2 className="text-4xl font-bold mb-6">Works With Your Calendar</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
            Seamlessly integrate with your existing calendar and meeting tools
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
      <section className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              Experience Premium Video Conferencing
            </h2>
            <p className="text-xl mb-8 text-cyan-50">
              Join millions of professionals who trust us for their most important conversations
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-white text-cyan-600 hover:bg-gray-100">
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