/**
 * Slug Utilities
 * Generate and validate URL-friendly slugs for SEO
 */

/**
 * Generate a URL-friendly slug from a string
 * @param text - Input text to slugify
 * @returns URL-safe slug
 *
 * @example
 * generateSlug("Hello World!") // "hello-world"
 * generateSlug("10 Tips for Success") // "10-tips-for-success"
 * generateSlug("React & TypeScript Guide") // "react-typescript-guide"
 */
export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove all non-word characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/\-\-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Validate if a string is a valid slug
 * @param slug - String to validate
 * @returns True if valid slug format
 *
 * @example
 * isValidSlug("hello-world") // true
 * isValidSlug("Hello World") // false (has spaces)
 * isValidSlug("hello_world") // false (has underscore)
 */
export function isValidSlug(slug: string): boolean {
  // Slug pattern: lowercase alphanumeric with hyphens
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}

/**
 * Sanitize a slug by removing invalid characters
 * More lenient than generateSlug - preserves existing structure
 * @param slug - Slug to sanitize
 * @returns Sanitized slug
 *
 * @example
 * sanitizeSlug("Hello-World") // "hello-world"
 * sanitizeSlug("my--slug") // "my-slug"
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    // Remove invalid characters
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Generate a unique slug by appending a number if needed
 * @param baseSlug - Base slug to make unique
 * @param existingSlugs - Array of existing slugs to check against
 * @returns Unique slug
 *
 * @example
 * makeUniqueSlug("my-post", ["my-post"]) // "my-post-2"
 * makeUniqueSlug("my-post", ["my-post", "my-post-2"]) // "my-post-3"
 */
export function makeUniqueSlug(
  baseSlug: string,
  existingSlugs: string[]
): string {
  let slug = baseSlug;
  let counter = 2;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Extract the base slug without numeric suffix
 * @param slug - Slug with potential numeric suffix
 * @returns Base slug without suffix
 *
 * @example
 * getBaseSlug("my-post-2") // "my-post"
 * getBaseSlug("my-post") // "my-post"
 */
export function getBaseSlug(slug: string): string {
  return slug.replace(/-\d+$/, '');
}

/**
 * Generate slug from title with optional max length
 * @param title - Title to convert to slug
 * @param maxLength - Maximum length of slug (default: 60)
 * @returns Truncated slug
 *
 * @example
 * generateSlugFromTitle("This is a very long title that needs truncation", 20)
 * // "this-is-a-very-long"
 */
export function generateSlugFromTitle(
  title: string,
  maxLength: number = 60
): string {
  const slug = generateSlug(title);

  if (slug.length <= maxLength) {
    return slug;
  }

  // Truncate at word boundary
  const truncated = slug.substring(0, maxLength);
  const lastHyphen = truncated.lastIndexOf('-');

  // If there's a hyphen in the latter half, truncate there
  if (lastHyphen > maxLength / 2) {
    return truncated.substring(0, lastHyphen);
  }

  // Otherwise, return full truncated string
  return truncated.replace(/-+$/, '');
}

/**
 * Suggest alternative slugs based on a base slug
 * @param baseSlug - Base slug to generate alternatives for
 * @param count - Number of alternatives to generate
 * @returns Array of alternative slugs
 *
 * @example
 * suggestSlugs("my-post", 3)
 * // ["my-post-2", "my-post-3", "my-post-4"]
 */
export function suggestSlugs(baseSlug: string, count: number = 5): string[] {
  const suggestions: string[] = [];

  for (let i = 2; i <= count + 1; i++) {
    suggestions.push(`${baseSlug}-${i}`);
  }

  return suggestions;
}

/**
 * Validate slug against common SEO best practices
 * @param slug - Slug to validate
 * @returns Validation result with messages
 *
 * @example
 * validateSlugQuality("my-awesome-post")
 * // { valid: true, warnings: [] }
 *
 * validateSlugQuality("a")
 * // { valid: false, warnings: ["Slug is too short (minimum 3 characters)"] }
 */
export function validateSlugQuality(slug: string): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check minimum length
  if (slug.length < 3) {
    warnings.push('Slug is too short (minimum 3 characters)');
  }

  // Check maximum length
  if (slug.length > 100) {
    warnings.push('Slug is too long (maximum 100 characters recommended)');
  }

  // Check for numbers at start
  if (/^\d/.test(slug)) {
    warnings.push('Slug starts with a number (not recommended)');
  }

  // Check for too many hyphens
  const hyphenCount = (slug.match(/-/g) || []).length;
  if (hyphenCount > 5) {
    warnings.push('Slug has too many hyphens (simplify for better SEO)');
  }

  // Check for single character words
  if (/-\w-/.test(slug)) {
    warnings.push('Slug contains single-character words (may hurt readability)');
  }

  return {
    valid: warnings.length === 0 && isValidSlug(slug),
    warnings,
  };
}

/**
 * Convert slug back to readable title
 * @param slug - Slug to convert
 * @returns Readable title
 *
 * @example
 * slugToTitle("my-awesome-post") // "My Awesome Post"
 * slugToTitle("10-tips-for-success") // "10 Tips For Success"
 */
export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Common slug patterns for different content types
 */
export const SLUG_PATTERNS = {
  blogPost: (title: string) => generateSlugFromTitle(title, 60),
  product: (name: string) => generateSlugFromTitle(name, 40),
  category: (name: string) => generateSlugFromTitle(name, 30),
  tag: (name: string) => generateSlug(name),
  user: (username: string) => sanitizeSlug(username),
} as const;
