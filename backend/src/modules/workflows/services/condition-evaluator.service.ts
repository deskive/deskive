import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConditionOperator, ConditionGroupOperator } from '../dto/workflow.dto';
import {
  SharedConditionEvaluatorService,
  AutomationCondition,
  AutomationConditionGroup,
} from '../../automation-core';

interface Condition {
  field: string;
  operator: ConditionOperator;
  value?: any;
}

interface ConditionGroup {
  operator: ConditionGroupOperator;
  conditions: (Condition | ConditionGroup)[];
}

/**
 * Workflow Condition Evaluator Service
 *
 * Delegates to SharedConditionEvaluatorService for core condition evaluation,
 * while providing workflow-specific extensions like helper functions.
 *
 * This approach eliminates code duplication while maintaining backwards compatibility.
 */
@Injectable()
export class ConditionEvaluatorService {
  private readonly logger = new Logger(ConditionEvaluatorService.name);
  private readonly sharedEvaluator: SharedConditionEvaluatorService;

  constructor(@Optional() sharedEvaluator?: SharedConditionEvaluatorService) {
    // Use injected service or create a standalone instance for backwards compatibility
    this.sharedEvaluator = sharedEvaluator || new SharedConditionEvaluatorService();
  }

  /**
   * Evaluate a condition or condition group against a context
   * Delegates to SharedConditionEvaluatorService
   */
  evaluate(conditionOrGroup: Condition | ConditionGroup, context: Record<string, any>): boolean {
    // Convert to shared interface and delegate
    return this.sharedEvaluator.evaluate(
      conditionOrGroup as unknown as AutomationCondition | AutomationConditionGroup,
      context,
    );
  }

  /**
   * Resolve a field path from context (e.g., "task.status", "trigger.task.assignee.name")
   * Delegates to SharedConditionEvaluatorService
   */
  resolveField(field: string, context: Record<string, any>): any {
    return this.sharedEvaluator.resolveField(field, context);
  }

  /**
   * Resolve a value, handling variable references like {{variable}}
   * Delegates to SharedConditionEvaluatorService
   */
  resolveValue(value: any, context: Record<string, any>): any {
    return this.sharedEvaluator.resolveValue(value, context);
  }

  /**
   * Interpolate variables in a string
   * Delegates to SharedConditionEvaluatorService
   */
  interpolate(template: string, context: Record<string, any>): string {
    return this.sharedEvaluator.interpolate(template, context);
  }

  /**
   * Interpolate all values in an object recursively
   * Delegates to SharedConditionEvaluatorService
   */
  interpolateObject(obj: any, context: Record<string, any>): any {
    return this.sharedEvaluator.interpolateObject(obj, context);
  }

  /**
   * Add helper functions to context
   * This is workflow-specific functionality not in the shared service
   */
  addHelperFunctions(context: Record<string, any>): Record<string, any> {
    return {
      ...context,
      now: new Date(),
      today: new Date().toISOString().split('T')[0],
      // Helper functions (accessible via {{function_name(args)}})
      add_days: (date: string | Date, days: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d.toISOString();
      },
      add_hours: (date: string | Date, hours: number) => {
        const d = new Date(date);
        d.setHours(d.getHours() + hours);
        return d.toISOString();
      },
      format_date: (date: string | Date, format?: string) => {
        const d = new Date(date);
        // Simple format support
        if (format === 'date') return d.toISOString().split('T')[0];
        if (format === 'time') return d.toISOString().split('T')[1].split('.')[0];
        return d.toISOString();
      },
      uppercase: (str: string) => String(str).toUpperCase(),
      lowercase: (str: string) => String(str).toLowerCase(),
      trim: (str: string) => String(str).trim(),
      length: (arr: any[]) => (Array.isArray(arr) ? arr.length : 0),
      first: (arr: any[]) => (Array.isArray(arr) ? arr[0] : undefined),
      last: (arr: any[]) => (Array.isArray(arr) ? arr[arr.length - 1] : undefined),
      join: (arr: any[], separator = ', ') => (Array.isArray(arr) ? arr.join(separator) : ''),
    };
  }
}
