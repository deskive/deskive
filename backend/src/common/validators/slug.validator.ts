/**
 * Slug Validator
 * Custom validator decorator for validating URL-friendly slugs in DTOs
 */

import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Check if a string is a valid slug format
 */
export function isValidSlug(slug: string): boolean {
  // Slug pattern: lowercase alphanumeric with hyphens, no consecutive hyphens
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}

/**
 * IsSlug decorator
 * Validates that a string is a properly formatted URL slug
 *
 * @param validationOptions - Optional validation options
 *
 * @example
 * class CreatePostDto {
 *   @IsSlug({ message: 'Slug must be URL-friendly' })
 *   slug: string;
 * }
 */
export function IsSlug(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSlug',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          return isValidSlug(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid URL slug (lowercase letters, numbers, and hyphens only)`;
        },
      },
    });
  };
}

/**
 * IsSlugWithLength decorator
 * Validates slug format and enforces length constraints
 *
 * @param minLength - Minimum length (default: 3)
 * @param maxLength - Maximum length (default: 100)
 * @param validationOptions - Optional validation options
 *
 * @example
 * class CreatePostDto {
 *   @IsSlugWithLength(3, 60)
 *   slug: string;
 * }
 */
export function IsSlugWithLength(
  minLength: number = 3,
  maxLength: number = 100,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSlugWithLength',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [minLength, maxLength],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          const [min, max] = args.constraints;

          // Check length
          if (value.length < min || value.length > max) {
            return false;
          }

          // Check slug format
          return isValidSlug(value);
        },
        defaultMessage(args: ValidationArguments) {
          const [min, max] = args.constraints;
          return `${args.property} must be a valid URL slug between ${min} and ${max} characters`;
        },
      },
    });
  };
}

/**
 * IsSlugUnique decorator
 * Validates that slug is unique in the system
 * Note: This requires async validation and database access
 *
 * @param tableName - Database table name to check uniqueness
 * @param validationOptions - Optional validation options
 *
 * @example
 * class CreatePostDto {
 *   @IsSlugUnique('posts')
 *   slug: string;
 * }
 */
export function IsSlugUnique(tableName: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSlugUnique',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [tableName],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Note: This is a placeholder
          // In production, this should query the database
          // Use async validation with validateOrReject
          if (typeof value !== 'string') {
            return false;
          }

          // TODO: Implement database uniqueness check
          // Example:
          // const [table] = args.constraints;
          // return checkSlugUniqueness(table, value);

          return isValidSlug(value);
        },
        defaultMessage(args: ValidationArguments) {
          const [table] = args.constraints;
          return `${args.property} must be unique in ${table}`;
        },
      },
    });
  };
}

/**
 * Slug utility functions for backend
 */
export class SlugUtils {
  /**
   * Generate a URL-friendly slug from a string
   */
  static generateSlug(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  /**
   * Sanitize an existing slug
   */
  static sanitizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  /**
   * Validate slug format
   */
  static validate(slug: string): boolean {
    return isValidSlug(slug);
  }
}
