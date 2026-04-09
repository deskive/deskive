/**
 * Accordion Component
 * Collapsible content sections with smooth animations
 */

import React, { createContext, useContext, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AccordionContextType {
  openItems: Set<string>;
  toggleItem: (value: string) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = createContext<AccordionContextType | null>(null);

interface AccordionProps {
  type?: 'single' | 'multiple';
  collapsible?: boolean;
  className?: string;
  children: React.ReactNode;
  defaultValue?: string | string[];
}

export function Accordion({ 
  type = 'single', 
  collapsible = false,
  className = '', 
  children,
  defaultValue 
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(() => {
    if (defaultValue) {
      return new Set(Array.isArray(defaultValue) ? defaultValue : [defaultValue]);
    }
    return new Set();
  });

  const toggleItem = (value: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      
      if (type === 'single') {
        if (newSet.has(value)) {
          if (collapsible) {
            newSet.delete(value);
          }
        } else {
          newSet.clear();
          newSet.add(value);
        }
      } else {
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }
      }
      
      return newSet;
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={`w-full ${className}`}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}


interface AccordionTriggerProps {
  className?: string;
  children: React.ReactNode;
}

export function AccordionTrigger({ className = '', children }: AccordionTriggerProps) {
  const context = useContext(AccordionContext);
  const accordionItem = useContext(AccordionItemContext);
  
  if (!context || !accordionItem) {
    throw new Error('AccordionTrigger must be used within Accordion and AccordionItem');
  }

  const { openItems, toggleItem } = context;
  const { value } = accordionItem;
  const isOpen = openItems.has(value);

  return (
    <button
      className={`flex w-full items-center justify-between py-4 text-left font-medium transition-all hover:underline ${className}`}
      onClick={() => toggleItem(value)}
    >
      {children}
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronDown className="h-4 w-4 shrink-0" />
      </motion.div>
    </button>
  );
}

interface AccordionContentProps {
  className?: string;
  children: React.ReactNode;
}

export function AccordionContent({ className = '', children }: AccordionContentProps) {
  const context = useContext(AccordionContext);
  const accordionItem = useContext(AccordionItemContext);
  
  if (!context || !accordionItem) {
    throw new Error('AccordionContent must be used within Accordion and AccordionItem');
  }

  const { openItems } = context;
  const { value } = accordionItem;
  const isOpen = openItems.has(value);

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className={`pb-4 pt-0 ${className}`}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Context for accordion item
interface AccordionItemContextType {
  value: string;
}

const AccordionItemContext = createContext<AccordionItemContextType | null>(null);

// Enhanced AccordionItem with context provider
const AccordionItemWithContext = ({ value, className = '', children }: AccordionItemProps) => {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div className={`border-b ${className}`}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
};

// Export the enhanced AccordionItem
export { AccordionItemWithContext as AccordionItem };