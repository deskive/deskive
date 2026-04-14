/**
 * Feed Service
 * Generates RSS 2.0 and Atom 1.0 feeds for changelog and other content
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateRSS, generateAtom, RSSChannel, RSSItem } from './helpers/rss.helper';

@Injectable()
export class FeedService {
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('SITE_URL') || 'https://deskive.com';
  }

  // Blog-related feed methods removed - will be implemented separately

  /**
   * Generate RSS 2.0 feed for changelog/product updates
   * @returns RSS 2.0 XML string
   */
  async generateChangelogRSS(): Promise<string> {
    // TODO: Fetch from database when changelog module is implemented
    const changelogItems = await this.getChangelogItems(50);

    const channel: RSSChannel = {
      title: 'Deskive Changelog',
      description: 'Latest product updates and new features from Deskive',
      link: `${this.baseUrl}/changelog`,
      language: 'en-us',
      copyright: `Copyright ${new Date().getFullYear()} Deskive. All rights reserved.`,
      lastBuildDate: new Date(),
      category: ['Product Updates', 'Changelog'],
      ttl: 120, // Cache for 2 hours
      image: {
        url: `${this.baseUrl}/logo.png`,
        title: 'Deskive Changelog',
        link: `${this.baseUrl}/changelog`,
        width: 144,
        height: 144,
      },
      items: changelogItems,
    };

    return generateRSS(channel);
  }

  /**
   * Get changelog items (placeholder implementation)
   * TODO: Replace with actual database query
   */
  private async getChangelogItems(limit: number): Promise<RSSItem[]> {
    // Example changelog entries
    const changelogItems: RSSItem[] = [
      {
        title: 'Version 2.5.0 - Enhanced AI Features',
        link: `${this.baseUrl}/changelog/v2-5-0`,
        description:
          'New AI-powered document generation, improved chat suggestions, and smart task recommendations.',
        content: `<h2>What's New</h2>
<ul>
  <li>AI Document Generation with templates</li>
  <li>Smart chat reply suggestions</li>
  <li>Automated task recommendations based on project context</li>
  <li>Performance improvements across all modules</li>
</ul>`,
        category: ['New Features', 'AI', 'Performance'],
        guid: 'deskive-changelog-v2-5-0',
        pubDate: new Date('2025-10-28'),
      },
      {
        title: 'Version 2.4.0 - Calendar Improvements',
        link: `${this.baseUrl}/changelog/v2-4-0`,
        description: 'Smart scheduling, recurring events, and calendar sync improvements.',
        content: `<h2>What's New</h2>
<ul>
  <li>Smart scheduling with AI conflict detection</li>
  <li>Enhanced recurring event support</li>
  <li>Improved Google Calendar and Outlook sync</li>
</ul>`,
        category: ['New Features', 'Calendar'],
        guid: 'deskive-changelog-v2-4-0',
        pubDate: new Date('2025-10-15'),
      },
    ];

    return changelogItems.slice(0, limit);
  }
}
