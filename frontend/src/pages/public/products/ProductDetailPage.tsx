import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  MessageSquare,
  Kanban,
  FolderOpen,
  Calendar,
  FileText,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PublicLayout } from '../../../layouts/PublicLayout';
import { PageSEO } from '../../../components/seo';

interface ProductMeta {
  slug: string;
  icon: LucideIcon;
  color: string;
  featureCount: number;
}

const PRODUCTS: Record<string, ProductMeta> = {
  chat: { slug: 'chat', icon: MessageSquare, color: 'from-cyan-500 to-cyan-600', featureCount: 6 },
  projects: { slug: 'projects', icon: Kanban, color: 'from-sky-500 to-sky-600', featureCount: 6 },
  files: { slug: 'files', icon: FolderOpen, color: 'from-blue-500 to-blue-600', featureCount: 6 },
  calendar: { slug: 'calendar', icon: Calendar, color: 'from-emerald-500 to-emerald-600', featureCount: 6 },
  notes: { slug: 'notes', icon: FileText, color: 'from-orange-500 to-orange-600', featureCount: 6 },
  'video-calls': { slug: 'video-calls', icon: Video, color: 'from-red-500 to-red-600', featureCount: 6 },
};

const ProductDetailPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const intl = useIntl();
  const product = PRODUCTS[slug];

  if (!product) {
    return <Navigate to="/home" replace />;
  }

  const Icon = product.icon;
  const i18nKey = slug === 'video-calls' ? 'videoCalls' : slug;

  const name = intl.formatMessage({ id: `productDetail.${i18nKey}.name` });
  const tagline = intl.formatMessage({ id: `productDetail.${i18nKey}.tagline` });
  const description = intl.formatMessage({ id: `productDetail.${i18nKey}.description` });
  const keyFeaturesLabel = intl.formatMessage({ id: 'productDetail.keyFeatures' });

  const features = Array.from({ length: product.featureCount }, (_, i) =>
    intl.formatMessage({ id: `productDetail.${i18nKey}.features.${i}` })
  );

  return (
    <PublicLayout>
      <PageSEO title={`${name} — Deskive`} description={description} />
      <main className="min-h-[70vh] bg-gradient-to-b from-gray-50 via-white to-white py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <div className="flex items-center gap-4 mb-6">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${product.color} flex items-center justify-center shadow-md`}
            >
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900">{name}</h1>
              <p className="text-sky-600 font-semibold">{tagline}</p>
            </div>
          </div>

          <p className="text-gray-700 text-base md:text-lg leading-relaxed mb-10">
            {description}
          </p>

          <h2 className="text-xl font-bold text-gray-900 mb-4">{keyFeaturesLabel}</h2>
          <ul className="space-y-3">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3 text-gray-700">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </PublicLayout>
  );
};

export default ProductDetailPage;
