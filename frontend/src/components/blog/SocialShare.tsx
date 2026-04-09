/**
 * SocialShare Component
 * Social media sharing buttons for blog posts
 */

import React, { useState } from 'react';
import { 
  Twitter, 
  Facebook, 
  Linkedin, 
  Mail, 
  Copy, 
  Share2,
  Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { useToast } from '../../hooks/use-toast';
import { blogService, type PublicBlogPost } from '@/lib/api/blog-api';

interface SocialShareProps {
  post: PublicBlogPost;
  variant?: 'dropdown' | 'buttons' | 'compact';
  className?: string;
  baseUrl?: string;
}

export const SocialShare: React.FC<SocialShareProps> = ({
  post,
  variant = 'buttons',
  className = '',
  baseUrl = window.location.origin,
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const shareUrls = blogService.generateShareUrls(post, baseUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrls.copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link Copied!',
        description: 'The blog post link has been copied to your clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy link to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = (platform: string, url: string) => {
    if (platform === 'copy') {
      handleCopy();
      return;
    }
    
    // Open sharing window
    const width = 600;
    const height = 400;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2.5;
    
    window.open(
      url,
      platform,
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  const shareButtons = [
    {
      name: 'Twitter',
      icon: Twitter,
      url: shareUrls.twitter,
      color: 'hover:bg-blue-50 hover:text-blue-600',
      key: 'twitter'
    },
    {
      name: 'Facebook',
      icon: Facebook,
      url: shareUrls.facebook,
      color: 'hover:bg-blue-50 hover:text-blue-700',
      key: 'facebook'
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: shareUrls.linkedin,
      color: 'hover:bg-blue-50 hover:text-blue-800',
      key: 'linkedin'
    },
    {
      name: 'Email',
      icon: Mail,
      url: shareUrls.email,
      color: 'hover:bg-gray-50 hover:text-gray-700',
      key: 'email'
    },
    {
      name: 'Copy Link',
      icon: copied ? Check : Copy,
      url: shareUrls.copy,
      color: copied 
        ? 'hover:bg-green-50 hover:text-green-600 text-green-600' 
        : 'hover:bg-gray-50 hover:text-gray-700',
      key: 'copy'
    },
  ];

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Share this post</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {shareButtons.map((button) => {
            const Icon = button.icon;
            return (
              <DropdownMenuItem
                key={button.key}
                onClick={() => handleShare(button.key, button.url)}
                className={button.color}
              >
                <Icon className="w-4 h-4 mr-2" />
                {button.name}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <span className="text-sm text-muted-foreground mr-2">Share:</span>
        {shareButtons.slice(0, 3).map((button) => {
          const Icon = button.icon;
          return (
            <Button
              key={button.key}
              variant="ghost"
              size="sm"
              onClick={() => handleShare(button.key, button.url)}
              className={`w-8 h-8 p-0 ${button.color}`}
              title={button.name}
            >
              <Icon className="w-4 h-4" />
            </Button>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Share2 className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {shareButtons.slice(3).map((button) => {
              const Icon = button.icon;
              return (
                <DropdownMenuItem
                  key={button.key}
                  onClick={() => handleShare(button.key, button.url)}
                  className={button.color}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {button.name}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Default buttons variant
  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="font-semibold text-sm">Share this post</h4>
      <div className="flex flex-wrap gap-2">
        {shareButtons.map((button) => {
          const Icon = button.icon;
          return (
            <Button
              key={button.key}
              variant="outline"
              size="sm"
              onClick={() => handleShare(button.key, button.url)}
              className={`${button.color} transition-colors`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {button.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

// Floating Social Share Component
interface FloatingSocialShareProps {
  post: PublicBlogPost;
  baseUrl?: string;
}

export const FloatingSocialShare: React.FC<FloatingSocialShareProps> = ({
  post,
  baseUrl = window.location.origin,
}) => {
  const shareUrls = blogService.generateShareUrls(post, baseUrl);
  const [isVisible, setIsVisible] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / scrollHeight) * 100;
      
      // Show when scrolled 10% or more, hide when at bottom
      setIsVisible(scrollPercent > 10 && scrollPercent < 90);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = (platform: string, url: string) => {
    if (platform === 'copy') {
      navigator.clipboard.writeText(shareUrls.copy);
      return;
    }
    
    const width = 600;
    const height = 400;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2.5;
    
    window.open(
      url,
      platform,
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  if (!isVisible) return null;

  return (
    <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-40 hidden lg:flex flex-col space-y-2">
      <div className="bg-white shadow-lg rounded-lg p-2 border">
        <div className="flex flex-col space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShare('twitter', shareUrls.twitter)}
            className="w-10 h-10 p-0 hover:bg-blue-50 hover:text-blue-600"
            title="Share on Twitter"
          >
            <Twitter className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShare('facebook', shareUrls.facebook)}
            className="w-10 h-10 p-0 hover:bg-blue-50 hover:text-blue-700"
            title="Share on Facebook"
          >
            <Facebook className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShare('linkedin', shareUrls.linkedin)}
            className="w-10 h-10 p-0 hover:bg-blue-50 hover:text-blue-800"
            title="Share on LinkedIn"
          >
            <Linkedin className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShare('copy', shareUrls.copy)}
            className="w-10 h-10 p-0 hover:bg-gray-50 hover:text-gray-700"
            title="Copy Link"
          >
            <Copy className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};