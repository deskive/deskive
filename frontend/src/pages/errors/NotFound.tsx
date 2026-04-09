import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full border border-gray-700/50 mb-6">
            <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              404
            </div>
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Page Not Found
        </h1>
        <p className="text-lg text-gray-400 mb-8 leading-relaxed">
          Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or the URL might be incorrect.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto"
            >
              <Home className="mr-2 h-5 w-5" />
              Go Home
            </Button>
          </Link>
          
          <Button 
            size="lg" 
            variant="outline" 
            className="border-gray-600 text-white hover:bg-gray-800 w-full sm:w-auto"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go Back
          </Button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 pt-8 border-t border-gray-700/50">
          <p className="text-sm text-gray-500 mb-4">
            Need help finding what you're looking for?
          </p>
          <div className="flex justify-center">
            <Link 
              to="/"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Search className="h-4 w-4" />
              Browse Available Pages
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}