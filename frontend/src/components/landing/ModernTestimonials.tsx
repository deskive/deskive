import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const ModernTestimonials: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'CEO at TechStart',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      content: 'Deskive transformed how our team collaborates. We went from using 6 different tools to just one. The productivity boost has been incredible!',
      rating: 5,
      company: 'TechStart Inc.',
      gradient: 'from-sky-100 via-sky-50 to-blue-50'
    },
    {
      name: 'Michael Chen',
      role: 'Product Manager',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      content: 'The AI assistant alone is worth the price. It helps us automate so many repetitive tasks. Best investment we made this year.',
      rating: 5,
      company: 'InnovateLabs',
      gradient: 'from-blue-100 via-blue-50 to-cyan-50'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Design Lead',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
      content: 'Beautiful interface, powerful features. The whiteboard collaboration feature is a game-changer for our remote design team.',
      rating: 5,
      company: 'CreativeHub',
      gradient: 'from-sky-100 via-sky-50 to-blue-50'
    },
    {
      name: 'David Kim',
      role: 'Engineering Director',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
      content: 'Finally, a platform that understands what development teams need. The project management tools are exactly what we were looking for.',
      rating: 5,
      company: 'DevCore Solutions',
      gradient: 'from-emerald-100 via-emerald-50 to-teal-50'
    },
    {
      name: 'Lisa Thompson',
      role: 'Marketing Director',
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop',
      content: 'The integration capabilities are outstanding. We connected all our existing tools seamlessly. Customer support is top-notch too!',
      rating: 5,
      company: 'BrandWave',
      gradient: 'from-blue-100 via-blue-50 to-sky-50'
    },
    {
      name: 'James Wilson',
      role: 'Startup Founder',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
      content: 'As a startup, we needed something affordable yet powerful. Deskive gave us enterprise features at a fraction of the cost.',
      rating: 5,
      company: 'NextGen Ventures',
      gradient: 'from-orange-100 via-orange-50 to-yellow-50'
    }
  ];

  // Auto-rotate testimonials every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  // Get 3 testimonials to display (previous, current, next)
  const getPrevIndex = () => (currentIndex - 1 + testimonials.length) % testimonials.length;
  const getNextIndex = () => (currentIndex + 1) % testimonials.length;

  return (
    <section id="testimonials" className="relative py-20 sm:py-24 lg:py-32 overflow-hidden bg-gradient-to-b from-white to-sky-50">
      {/* Background - Sky/Blue gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, rgba(59,130,246,0.05) 50%, transparent 100%)',
          }}
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -bottom-1/2 -left-1/2 w-[900px] h-[900px] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(14,165,233,0.05) 50%, transparent 100%)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-sky-200 bg-white shadow-md"
          >
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold text-gray-700">Loved by thousands of teams</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900"
          >
            What our customers say
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Join thousands of satisfied teams who have transformed their workflow with Deskive
          </motion.p>
        </div>

        {/* 3 Cards Layout */}
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-6">
            {/* Previous Card (Left) */}
            <motion.div
              key={`prev-${getPrevIndex()}`}
              animate={{
                opacity: 0.4,
                scale: 0.85,
                filter: 'blur(4px)',
                y: 20,
              }}
              transition={{
                duration: 0.6,
                ease: 'easeInOut'
              }}
              className="relative w-full max-w-md z-10 hidden md:block"
            >
              <TestimonialCard
                testimonial={testimonials[getPrevIndex()]}
                isActive={false}
              />
            </motion.div>

            {/* Current Card (Center - Active) */}
            <motion.div
              key={`current-${currentIndex}`}
              animate={{
                opacity: 1,
                scale: 1,
                filter: 'blur(0px)',
                y: 0,
              }}
              transition={{
                duration: 0.6,
                ease: 'easeInOut'
              }}
              className="relative w-full max-w-2xl z-20"
            >
              <TestimonialCard
                testimonial={testimonials[currentIndex]}
                isActive={true}
              />
            </motion.div>

            {/* Next Card (Right) */}
            <motion.div
              key={`next-${getNextIndex()}`}
              animate={{
                opacity: 0.4,
                scale: 0.85,
                filter: 'blur(4px)',
                y: 20,
              }}
              transition={{
                duration: 0.6,
                ease: 'easeInOut'
              }}
              className="relative w-full max-w-md z-10 hidden md:block"
            >
              <TestimonialCard
                testimonial={testimonials[getNextIndex()]}
                isActive={false}
              />
            </motion.div>
          </div>

          {/* Progress Indicators */}
          <div className="flex items-center justify-center gap-2 mt-12">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-8 bg-gradient-to-r from-sky-500 to-blue-600'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Separate TestimonialCard component for cleaner code
const TestimonialCard: React.FC<{ testimonial: any; isActive: boolean }> = ({ testimonial, isActive }) => {
  return (
    <div
      className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden ${
        isActive ? 'p-10' : 'p-8'
      }`}
      style={{
        minHeight: isActive ? '500px' : '450px',
        pointerEvents: isActive ? 'auto' : 'none'
      }}
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${testimonial.gradient} opacity-30`}></div>

      {/* Large Decorative Quote Mark - Top */}
      <div className="absolute top-6 left-6 opacity-10">
        <Quote className={`${isActive ? 'w-20 h-20' : 'w-16 h-16'} text-sky-600`} />
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center text-center h-full justify-center space-y-6">
        {/* Avatar */}
        <div className="relative">
          <div className={`${isActive ? 'w-28 h-28' : 'w-24 h-24'} rounded-full bg-gradient-to-br from-sky-400 to-blue-600 p-1 shadow-xl`}>
            <div className="w-full h-full rounded-full overflow-hidden border-4 border-white">
              <img
                src={testimonial.avatar}
                alt={testimonial.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          {isActive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white"
            >
              <Star className="w-5 h-5 text-white fill-white" />
            </motion.div>
          )}
        </div>

        {/* Author Info */}
        <div className="space-y-1">
          <h4 className={`font-bold text-gray-900 ${isActive ? 'text-2xl' : 'text-xl'}`}>
            {testimonial.name}
          </h4>
          <p className={`text-sky-600 font-medium ${isActive ? 'text-sm' : 'text-xs'}`}>
            {testimonial.role}
          </p>
          <p className={`text-gray-500 ${isActive ? 'text-xs' : 'text-[10px]'}`}>
            {testimonial.company}
          </p>
        </div>

        {/* Testimonial Content */}
        <div className={`${isActive ? 'px-4 max-w-xl' : 'px-3 max-w-sm'}`}>
          <p className={`text-gray-700 leading-relaxed ${isActive ? 'text-base' : 'text-sm'}`}>
            "{testimonial.content}"
          </p>
        </div>

        {/* Rating Stars */}
        <div className="flex items-center gap-1">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star
              key={i}
              className={`${isActive ? 'w-5 h-5' : 'w-4 h-4'} text-yellow-500 fill-yellow-500`}
            />
          ))}
        </div>

        {/* Active Indicator */}
        {isActive && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3 }}
            className="w-16 h-1 bg-gradient-to-r from-sky-500 to-blue-600 rounded-full"
          />
        )}
      </div>

      {/* Large Decorative Quote Mark - Bottom */}
      <div className="absolute bottom-6 right-6 opacity-10 rotate-180">
        <Quote className={`${isActive ? 'w-20 h-20' : 'w-16 h-16'} text-blue-600`} />
      </div>
    </div>
  );
};

export default ModernTestimonials;
