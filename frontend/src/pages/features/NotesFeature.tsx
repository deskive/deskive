import { Link } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { PageSEO } from '../../components/seo'
import {
  FileText, 
  Edit3, 
  Share2, 
  Search,
  Tag,
  Layers,
  CheckCircle,
  ArrowRight,
  Users,
  BookOpen
} from 'lucide-react'

export default function NotesFeature() {
  const intl = useIntl()
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <PageSEO
        title={intl.formatMessage({ id: 'featurePages.notes.title' })}
        description={intl.formatMessage({ id: 'featurePages.notes.description' })}
        keywords={['notes', 'note-taking', 'knowledge management', 'documentation', 'wiki', 'collaborative notes']}
        ogImage="/og-images/features/notes.png"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-600 to-orange-700 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <span className="text-lg font-semibold text-amber-100">{intl.formatMessage({ id: 'featurePages.notes.badge' })}</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">{intl.formatMessage({ id: 'featurePages.notes.heroTitle' })}</h1>
            <p className="text-xl mb-8 text-amber-50">
              Create, organize, and collaborate on notes with rich text editing, 
              real-time sync, and powerful organization features that keep your team aligned.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button size="lg" className="bg-white text-amber-600 hover:bg-gray-100">
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
          <h2 className="text-4xl font-bold mb-4">Note-Taking Reimagined</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            From simple notes to complex knowledge bases - everything you need to capture and organize ideas
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Edit3 className="w-10 h-10 text-amber-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Rich Text Editor</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Format text, add images, create tables, and embed media with our intuitive editor
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Users className="w-10 h-10 text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Real-time Collaboration</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Work together simultaneously with live cursors and instant sync across devices
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Layers className="w-10 h-10 text-yellow-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Hierarchical Organization</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Create nested folders, sections, and pages to organize your knowledge effectively
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Search className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Powerful Search</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Find any note instantly with full-text search, filters, and smart suggestions
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Tag className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Tagging</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Tag and categorize notes for easy discovery and cross-referencing
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <Share2 className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Flexible Sharing</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Share notes publicly, with specific people, or keep them private with granular permissions
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
              <h2 className="text-4xl font-bold mb-4">Perfect for Every Use Case</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                From meeting notes to knowledge management, organize information your way
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <BookOpen className="w-8 h-8 text-amber-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Knowledge Workers</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Build comprehensive knowledge bases and wikis</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Document processes and procedures</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Research and organize complex information</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Create training materials and guides</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <Users className="w-8 h-8 text-orange-600 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">For Collaborative Teams</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Take collaborative meeting notes in real-time</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Share project updates and status reports</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Brainstorm ideas with visual collaboration</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">Maintain team knowledge and onboarding docs</span>
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
          <h2 className="text-4xl font-bold mb-6">Integrate Your Workflow</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
            Connect with your favorite tools to create a seamless note-taking experience
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">NT</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Notion</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">TR</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Trello</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">EV</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Evernote</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-600">GD</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Google Docs</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-amber-600 to-orange-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              Organize Your Ideas Like Never Before
            </h2>
            <p className="text-xl mb-8 text-amber-50">
              Join thousands of teams who've transformed their note-taking and knowledge management
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-white text-amber-600 hover:bg-gray-100">
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