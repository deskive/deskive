import { PageSEO } from '@/components/seo';

export function SEOTestPage() {
  return (
    <div className="container mx-auto p-8">
      <PageSEO
        title="SEO Test Page"
        description="This is a test page to verify SEO implementation"
        keywords={['test', 'seo', 'deskive']}
        ogType="website"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'SEO Test Page',
          description: 'This is a test page to verify SEO implementation',
        }}
      />

      <h1 className="text-4xl font-bold mb-4">SEO Test Page</h1>
      <p className="text-gray-600">
        Open browser DevTools and inspect the &lt;head&gt; section to verify meta tags.
      </p>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Expected Meta Tags:</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>title: SEO Test Page | Deskive</li>
          <li>meta description</li>
          <li>meta keywords</li>
          <li>og:title, og:description, og:image</li>
          <li>twitter:card, twitter:title, twitter:description</li>
          <li>canonical URL</li>
          <li>JSON-LD structured data</li>
        </ul>
      </div>

      <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded">
        <h2 className="font-bold text-green-800 mb-2">✅ Phase 1: Foundation Setup Complete!</h2>
        <p className="text-green-700 text-sm">
          If you can see this page and the meta tags in the page source, the SEO foundation is working correctly.
        </p>
      </div>

      <div className="mt-4">
        <h3 className="font-semibold mb-2">How to verify:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Right-click on this page and select "View Page Source" (Ctrl+U)</li>
          <li>Search for &lt;title&gt; tag in the &lt;head&gt; section</li>
          <li>Look for meta tags with property="og:*"</li>
          <li>Find the &lt;script type="application/ld+json"&gt; tag</li>
          <li>Verify all tags are present</li>
        </ol>
      </div>
    </div>
  );
}
