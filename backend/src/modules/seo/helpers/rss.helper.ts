/**
 * RSS Feed Helper
 * Generates RSS 2.0 and Atom 1.0 feeds for content syndication
 */

/**
 * RSS Channel represents the main feed container
 */
export interface RSSChannel {
  title: string;
  description: string;
  link: string;
  language?: string;
  copyright?: string;
  managingEditor?: string;
  webMaster?: string;
  pubDate?: Date;
  lastBuildDate?: Date;
  category?: string[];
  generator?: string;
  docs?: string;
  ttl?: number;
  image?: RSSImage;
  items: RSSItem[];
  author?: string;
}

/**
 * RSS Item represents a single entry in the feed
 */
export interface RSSItem {
  title: string;
  link: string;
  description: string;
  author?: string;
  category?: string[];
  comments?: string;
  enclosure?: RSSEnclosure;
  guid?: string;
  pubDate?: Date;
  source?: string;
  content?: string;
}

/**
 * RSS Image for feed branding
 */
export interface RSSImage {
  url: string;
  title: string;
  link: string;
  width?: number;
  height?: number;
  description?: string;
}

/**
 * RSS Enclosure for media files
 */
export interface RSSEnclosure {
  url: string;
  length: number;
  type: string;
}

/**
 * Escape XML special characters
 */
export function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format date for RSS (RFC 822)
 */
function formatRSSDate(date: Date): string {
  return date.toUTCString();
}

/**
 * Format date for Atom (ISO 8601)
 */
function formatAtomDate(date: Date): string {
  return date.toISOString();
}

/**
 * Generate RSS 2.0 feed XML
 */
export function generateRSS(channel: RSSChannel): string {
  const {
    title,
    description,
    link,
    language = 'en-us',
    copyright,
    managingEditor,
    webMaster,
    pubDate,
    lastBuildDate = new Date(),
    category = [],
    generator = 'Deskive RSS Generator',
    docs = 'https://www.rssboard.org/rss-specification',
    ttl,
    image,
    items,
  } = channel;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${escapeXml(link)}</link>
    <atom:link href="${escapeXml(link)}/feed.xml" rel="self" type="application/rss+xml" />
    <language>${escapeXml(language)}</language>
    <lastBuildDate>${formatRSSDate(lastBuildDate)}</lastBuildDate>
    <generator>${escapeXml(generator)}</generator>
    <docs>${escapeXml(docs)}</docs>`;

  if (copyright) {
    xml += `\n    <copyright>${escapeXml(copyright)}</copyright>`;
  }

  if (managingEditor) {
    xml += `\n    <managingEditor>${escapeXml(managingEditor)}</managingEditor>`;
  }

  if (webMaster) {
    xml += `\n    <webMaster>${escapeXml(webMaster)}</webMaster>`;
  }

  if (pubDate) {
    xml += `\n    <pubDate>${formatRSSDate(pubDate)}</pubDate>`;
  }

  if (ttl) {
    xml += `\n    <ttl>${ttl}</ttl>`;
  }

  category.forEach((cat) => {
    xml += `\n    <category>${escapeXml(cat)}</category>`;
  });

  if (image) {
    xml += `\n    <image>
      <url>${escapeXml(image.url)}</url>
      <title>${escapeXml(image.title)}</title>
      <link>${escapeXml(image.link)}</link>`;
    if (image.width) xml += `\n      <width>${image.width}</width>`;
    if (image.height) xml += `\n      <height>${image.height}</height>`;
    if (image.description) xml += `\n      <description>${escapeXml(image.description)}</description>`;
    xml += `\n    </image>`;
  }

  items.forEach((item) => {
    xml += `\n    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>`;

    if (item.author) xml += `\n      <author>${escapeXml(item.author)}</author>`;
    if (item.category && item.category.length > 0) {
      item.category.forEach((cat) => {
        xml += `\n      <category>${escapeXml(cat)}</category>`;
      });
    }
    if (item.guid) xml += `\n      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>`;
    if (item.pubDate) xml += `\n      <pubDate>${formatRSSDate(item.pubDate)}</pubDate>`;
    if (item.content) xml += `\n      <content:encoded><![CDATA[${item.content}]]></content:encoded>`;
    if (item.enclosure) {
      xml += `\n      <enclosure url="${escapeXml(item.enclosure.url)}" length="${item.enclosure.length}" type="${escapeXml(item.enclosure.type)}" />`;
    }

    xml += `\n    </item>`;
  });

  xml += `\n  </channel>
</rss>`;

  return xml;
}

/**
 * Generate Atom 1.0 feed XML
 */
export function generateAtom(channel: RSSChannel): string {
  const {
    title,
    description,
    link,
    lastBuildDate = new Date(),
    items,
    author,
    image,
  } = channel;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(title)}</title>
  <subtitle>${escapeXml(description)}</subtitle>
  <link href="${escapeXml(link)}" rel="alternate" />
  <link href="${escapeXml(link)}/feed.atom" rel="self" type="application/atom+xml" />
  <id>${escapeXml(link)}</id>
  <updated>${formatAtomDate(lastBuildDate)}</updated>
  <generator uri="https://deskive.com" version="1.0">Deskive</generator>`;

  if (author) {
    xml += `\n  <author>
    <name>${escapeXml(author)}</name>
  </author>`;
  }

  if (image) {
    xml += `\n  <icon>${escapeXml(image.url)}</icon>
  <logo>${escapeXml(image.url)}</logo>`;
  }

  items.forEach((item) => {
    const itemId = item.guid || item.link;
    const itemUpdated = item.pubDate || lastBuildDate;

    xml += `\n  <entry>
    <title>${escapeXml(item.title)}</title>
    <link href="${escapeXml(item.link)}" rel="alternate" />
    <id>${escapeXml(itemId)}</id>
    <updated>${formatAtomDate(itemUpdated)}</updated>`;

    if (item.pubDate) xml += `\n    <published>${formatAtomDate(item.pubDate)}</published>`;
    if (item.author) {
      xml += `\n    <author>
      <name>${escapeXml(item.author)}</name>
    </author>`;
    }

    xml += `\n    <summary type="html">${escapeXml(item.description)}</summary>`;
    if (item.content) xml += `\n    <content type="html"><![CDATA[${item.content}]]></content>`;

    if (item.category && item.category.length > 0) {
      item.category.forEach((cat) => {
        xml += `\n    <category term="${escapeXml(cat)}" />`;
      });
    }

    xml += `\n  </entry>`;
  });

  xml += `\n</feed>`;

  return xml;
}
