/**
 * Slug Service
 * Generates unique SEO-friendly slugs with database uniqueness checking
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SlugUtils } from '../../common/validators/slug.validator';

@Injectable()
export class SlugService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Generate a unique slug from a title
   * Checks database for uniqueness and appends number if needed
   *
   * @param title - Title to convert to slug
   * @param tableName - Database table to check uniqueness
   * @param columnName - Column name for slug (default: 'slug')
   * @param excludeId - Optional ID to exclude from uniqueness check (for updates)
   * @returns Unique slug
   *
   * @example
   * await generateUniqueSlug('My Blog Post', 'blog_posts')
   * // Returns: "my-blog-post" or "my-blog-post-2" if exists
   */
  async generateUniqueSlug(
    title: string,
    tableName: string,
    columnName: string = 'slug',
    excludeId?: string,
  ): Promise<string> {
    // Generate base slug from title
    const baseSlug = SlugUtils.generateSlug(title);

    // Check if slug is unique
    const isUnique = await this.isSlugUnique(
      baseSlug,
      tableName,
      columnName,
      excludeId,
    );

    if (isUnique) {
      return baseSlug;
    }

    // If not unique, append number
    return await this.generateNumberedSlug(
      baseSlug,
      tableName,
      columnName,
      excludeId,
    );
  }

  /**
   * Check if a slug is unique in a table
   *
   * @param slug - Slug to check
   * @param tableName - Database table name
   * @param columnName - Column name for slug
   * @param excludeId - Optional ID to exclude from check
   * @returns True if slug is unique
   */
  async isSlugUnique(
    slug: string,
    tableName: string,
    columnName: string = 'slug',
    excludeId?: string,
  ): Promise<boolean> {
    try {
      let query = this.db
        .table(tableName)
        .select('id')
        .where(columnName, '=', slug);

      // Exclude specific ID if provided (for updates)
      if (excludeId) {
        query = query.where('id', '!=', excludeId);
      }

      const result = await query.execute();
      const data = result.data || [];

      return data.length === 0;
    } catch (error) {
      // If table doesn't exist or query fails, assume unique
      console.error(`Error checking slug uniqueness: ${error.message}`);
      return true;
    }
  }

  /**
   * Generate a numbered slug (slug-2, slug-3, etc.)
   *
   * @param baseSlug - Base slug without number
   * @param tableName - Database table name
   * @param columnName - Column name for slug
   * @param excludeId - Optional ID to exclude
   * @returns Unique numbered slug
   */
  private async generateNumberedSlug(
    baseSlug: string,
    tableName: string,
    columnName: string,
    excludeId?: string,
  ): Promise<string> {
    let counter = 2;
    let slug = `${baseSlug}-${counter}`;

    // Keep trying until we find a unique slug
    while (
      !(await this.isSlugUnique(slug, tableName, columnName, excludeId))
    ) {
      counter++;
      slug = `${baseSlug}-${counter}`;

      // Safety limit to prevent infinite loop
      if (counter > 1000) {
        // Append random string to ensure uniqueness
        const random = Math.random().toString(36).substring(2, 8);
        slug = `${baseSlug}-${random}`;
        break;
      }
    }

    return slug;
  }

  /**
   * Validate a slug format
   *
   * @param slug - Slug to validate
   * @returns True if valid format
   */
  validateSlugFormat(slug: string): boolean {
    return SlugUtils.validate(slug);
  }

  /**
   * Sanitize a user-provided slug
   * Converts to proper format and checks uniqueness
   *
   * @param slug - User-provided slug
   * @param tableName - Database table name
   * @param columnName - Column name for slug
   * @param excludeId - Optional ID to exclude
   * @returns Sanitized unique slug
   */
  async sanitizeAndEnsureUnique(
    slug: string,
    tableName: string,
    columnName: string = 'slug',
    excludeId?: string,
  ): Promise<string> {
    // Sanitize the slug
    const sanitized = SlugUtils.sanitizeSlug(slug);

    // Check if unique
    const isUnique = await this.isSlugUnique(
      sanitized,
      tableName,
      columnName,
      excludeId,
    );

    if (isUnique) {
      return sanitized;
    }

    // Generate numbered version
    return await this.generateNumberedSlug(
      sanitized,
      tableName,
      columnName,
      excludeId,
    );
  }

  /**
   * Find all slugs matching a pattern
   * Useful for finding related slugs or suggesting alternatives
   *
   * @param pattern - Slug pattern (e.g., "my-post%")
   * @param tableName - Database table name
   * @param columnName - Column name for slug
   * @returns Array of matching slugs
   */
  async findSlugsLike(
    pattern: string,
    tableName: string,
    columnName: string = 'slug',
  ): Promise<string[]> {
    try {
      const result = await this.db
        .table(tableName)
        .select(columnName)
        .whereLike(columnName, pattern)
        .execute();

      const data = result.data || [];
      return data.map((row) => row[columnName]);
    } catch (error) {
      console.error(`Error finding slugs: ${error.message}`);
      return [];
    }
  }

  /**
   * Suggest alternative slugs if the desired one is taken
   *
   * @param desiredSlug - Desired slug
   * @param tableName - Database table name
   * @param count - Number of suggestions to return
   * @returns Array of available slug suggestions
   */
  async suggestAlternativeSlugs(
    desiredSlug: string,
    tableName: string,
    count: number = 5,
  ): Promise<string[]> {
    const suggestions: string[] = [];
    const baseSlug = SlugUtils.sanitizeSlug(desiredSlug);

    for (let i = 2; i <= count + 1; i++) {
      const suggestion = `${baseSlug}-${i}`;
      const isUnique = await this.isSlugUnique(suggestion, tableName);

      if (isUnique) {
        suggestions.push(suggestion);
      }

      if (suggestions.length >= count) {
        break;
      }
    }

    return suggestions;
  }
}
