import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FormsService } from './forms.service';
import { FieldType } from './entities/form.types';

@Injectable()
export class FormAnalyticsService {
  constructor(
    private readonly db: DatabaseService,
    private formsService: FormsService,
  ) {}

  /**
   * Calculate and update analytics for a form
   */
  async calculateAnalytics(formId: string, workspaceId: string, userId: string): Promise<any> {
    // Verify user has access to form
    const form = await this.formsService.findOne(formId, workspaceId, userId);

    // Get all responses
    const responses = await this.db
      .table('form_responses')
      .select('*')
      .where('form_id', '=', formId)
      .execute();

    const totalResponses = (responses.data || []).length;
    const totalViews = form.viewCount;

    // Calculate completion rate
    const completionRate = totalViews > 0 ? (totalResponses / totalViews) * 100 : 0;

    // Calculate average completion time
    const completionTimes = (responses.data || [])
      .filter((r: any) => r.submission_time_seconds)
      .map((r: any) => r.submission_time_seconds);

    const avgCompletionTime =
      completionTimes.length > 0
        ? Math.round(
            completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length,
          )
        : null;

    // Calculate field-level statistics
    const fieldStats: Record<string, any> = {};

    for (const field of form.fields) {
      const fieldId = field.id;
      const fieldResponses = (responses.data || [])
        .map((r: any) => r.responses[fieldId])
        .filter((r: any) => r !== undefined && r !== null);

      fieldStats[fieldId] = {
        responseCount: fieldResponses.length,
        responseRate:
          totalResponses > 0 ? ((fieldResponses.length / totalResponses) * 100).toFixed(2) : 0,
      };

      // Calculate specific stats based on field type
      switch (field.type) {
        case FieldType.SINGLE_CHOICE:
        case FieldType.DROPDOWN:
        case FieldType.MULTIPLE_CHOICE:
          fieldStats[fieldId].topAnswers = this.calculateTopAnswers(fieldResponses, field.type);
          break;

        case FieldType.RATING:
        case FieldType.SCALE:
          fieldStats[fieldId].averageRating = this.calculateAverageRating(fieldResponses);
          fieldStats[fieldId].ratingDistribution = this.calculateRatingDistribution(
            fieldResponses,
            field.scale || { min: 1, max: 5 },
          );
          break;

        case FieldType.NUMBER:
          const numbers = fieldResponses
            .map((r: any) => parseFloat(r.value))
            .filter((n: number) => !isNaN(n));
          if (numbers.length > 0) {
            fieldStats[fieldId].average = (
              numbers.reduce((a: number, b: number) => a + b, 0) / numbers.length
            ).toFixed(2);
            fieldStats[fieldId].min = Math.min(...numbers);
            fieldStats[fieldId].max = Math.max(...numbers);
          }
          break;

        case FieldType.SHORT_TEXT:
        case FieldType.LONG_TEXT:
          const texts = fieldResponses.map((r: any) => r.value);
          const avgLength =
            texts.length > 0
              ? Math.round(
                  texts.reduce((sum: number, text: string) => sum + text.length, 0) / texts.length,
                )
              : 0;
          fieldStats[fieldId].averageLength = avgLength;
          fieldStats[fieldId].commonWords = this.extractCommonWords(texts);
          break;
      }
    }

    // Check if analytics record exists
    const existingAnalytics = await this.db
      .table('form_analytics')
      .select('*')
      .where('form_id', '=', formId)
      .execute();

    const analyticsData = {
      total_views: totalViews,
      total_responses: totalResponses,
      completion_rate: completionRate,
      avg_completion_time_seconds: avgCompletionTime,
      field_stats: JSON.stringify(fieldStats),
      last_calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingAnalytics.data && existingAnalytics.data.length > 0) {
      // Update existing
      await this.db
        .table('form_analytics')
        .update(analyticsData)
        .where('form_id', '=', formId)
        .execute();
    } else {
      // Insert new
      await this.db
        .table('form_analytics')
        .insert({
          form_id: formId,
          ...analyticsData,
        })
        .execute();
    }

    return {
      totalViews,
      totalResponses,
      completionRate: parseFloat(completionRate.toFixed(2)),
      avgCompletionTimeSeconds: avgCompletionTime,
      fieldStats,
    };
  }

  /**
   * Get analytics for a form
   */
  async getAnalytics(formId: string, workspaceId: string, userId: string): Promise<any> {
    // Verify user has access to form
    await this.formsService.findOne(formId, workspaceId, userId);

    // Get analytics
    const result = await this.db
      .table('form_analytics')
      .select('*')
      .where('form_id', '=', formId)
      .execute();

    if (!result.data || result.data.length === 0) {
      // Calculate if not exists
      return await this.calculateAnalytics(formId, workspaceId, userId);
    }

    const analytics = result.data[0];

    return {
      totalViews: analytics.total_views,
      totalResponses: analytics.total_responses,
      completionRate: parseFloat(analytics.completion_rate),
      avgCompletionTimeSeconds: analytics.avg_completion_time_seconds,
      fieldStats: analytics.field_stats,
      lastCalculatedAt: analytics.last_calculated_at,
    };
  }

  /**
   * Get response timeline (responses per day/week/month)
   */
  async getResponseTimeline(
    formId: string,
    workspaceId: string,
    userId: string,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ): Promise<any[]> {
    // Verify user has access to form
    await this.formsService.findOne(formId, workspaceId, userId);

    // Get responses grouped by date
    const responses = await this.db
      .table('form_responses')
      .select('submitted_at')
      .where('form_id', '=', formId)
      .orderBy('submitted_at', 'ASC')
      .execute();

    // Group by date
    const grouped = new Map<string, number>();

    for (const response of responses.data || []) {
      const date = new Date(response.submitted_at);
      let key: string;

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      grouped.set(key, (grouped.get(key) || 0) + 1);
    }

    return Array.from(grouped.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }

  /**
   * Calculate top answers for choice fields
   */
  private calculateTopAnswers(responses: any[], fieldType: FieldType): any[] {
    const counts = new Map<string, number>();

    for (const response of responses) {
      const value = response.value;

      if (fieldType === FieldType.MULTIPLE_CHOICE && Array.isArray(value)) {
        // Multiple choice - count each option
        for (const option of value) {
          counts.set(option, (counts.get(option) || 0) + 1);
        }
      } else {
        // Single choice or dropdown
        counts.set(value, (counts.get(value) || 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }

  /**
   * Calculate average rating
   */
  private calculateAverageRating(responses: any[]): number {
    const ratings = responses.map((r: any) => parseFloat(r.value)).filter((r: number) => !isNaN(r));

    if (ratings.length === 0) return 0;

    const sum = ratings.reduce((a: number, b: number) => a + b, 0);
    return parseFloat((sum / ratings.length).toFixed(2));
  }

  /**
   * Calculate rating distribution
   */
  private calculateRatingDistribution(
    responses: any[],
    scale: { min: number; max: number },
  ): any[] {
    const distribution: any[] = [];

    for (let i = scale.min; i <= scale.max; i++) {
      const count = responses.filter((r: any) => parseFloat(r.value) === i).length;
      distribution.push({
        rating: i,
        count,
        percentage: responses.length > 0 ? ((count / responses.length) * 100).toFixed(2) : 0,
      });
    }

    return distribution;
  }

  /**
   * Extract common words from text responses
   */
  private extractCommonWords(texts: string[], limit = 10): any[] {
    const words = new Map<string, number>();

    // Common stop words to exclude
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'should',
      'could',
      'may',
      'might',
      'must',
      'can',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'what',
      'which',
      'who',
      'when',
      'where',
      'why',
      'how',
      'all',
      'each',
      'every',
      'both',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      'no',
      'nor',
      'not',
      'only',
      'own',
      'same',
      'so',
      'than',
      'too',
      'very',
    ]);

    for (const text of texts) {
      const textWords = text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((word) => word.length > 3 && !stopWords.has(word));

      for (const word of textWords) {
        words.set(word, (words.get(word) || 0) + 1);
      }
    }

    return Array.from(words.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
