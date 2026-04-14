import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { PDFParse } from 'pdf-parse';

interface ExtractedImage {
  pageNumber: number;
  imageIndex: number;
  url?: string;
}

export interface PdfProcessingResult {
  markdown: string;
  images: ExtractedImage[];
  pageCount: number;
  hasTable: boolean;
}

@Injectable()
export class PdfProcessingService {
  private readonly logger = new Logger(PdfProcessingService.name);

  constructor(private readonly db: DatabaseService) {}

  async processPdfToMarkdown(
    buffer: Buffer,
    workspaceId: string,
    userId: string,
  ): Promise<PdfProcessingResult> {
    try {
      // Create PDF parser instance with buffer data
      const pdfParser = new PDFParse({
        data: buffer,
        verbosity: 0, // Suppress warnings
      });

      // Get PDF info (page count, etc.)
      const pdfInfo = await pdfParser.getInfo();
      const pageCount = pdfInfo.total || 1;

      // Get text content
      const textResult = await pdfParser.getText();
      const text = textResult.text || '';

      // Try to get tables
      let hasTable = false;
      let tableMarkdown = '';
      try {
        const tableResult = await pdfParser.getTable();
        if (tableResult.pages && tableResult.pages.length > 0) {
          for (const page of tableResult.pages) {
            if (page.tables && page.tables.length > 0) {
              hasTable = true;
              for (const table of page.tables) {
                tableMarkdown += this.convertArrayToMarkdownTable(table) + '\n\n';
              }
            }
          }
        }
      } catch (tableError) {
        this.logger.debug('Table extraction not available:', tableError);
      }

      // Process text to detect structure
      const { markdown: textMarkdown, hasTable: textHasTable } = this.processTextToMarkdown(text);

      // Combine table markdown with text markdown
      const markdown = tableMarkdown ? tableMarkdown + '\n\n---\n\n' + textMarkdown : textMarkdown;

      // Clean up
      await pdfParser.destroy();

      return {
        markdown,
        images: [], // Image extraction would need additional processing
        pageCount,
        hasTable: hasTable || textHasTable,
      };
    } catch (error) {
      this.logger.error('Failed to process PDF:', error);
      throw new Error(
        `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private convertArrayToMarkdownTable(tableArray: string[][]): string {
    if (!tableArray || tableArray.length === 0) return '';

    const lines: string[] = [];
    const header = tableArray[0];

    // Header row
    lines.push('| ' + header.join(' | ') + ' |');

    // Separator row
    lines.push('| ' + header.map(() => '---').join(' | ') + ' |');

    // Data rows
    for (let i = 1; i < tableArray.length; i++) {
      lines.push('| ' + tableArray[i].join(' | ') + ' |');
    }

    return lines.join('\n');
  }

  private processTextToMarkdown(text: string): { markdown: string; hasTable: boolean } {
    const lines = text.split('\n');
    const processedLines: string[] = [];
    let hasTable = false;
    let inTable = false;
    let tableRows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        // Empty line - might end a table
        if (inTable && tableRows.length > 0) {
          processedLines.push(this.convertToMarkdownTable(tableRows));
          tableRows = [];
          inTable = false;
        }
        processedLines.push('');
        continue;
      }

      // Detect potential table rows (multiple spaces or tabs separating columns)
      const potentialColumns = line.split(/\s{2,}|\t+/).filter((col) => col.trim());

      if (potentialColumns.length >= 2 && potentialColumns.length <= 10) {
        // Looks like a table row
        if (!inTable) {
          inTable = true;
          hasTable = true;
        }
        tableRows.push(potentialColumns);
        continue;
      } else if (inTable && tableRows.length > 0) {
        // End of table
        processedLines.push(this.convertToMarkdownTable(tableRows));
        tableRows = [];
        inTable = false;
      }

      // Detect headers (ALL CAPS lines that are short)
      if (
        line === line.toUpperCase() &&
        line.length < 100 &&
        line.length > 2 &&
        /[A-Z]/.test(line)
      ) {
        processedLines.push(`\n## ${line}\n`);
        continue;
      }

      // Detect bullet points
      if (line.startsWith('•') || line.startsWith('●') || line.startsWith('○')) {
        processedLines.push(`- ${line.substring(1).trim()}`);
        continue;
      }

      // Detect numbered lists
      if (/^\d+[\.\)]\s/.test(line)) {
        processedLines.push(line);
        continue;
      }

      // Regular paragraph
      processedLines.push(line);
    }

    // Handle any remaining table
    if (tableRows.length > 0) {
      processedLines.push(this.convertToMarkdownTable(tableRows));
    }

    // Clean up excessive blank lines
    const markdown = processedLines.join('\n').replace(/\n{3,}/g, '\n\n');

    return { markdown, hasTable };
  }

  private convertToMarkdownTable(rows: string[][]): string {
    if (rows.length === 0) return '';

    const lines: string[] = [];

    // Normalize column count
    const maxCols = Math.max(...rows.map((row) => row.length));
    const normalizedRows = rows.map((row) => {
      const normalized = [...row];
      while (normalized.length < maxCols) {
        normalized.push('');
      }
      return normalized;
    });

    // Header row (first row)
    const header = normalizedRows[0];
    lines.push('| ' + header.join(' | ') + ' |');

    // Separator row
    lines.push('| ' + header.map(() => '---').join(' | ') + ' |');

    // Data rows
    for (let i = 1; i < normalizedRows.length; i++) {
      lines.push('| ' + normalizedRows[i].join(' | ') + ' |');
    }

    return '\n' + lines.join('\n') + '\n';
  }

  /**
   * Convert markdown to HTML for the note editor
   */
  markdownToHtml(markdown: string): string {
    let html = markdown
      // Headers
      .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
      .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%;">')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Code blocks
      .replace(/```[\s\S]*?```/g, (match) => {
        const code = match.replace(/```\w*\n?/g, '').replace(/```/g, '');
        return `<pre><code>${code}</code></pre>`;
      })
      // Inline code
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr>')
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+[\.\)] (.+)$/gm, '<li>$1</li>');

    // Convert markdown tables to HTML
    html = this.convertMarkdownTableToHtml(html);

    // Wrap consecutive <li> elements in <ul>
    html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

    // Convert remaining lines to paragraphs
    html = html
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('<')) return trimmed;
        return `<p>${trimmed}</p>`;
      })
      .join('\n');

    return html || '<p></p>';
  }

  private convertMarkdownTableToHtml(markdown: string): string {
    const tableRegex = /(\|.+\|\n)+/g;

    return markdown.replace(tableRegex, (tableMatch) => {
      const rows = tableMatch
        .trim()
        .split('\n')
        .filter((row) => row.trim());

      if (rows.length < 2) return tableMatch;

      // Check if second row is separator
      const isSeparator = /^\|[\s\-:|]+\|$/.test(rows[1]);

      if (!isSeparator) return tableMatch;

      let html = '<table style="border-collapse: collapse; width: 100%; margin: 16px 0;">\n';

      // Header row
      const headerCells = rows[0].split('|').filter((cell) => cell.trim());
      html += '<thead><tr>';
      for (const cell of headerCells) {
        html += `<th style="border: 1px solid #ddd; padding: 12px; text-align: left; background-color: #f5f5f5; font-weight: 600;">${cell.trim()}</th>`;
      }
      html += '</tr></thead>\n';

      // Body rows
      html += '<tbody>';
      for (let i = 2; i < rows.length; i++) {
        const cells = rows[i].split('|').filter((cell) => cell.trim());
        html += '<tr>';
        for (const cell of cells) {
          html += `<td style="border: 1px solid #ddd; padding: 12px;">${cell.trim()}</td>`;
        }
        html += '</tr>\n';
      }
      html += '</tbody></table>\n';

      return html;
    });
  }
}
