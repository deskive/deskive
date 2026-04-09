import { Injectable, Logger } from '@nestjs/common';

/**
 * Shared Condition Evaluator Service
 *
 * This service provides condition evaluation logic that can be used by both
 * the Workflows module and the Bots module. It combines the best of both
 * existing implementations with a unified interface.
 */

// Re-export condition operators for use by other modules
export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_OR_EQUAL = 'greater_or_equal',
  LESS_OR_EQUAL = 'less_or_equal',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  IN_LIST = 'in_list',
  NOT_IN_LIST = 'not_in_list',
  MATCHES_REGEX = 'matches_regex',
  IS_TRUE = 'is_true',
  IS_FALSE = 'is_false',
}

export enum ConditionGroupOperator {
  AND = 'and',
  OR = 'or',
}

export interface AutomationCondition {
  field: string;
  operator: ConditionOperator | string;
  value?: any;
}

export interface AutomationConditionGroup {
  operator: ConditionGroupOperator | string;
  conditions: (AutomationCondition | AutomationConditionGroup)[];
}

@Injectable()
export class SharedConditionEvaluatorService {
  protected readonly logger = new Logger(SharedConditionEvaluatorService.name);

  /**
   * Evaluate a condition or condition group against a context
   */
  evaluate(
    conditionOrGroup: AutomationCondition | AutomationConditionGroup,
    context: Record<string, any>,
  ): boolean {
    if (this.isConditionGroup(conditionOrGroup)) {
      return this.evaluateGroup(conditionOrGroup as AutomationConditionGroup, context);
    }
    return this.evaluateCondition(conditionOrGroup as AutomationCondition, context);
  }

  /**
   * Evaluate multiple conditions with a logical operator
   */
  evaluateAll(
    conditions: AutomationCondition[],
    context: Record<string, any>,
    operator: ConditionGroupOperator = ConditionGroupOperator.AND,
  ): boolean {
    if (!conditions || conditions.length === 0) return true;

    if (operator === ConditionGroupOperator.AND) {
      return conditions.every((cond) => this.evaluateCondition(cond, context));
    }
    return conditions.some((cond) => this.evaluateCondition(cond, context));
  }

  protected evaluateGroup(group: AutomationConditionGroup, context: Record<string, any>): boolean {
    const { operator, conditions } = group;
    if (!conditions || conditions.length === 0) return true;

    const op = String(operator).toLowerCase();
    if (op === 'and') {
      return conditions.every((cond) => this.evaluate(cond, context));
    }
    return conditions.some((cond) => this.evaluate(cond, context));
  }

  protected evaluateCondition(condition: AutomationCondition, context: Record<string, any>): boolean {
    const { field, operator, value } = condition;
    const actualValue = this.resolveField(field, context);
    const resolvedValue = this.resolveValue(value, context);

    try {
      const op = String(operator).toLowerCase();

      switch (op) {
        case 'equals':
        case '=':
        case '==':
          return this.equals(actualValue, resolvedValue);
        case 'not_equals':
        case '!=':
        case '<>':
          return !this.equals(actualValue, resolvedValue);
        case 'contains':
          return this.contains(actualValue, resolvedValue);
        case 'not_contains':
          return !this.contains(actualValue, resolvedValue);
        case 'starts_with':
          return this.startsWith(actualValue, resolvedValue);
        case 'ends_with':
          return this.endsWith(actualValue, resolvedValue);
        case 'greater_than':
        case '>':
          return this.greaterThan(actualValue, resolvedValue);
        case 'less_than':
        case '<':
          return this.lessThan(actualValue, resolvedValue);
        case 'greater_or_equal':
        case '>=':
          return this.greaterOrEqual(actualValue, resolvedValue);
        case 'less_or_equal':
        case '<=':
          return this.lessOrEqual(actualValue, resolvedValue);
        case 'is_empty':
          return this.isEmpty(actualValue);
        case 'is_not_empty':
          return !this.isEmpty(actualValue);
        case 'in_list':
        case 'in':
          return this.inList(actualValue, resolvedValue);
        case 'not_in_list':
        case 'not_in':
          return !this.inList(actualValue, resolvedValue);
        case 'matches_regex':
        case 'regex':
          return this.matchesRegex(actualValue, resolvedValue);
        case 'is_true':
          return actualValue === true || actualValue === 'true' || actualValue === 1;
        case 'is_false':
          return actualValue === false || actualValue === 'false' || actualValue === 0;
        default:
          this.logger.warn(`Unknown operator: ${operator}`);
          return false;
      }
    } catch (error) {
      this.logger.error(`Error evaluating condition: ${error.message}`);
      return false;
    }
  }

  resolveField(field: string, context: Record<string, any>): any {
    if (!field) return undefined;
    const parts = field.split('.');
    let current: any = context;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        current = current[arrayMatch[1]]?.[parseInt(arrayMatch[2], 10)];
      } else {
        current = current[part];
      }
    }
    return current;
  }

  resolveValue(value: any, context: Record<string, any>): any {
    if (typeof value !== 'string') return value;

    const variableMatch = value.match(/^\{\{(.+)\}\}$/);
    if (variableMatch) {
      return this.resolveField(variableMatch[1].trim(), context);
    }

    if (value.includes('{{')) {
      return value.replace(/\{\{(.+?)\}\}/g, (_, varName) => {
        const resolved = this.resolveField(varName.trim(), context);
        return resolved !== undefined ? String(resolved) : '';
      });
    }

    return value;
  }

  private isConditionGroup(value: any): boolean {
    return value && 'operator' in value && 'conditions' in value && Array.isArray(value.conditions);
  }

  // Comparison methods
  private equals(a: any, b: any): boolean {
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    if (a instanceof Date) return a.getTime() === new Date(b).getTime();
    if (b instanceof Date) return new Date(a).getTime() === b.getTime();
    if (typeof a === 'string' && typeof b === 'string') return a.toLowerCase() === b.toLowerCase();
    if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
    return a === b;
  }

  private contains(haystack: any, needle: any): boolean {
    if (Array.isArray(haystack)) return haystack.some((item) => this.equals(item, needle));
    if (typeof haystack === 'string' && typeof needle === 'string') {
      return haystack.toLowerCase().includes(needle.toLowerCase());
    }
    return false;
  }

  private startsWith(value: any, prefix: any): boolean {
    return typeof value === 'string' && typeof prefix === 'string' &&
      value.toLowerCase().startsWith(prefix.toLowerCase());
  }

  private endsWith(value: any, suffix: any): boolean {
    return typeof value === 'string' && typeof suffix === 'string' &&
      value.toLowerCase().endsWith(suffix.toLowerCase());
  }

  private greaterThan(a: any, b: any): boolean {
    if (this.isDateLike(a)) {
      return new Date(a).getTime() > new Date(b).getTime();
    }
    return Number(a) > Number(b);
  }

  private lessThan(a: any, b: any): boolean {
    if (this.isDateLike(a)) {
      return new Date(a).getTime() < new Date(b).getTime();
    }
    return Number(a) < Number(b);
  }

  private greaterOrEqual(a: any, b: any): boolean {
    return this.greaterThan(a, b) || this.equals(a, b);
  }

  private lessOrEqual(a: any, b: any): boolean {
    return this.lessThan(a, b) || this.equals(a, b);
  }

  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  private inList(value: any, list: any): boolean {
    if (!Array.isArray(list)) {
      try { list = JSON.parse(list); } catch { list = [list]; }
    }
    return list.some((item: any) => this.equals(value, item));
  }

  private matchesRegex(value: any, pattern: any): boolean {
    if (typeof value !== 'string' || typeof pattern !== 'string') return false;
    try {
      return new RegExp(pattern, 'i').test(value);
    } catch {
      return false;
    }
  }

  private isDateLike(value: any): boolean {
    if (value instanceof Date) return true;
    if (typeof value === 'string') return !isNaN(new Date(value).getTime());
    return false;
  }

  // Interpolation helpers
  interpolate(template: string, context: Record<string, any>): string {
    if (!template || typeof template !== 'string') return template;
    return template.replace(/\{\{(.+?)\}\}/g, (_, varName) => {
      const resolved = this.resolveField(varName.trim(), context);
      return resolved !== undefined ? String(resolved) : '';
    });
  }

  interpolateObject(obj: any, context: Record<string, any>): any {
    if (typeof obj === 'string') return this.interpolate(obj, context);
    if (Array.isArray(obj)) return obj.map((item) => this.interpolateObject(item, context));
    if (typeof obj === 'object' && obj !== null) {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, context);
      }
      return result;
    }
    return obj;
  }
}
