'use client';

import { motion } from 'framer-motion';

interface StarBackgroundProps {
  /**
   * Number of stars to render
   * @default 150
   */
  starCount?: number;
  
  /**
   * Tailwind color class for the stars
   * @default 'bg-cyan-400'
   */
  starColor?: string;
  
  /**
   * Animation intensity multiplier (1 = normal, 2 = more intense, 0.5 = subtle)
   * @default 1
   */
  animationIntensity?: number;
  
  /**
   * Base opacity for the stars
   * @default [0.3, 0.8, 0.3]
   */
  opacityRange?: [number, number, number];
  
  /**
   * Size of the stars in Tailwind classes
   * @default 'w-1 h-1'
   */
  starSize?: string;
  
  /**
   * Enable layered stars with multiple sizes for richer effect
   * @default true
   */
  enableLayers?: boolean;
  
  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

export function StarBackground({
  starCount = 150,
  starColor = 'bg-cyan-400',
  animationIntensity = 1,
  opacityRange = [0.3, 0.8, 0.3],
  starSize = 'w-1 h-1',
  enableLayers = true,
  className = '',
}: StarBackgroundProps) {
  // Star layer configurations for richer visual effect
  const starLayers = enableLayers ? [
    { size: 'w-0.5 h-0.5', count: Math.floor(starCount * 0.5), opacity: [0.1, 0.4, 0.1] }, // Small stars (more numerous)
    { size: 'w-1 h-1', count: Math.floor(starCount * 0.3), opacity: [0.2, 0.6, 0.2] }, // Medium stars  
    { size: 'w-1.5 h-1.5', count: Math.floor(starCount * 0.2), opacity: [0.3, 0.8, 0.3] } // Large stars (fewer, brighter)
  ] : [
    { size: starSize, count: starCount, opacity: opacityRange }
  ];

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {starLayers.map((layer, layerIndex) => 
        [...Array(layer.count)].map((_, i) => (
          <motion.div
            key={`${layerIndex}-${i}`}
            className={`absolute ${layer.size} ${starColor} rounded-full`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20 * animationIntensity, 20 * animationIntensity, -20 * animationIntensity],
              x: [-10 * animationIntensity, 10 * animationIntensity, -10 * animationIntensity],
              scale: [0.5, 1, 0.5],
              opacity: layer.opacity,
            }}
            transition={{
              duration: 3 + Math.random() * 4, // More variation: 3-7 seconds
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 3, // Longer stagger delays
            }}
          />
        ))
      )}
    </div>
  );
}

export default StarBackground;