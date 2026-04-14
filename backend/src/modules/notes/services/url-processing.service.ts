import { Injectable, Logger } from '@nestjs/common';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';
import type { Element, AnyNode } from 'domhandler';

export interface UrlProcessingResult {
  title: string;
  content: string;
  markdown: string;
  html: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  publishedTime?: string;
  imageUrl?: string;
}

@Injectable()
export class UrlProcessingService {
  private readonly logger = new Logger(UrlProcessingService.name);

  async processUrlToMarkdown(url: string): Promise<UrlProcessingResult> {
    try {
      this.logger.log(`Processing URL: ${url}`);

      // Fetch the URL content
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (!response.ok) {
        this.logger.error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      this.logger.log(`Fetched HTML length: ${html.length} characters`);

      // Parse with JSDOM for Readability
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;

      // Extract metadata
      const metadata = this.extractMetadata(document, url);
      this.logger.log(
        `Extracted metadata: title="${metadata.title}", siteName="${metadata.siteName}"`,
      );

      // Use Readability to extract main content
      const reader = new Readability(document);
      const article = reader.parse();

      if (!article) {
        this.logger.warn('Readability returned null, using fallback extraction');
        // Fallback: use cheerio to extract basic content
        return this.fallbackExtraction(html, url, metadata);
      }

      this.logger.log(
        `Readability extracted: title="${article.title}", content length=${article.content?.length || 0}`,
      );
      this.logger.log(`Readability textContent length: ${article.textContent?.length || 0}`);

      // Convert HTML content to Markdown
      const markdown = this.htmlToMarkdown(article.content);
      this.logger.log(`Converted to markdown, length: ${markdown.length}`);

      // Create clean HTML for the editor
      const cleanHtml = this.createCleanHtml(article, metadata, url);
      this.logger.log(`Created clean HTML, length: ${cleanHtml.length}`);

      const result = {
        title: article.title || metadata.title || 'Untitled',
        content: article.textContent || '',
        markdown,
        html: cleanHtml,
        excerpt: article.excerpt || metadata.description,
        byline: article.byline,
        siteName: article.siteName || metadata.siteName,
        publishedTime: metadata.publishedTime,
        imageUrl: metadata.imageUrl,
      };

      this.logger.log(
        `URL processing complete: title="${result.title}", htmlLength=${result.html.length}, excerptLength=${result.excerpt?.length || 0}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Failed to process URL:', error);
      throw new Error(
        `Failed to process URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private extractMetadata(
    document: Document,
    url: string,
  ): {
    title: string;
    description?: string;
    siteName?: string;
    publishedTime?: string;
    imageUrl?: string;
  } {
    const getMetaContent = (name: string): string | undefined => {
      const meta = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
      return meta?.getAttribute('content') || undefined;
    };

    return {
      title: getMetaContent('og:title') || document.title || '',
      description: getMetaContent('og:description') || getMetaContent('description'),
      siteName: getMetaContent('og:site_name') || new URL(url).hostname,
      publishedTime: getMetaContent('article:published_time') || getMetaContent('datePublished'),
      imageUrl: getMetaContent('og:image'),
    };
  }

  private fallbackExtraction(html: string, url: string, metadata: any): UrlProcessingResult {
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $(
      'script, style, nav, header, footer, aside, .sidebar, .advertisement, .ads, #comments',
    ).remove();

    // Try to find main content
    const mainContent = $('main, article, .content, .post, .entry-content, #content').first();
    const content = mainContent.length ? mainContent : $('body');

    // Extract text
    const text = content.text().replace(/\s+/g, ' ').trim();

    // Create basic HTML
    const paragraphs = text.split(/\.\s+/).filter((p) => p.length > 50);
    const basicHtml = paragraphs.map((p) => `<p>${p}.</p>`).join('\n');

    return {
      title: metadata.title || 'Untitled',
      content: text,
      markdown: paragraphs.map((p) => p + '.').join('\n\n'),
      html: this.createCleanHtml({ content: basicHtml, title: metadata.title }, metadata, url),
      excerpt: metadata.description,
      siteName: metadata.siteName,
      imageUrl: metadata.imageUrl,
    };
  }

  private createCleanHtml(article: any, metadata: any, url: string): string {
    const parts: string[] = [];

    // Add source info
    parts.push(
      `<p><em>Imported from: <a href="${url}" target="_blank">${metadata.siteName || new URL(url).hostname}</a></em></p>`,
    );

    // Add featured image if available
    if (metadata.imageUrl) {
      parts.push(
        `<p><img src="${metadata.imageUrl}" alt="${article.title || 'Featured image'}"></p>`,
      );
    }

    // Add byline/author if available
    if (article.byline) {
      parts.push(`<p><strong>By ${article.byline}</strong></p>`);
    }

    // Add published time if available
    if (metadata.publishedTime) {
      const date = new Date(metadata.publishedTime);
      if (!isNaN(date.getTime())) {
        parts.push(`<p><em>Published: ${date.toLocaleDateString()}</em></p>`);
      }
    }

    parts.push('<hr>');

    // Add main content - convert to TipTap-compatible HTML
    if (article.content) {
      const cleanedContent = this.convertToEditorHtml(article.content);
      parts.push(cleanedContent);
    }

    return parts.join('\n');
  }

  /**
   * Convert HTML to Quill editor-compatible format
   * Quill supports: p, h1-h3, strong, b, em, i, u, s, a, img, ul, ol, li, blockquote, pre
   */
  private convertToEditorHtml(html: string): string {
    // First, strip any outer html/body tags by extracting just the content
    const cleanHtml = html
      .replace(/<html[^>]*>/gi, '')
      .replace(/<\/html>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<body[^>]*>/gi, '')
      .replace(/<\/body>/gi, '');

    const $ = cheerio.load(cleanHtml);

    // Remove script, style, and other non-content elements
    $(
      'script, style, noscript, iframe, form, input, button, nav, aside, footer, header, svg, canvas',
    ).remove();

    // Convert figure/figcaption to simple img with caption as paragraph
    $('figure').each((_, el) => {
      const $figure = $(el);
      const $img = $figure.find('img').first();
      const $figcaption = $figure.find('figcaption').first();

      let replacement = '';
      if ($img.length) {
        const src = $img.attr('src') || '';
        const alt = $img.attr('alt') || $figcaption.text() || 'Image';
        replacement += `<p><img src="${src}" alt="${alt}"></p>`;
      }
      if ($figcaption.length && $figcaption.text().trim()) {
        replacement += `<p><em>${$figcaption.text().trim()}</em></p>`;
      }
      $figure.replaceWith(replacement || '');
    });

    // Unwrap all div elements (multiple passes for nested divs)
    for (let i = 0; i < 5; i++) {
      $('div').each((_, el) => {
        const $div = $(el);
        const content = $div.html();
        if (content) {
          $div.replaceWith(content);
        } else {
          $div.remove();
        }
      });
    }

    // Convert span elements to their content (preserve text and inline formatting)
    $('span').each((_, el) => {
      const $span = $(el);
      $span.replaceWith($span.html() || '');
    });

    // Convert article, section, main to their content
    $('article, section, main, address, time').each((_, el) => {
      const $el = $(el);
      $el.replaceWith($el.html() || '');
    });

    // Ensure images are wrapped in paragraphs for Quill compatibility
    $('img').each((_, el) => {
      const $img = $(el);
      const parent = $img.parent();
      const parentTag = parent?.prop('tagName')?.toLowerCase() || '';
      if (!['p', 'a'].includes(parentTag)) {
        $img.wrap('<p></p>');
      }
    });

    // Limit headers to h1-h3 (Quill default support)
    $('h4, h5, h6').each((_, el) => {
      const $el = $(el);
      const content = $el.html();
      $el.replaceWith(`<h3>${content}</h3>`);
    });

    // Clean heading attributes
    $('h1, h2, h3').each((_, el) => {
      const $el = $(el);
      $el.removeAttr('id');
      $el.removeAttr('class');
    });

    // Clean link attributes (keep only href and target)
    $('a').each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href') || '';
      const text = $a.html() || '';
      $a.replaceWith(`<a href="${href}" target="_blank">${text}</a>`);
    });

    // Remove all aria and data attributes from all elements
    $('*').each((_, el) => {
      const $el = $(el);
      const attributes = (el as any).attribs || {};
      Object.keys(attributes).forEach((attr) => {
        if (
          attr.startsWith('aria-') ||
          attr.startsWith('data-') ||
          attr === 'class' ||
          attr === 'id' ||
          attr === 'style'
        ) {
          $el.removeAttr(attr);
        }
      });
    });

    // Convert code elements
    $('code').each((_, el) => {
      const $code = $(el);
      const parent = $code.parent();
      if (parent?.prop('tagName')?.toLowerCase() !== 'pre') {
        // Inline code - just keep the text
        $code.replaceWith($code.text());
      }
    });

    // Remove empty elements but keep images and line breaks
    $('p, h1, h2, h3, li, blockquote').each((_, el) => {
      const $el = $(el);
      const hasContent = $el.text().trim() || $el.find('img').length > 0;
      if (!hasContent) {
        $el.remove();
      }
    });

    // Get the cleaned content
    let result = $('body').html() || $.html();

    // Remove any remaining html/body tags that might have been nested
    result = result
      .replace(/<html[^>]*>/gi, '')
      .replace(/<\/html>/gi, '')
      .replace(/<body[^>]*>/gi, '')
      .replace(/<\/body>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

    // Clean up whitespace
    result = result.replace(/\n\s*\n/g, '\n').trim();

    return result || '<p></p>';
  }

  private htmlToMarkdown(html: string): string {
    const $ = cheerio.load(html);

    let markdown = '';

    const processNode = (node: AnyNode): string => {
      const $node = $(node);
      const tagName = (node as Element).tagName?.toLowerCase();

      if (node.type === 'text') {
        return $(node).text();
      }

      const children = $node.contents().toArray();
      const childContent = children.map((child) => processNode(child)).join('');

      switch (tagName) {
        case 'h1':
          return `\n# ${childContent}\n\n`;
        case 'h2':
          return `\n## ${childContent}\n\n`;
        case 'h3':
          return `\n### ${childContent}\n\n`;
        case 'h4':
          return `\n#### ${childContent}\n\n`;
        case 'h5':
          return `\n##### ${childContent}\n\n`;
        case 'h6':
          return `\n###### ${childContent}\n\n`;
        case 'p':
          return `\n${childContent}\n\n`;
        case 'strong':
        case 'b':
          return `**${childContent}**`;
        case 'em':
        case 'i':
          return `*${childContent}*`;
        case 'a':
          const href = $node.attr('href');
          return href ? `[${childContent}](${href})` : childContent;
        case 'img':
          const src = $node.attr('src');
          const alt = $node.attr('alt') || 'image';
          return src ? `\n![${alt}](${src})\n` : '';
        case 'ul':
          return (
            '\n' +
            children
              .map((child) => {
                if ((child as Element).tagName?.toLowerCase() === 'li') {
                  return `- ${processNode(child).trim()}`;
                }
                return '';
              })
              .filter(Boolean)
              .join('\n') +
            '\n\n'
          );
        case 'ol':
          let counter = 1;
          return (
            '\n' +
            children
              .map((child) => {
                if ((child as Element).tagName?.toLowerCase() === 'li') {
                  return `${counter++}. ${processNode(child).trim()}`;
                }
                return '';
              })
              .filter(Boolean)
              .join('\n') +
            '\n\n'
          );
        case 'li':
          return childContent;
        case 'blockquote':
          return `\n> ${childContent.trim().replace(/\n/g, '\n> ')}\n\n`;
        case 'code':
          return `\`${childContent}\``;
        case 'pre':
          return `\n\`\`\`\n${childContent}\n\`\`\`\n\n`;
        case 'hr':
          return '\n---\n\n';
        case 'br':
          return '\n';
        case 'table':
          return this.processTable($node as cheerio.Cheerio<Element>);
        default:
          return childContent;
      }
    };

    $('body')
      .contents()
      .each((_, el) => {
        markdown += processNode(el);
      });

    // Clean up excessive newlines
    return markdown.replace(/\n{3,}/g, '\n\n').trim();
  }

  private processTable($table: cheerio.Cheerio<Element>): string {
    const $ = cheerio.load($table.html() || '');
    const rows: string[][] = [];

    $('tr').each((_, tr) => {
      const row: string[] = [];
      $(tr)
        .find('th, td')
        .each((_, cell) => {
          row.push($(cell).text().trim());
        });
      if (row.length > 0) {
        rows.push(row);
      }
    });

    if (rows.length === 0) return '';

    const lines: string[] = [];
    const maxCols = Math.max(...rows.map((r) => r.length));

    // Header row
    const header = rows[0];
    while (header.length < maxCols) header.push('');
    lines.push('| ' + header.join(' | ') + ' |');

    // Separator
    lines.push('| ' + header.map(() => '---').join(' | ') + ' |');

    // Data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      while (row.length < maxCols) row.push('');
      lines.push('| ' + row.join(' | ') + ' |');
    }

    return '\n' + lines.join('\n') + '\n\n';
  }
}
