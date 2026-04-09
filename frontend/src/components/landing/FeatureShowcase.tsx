import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle } from 'lucide-react';

type ColorScheme = 'cyan' | 'purple' | 'blue' | 'emerald' | 'pink' | 'orange';

interface FeatureShowcaseProps {
  id: string;
  icon: LucideIcon;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  color: ColorScheme;
  direction: 'left' | 'right';
  mediaType?: 'video' | 'image';
  mediaSrc?: string;
  index: number;
}

const colorClasses: Record<ColorScheme, {
  gradient: string;
  iconBg: string;
  iconText: string;
  tagline: string;
  check: string;
  border: string;
}> = {
  cyan: {
    gradient: 'from-cyan-500 to-teal-500',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    iconText: 'text-cyan-600 dark:text-cyan-400',
    tagline: 'text-cyan-600 dark:text-cyan-400',
    check: 'text-cyan-500',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
  purple: {
    gradient: 'from-purple-500 to-violet-500',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconText: 'text-purple-600 dark:text-purple-400',
    tagline: 'text-purple-600 dark:text-purple-400',
    check: 'text-purple-500',
    border: 'border-purple-200 dark:border-purple-800',
  },
  blue: {
    gradient: 'from-blue-500 to-indigo-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconText: 'text-blue-600 dark:text-blue-400',
    tagline: 'text-blue-600 dark:text-blue-400',
    check: 'text-blue-500',
    border: 'border-blue-200 dark:border-blue-800',
  },
  emerald: {
    gradient: 'from-emerald-500 to-teal-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    tagline: 'text-emerald-600 dark:text-emerald-400',
    check: 'text-emerald-500',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  pink: {
    gradient: 'from-pink-500 to-rose-500',
    iconBg: 'bg-pink-100 dark:bg-pink-900/30',
    iconText: 'text-pink-600 dark:text-pink-400',
    tagline: 'text-pink-600 dark:text-pink-400',
    check: 'text-pink-500',
    border: 'border-pink-200 dark:border-pink-800',
  },
  orange: {
    gradient: 'from-orange-500 to-amber-500',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconText: 'text-orange-600 dark:text-orange-400',
    tagline: 'text-orange-600 dark:text-orange-400',
    check: 'text-orange-500',
    border: 'border-orange-200 dark:border-orange-800',
  },
};

export function FeatureShowcase({
  id,
  icon: Icon,
  title,
  tagline,
  description,
  features,
  color,
  direction,
  mediaType = 'image',
  mediaSrc,
  index,
}: FeatureShowcaseProps) {
  const colors = colorClasses[color];
  const isLeft = direction === 'left';

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className={`flex flex-col ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 lg:gap-16 items-center`}
    >
      {/* Content Side */}
      <div className="flex-1 max-w-xl">
        {/* Icon Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className={`inline-flex items-center gap-3 mb-6 px-4 py-2 rounded-full ${colors.iconBg} border ${colors.border}`}
        >
          <Icon className={`w-5 h-5 ${colors.iconText}`} />
          <span className={`text-sm font-semibold ${colors.tagline}`}>{tagline}</span>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
        >
          {title}
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-lg text-gray-600 dark:text-gray-400 mb-8"
        >
          {description}
        </motion.p>

        {/* Feature List */}
        <motion.ul
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="space-y-3"
        >
          {features.map((feature, idx) => (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.5 + idx * 0.1 }}
              className="flex items-start gap-3"
            >
              <CheckCircle className={`w-5 h-5 ${colors.check} mt-0.5 flex-shrink-0`} />
              <span className="text-gray-700 dark:text-gray-300">{feature}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* Media Side */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex-1 w-full max-w-xl"
      >
        <div className={`relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br ${colors.gradient} p-1`}>
          <div className="rounded-xl overflow-hidden bg-gray-900">
            {mediaSrc ? (
              mediaType === 'video' ? (
                <video
                  src={mediaSrc}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-auto aspect-video object-cover"
                />
              ) : (
                <img
                  src={mediaSrc}
                  alt={title}
                  className="w-full h-auto aspect-video object-cover"
                />
              )
            ) : (
              /* Placeholder gradient with icon */
              <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className={`w-20 h-20 rounded-2xl ${colors.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-10 h-10 ${colors.iconText}`} />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default FeatureShowcase;
