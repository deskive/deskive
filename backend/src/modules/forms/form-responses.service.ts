import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { FormsService } from './forms.service';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { FormResponse, FieldType, FormStatus } from './entities/form.types';
import { Parser } from 'json2csv';

@Injectable()
export class FormResponsesService {
  constructor(
    private readonly db: DatabaseService,
    private formsService: FormsService,
  ) {}

  /**
   * Transform database row to camelCase
   */
  private transformResponseToCamelCase(response: any): FormResponse {
    return {
      id: response.id,
      formId: response.form_id,
      workspaceId: response.workspace_id,
      respondentId: response.respondent_id,
      respondentEmail: response.respondent_email,
      respondentName: response.respondent_name,
      responses: typeof response.responses === 'string'
        ? JSON.parse(response.responses)
        : response.responses,
      ipAddress: response.ip_address,
      userAgent: response.user_agent,
      submissionTimeSeconds: response.submission_time_seconds,
      status: response.status,
      isComplete: response.is_complete,
      submittedAt: response.submitted_at,
      updatedAt: response.updated_at,
    };
  }

  /**
   * Validate response against form schema
   */
  private validateResponse(formFields: any[], responseData: Record<string, any>): void {
    for (const field of formFields) {
      const response = responseData[field.id];

      // Check required fields
      if (field.required && !response) {
        throw new BadRequestException(`Field "${field.label}" is required`);
      }

      if (!response) continue;

      const value = response.value;

      // Validate field types
      switch (field.type) {
        case FieldType.EMAIL:
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new BadRequestException(`Invalid email format for field "${field.label}"`);
          }
          break;

        case FieldType.URL:
          try {
            new URL(value);
          } catch {
            throw new BadRequestException(`Invalid URL format for field "${field.label}"`);
          }
          break;

        case FieldType.NUMBER:
          if (isNaN(value)) {
            throw new BadRequestException(`Invalid number for field "${field.label}"`);
          }
          if (field.validation?.min !== undefined && value < field.validation.min) {
            throw new BadRequestException(`Value for "${field.label}" must be at least ${field.validation.min}`);
          }
          if (field.validation?.max !== undefined && value > field.validation.max) {
            throw new BadRequestException(`Value for "${field.label}" must be at most ${field.validation.max}`);
          }
          break;

        case FieldType.SHORT_TEXT:
        case FieldType.LONG_TEXT:
          if (typeof value !== 'string') {
            throw new BadRequestException(`Invalid text format for field "${field.label}"`);
          }
          if (field.validation?.minLength && value.length < field.validation.minLength) {
            throw new BadRequestException(
              `"${field.label}" must be at least ${field.validation.minLength} characters`,
            );
          }
          if (field.validation?.maxLength && value.length > field.validation.maxLength) {
            throw new BadRequestException(
              `"${field.label}" must be at most ${field.validation.maxLength} characters`,
            );
          }
          break;

        case FieldType.SINGLE_CHOICE:
        case FieldType.DROPDOWN:
          if (!field.options?.includes(value) && !(field.allowOther && value)) {
            throw new BadRequestException(`Invalid option selected for field "${field.label}"`);
          }
          break;

        case FieldType.MULTIPLE_CHOICE:
          if (!Array.isArray(value)) {
            throw new BadRequestException(`"${field.label}" must be an array`);
          }
          for (const option of value) {
            if (!field.options?.includes(option) && !(field.allowOther && option)) {
              throw new BadRequestException(`Invalid option "${option}" for field "${field.label}"`);
            }
          }
          break;

        case FieldType.RATING:
        case FieldType.SCALE:
          const scale = field.scale || { min: 1, max: 5 };
          if (value < scale.min || value > scale.max) {
            throw new BadRequestException(
              `"${field.label}" must be between ${scale.min} and ${scale.max}`,
            );
          }
          break;
      }
    }
  }

  /**
   * Submit a response to a form
   */
  async submitResponse(
    formId: string,
    dto: SubmitResponseDto,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    workspaceId?: string,
  ): Promise<FormResponse> {
    // Get form
    const formResult = await this.db
      .table('form_templates')
      .select('*')
      .where('id', '=', formId)
      .where('is_deleted', '=', false)
      .execute();

    if (!formResult.data || formResult.data.length === 0) {
      throw new NotFoundException('Form not found');
    }

    const form = formResult.data[0];

    // Check if form is published
    if (form.status !== FormStatus.PUBLISHED) {
      throw new ForbiddenException('Form is not accepting responses');
    }

    // Check if form is closed
    if (form.status === FormStatus.CLOSED) {
      throw new ForbiddenException('Form is closed and not accepting new responses');
    }

    // Parse settings
    const settings = form.settings;

    // Check if form requires login
    if (settings.requireLogin && !userId) {
      throw new ForbiddenException('You must be logged in to submit this form');
    }

    // Check if form allows multiple submissions
    if (!settings.allowMultipleSubmissions && userId) {
      const existingResponse = await this.db
        .table('form_responses')
        .select('id')
        .where('form_id', '=', formId)
        .where('respondent_id', '=', userId)
        .execute();

      if (existingResponse.data && existingResponse.data.length > 0) {
        throw new BadRequestException('You have already submitted a response to this form');
      }
    }

    // Check max responses
    if (settings.maxResponses && form.response_count >= settings.maxResponses) {
      throw new ForbiddenException('This form has reached its maximum number of responses');
    }

    // Validate response
    this.validateResponse(form.fields, dto.responses);

    // Insert response
    const result = await this.db
      .table('form_responses')
      .insert({
        form_id: formId,
        workspace_id: workspaceId || form.workspace_id,
        respondent_id: userId || null,
        respondent_email: dto.respondentEmail || null,
        respondent_name: dto.respondentName || null,
        responses: JSON.stringify(dto.responses),
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        submission_time_seconds: dto.submissionTimeSeconds || null,
        is_complete: dto.isComplete !== false,
      })
      .returning('*')
      .execute();

    // Update form response count
    await this.db
      .table('form_templates')
      .update({
        response_count: form.response_count + 1,
      })
      .where('id', '=', formId)
      .execute();

    // Send notifications if enabled
    if (settings.notifyOnSubmission && settings.notifyEmails?.length > 0) {
      // TODO: Implement email notification
      // This would use the DatabaseService email module
    }

    return this.transformResponseToCamelCase(result.data[0]);
  }

  /**
   * Get all responses for a form
   */
  async findAll(
    formId: string,
    workspaceId: string,
    userId: string,
    limit = 100,
    offset = 0,
  ): Promise<{ data: FormResponse[]; total: number }> {
    // Verify user has access to form
    await this.formsService.findOne(formId, workspaceId, userId);

    // Get total count
    const countResult = await this.db
      .table('form_responses')
      .select('COUNT(*) as count')
      .where('form_id', '=', formId)
      .execute();

    const total = parseInt(countResult.data[0].count, 10);

    // Get responses
    const results = await this.db
      .table('form_responses')
      .select('*')
      .where('form_id', '=', formId)
      .orderBy('submitted_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .execute();

    const data = (results.data || []).map((response: any) => this.transformResponseToCamelCase(response));

    return { data, total };
  }

  /**
   * Get a single response
   */
  async findOne(
    responseId: string,
    formId: string,
    workspaceId: string,
    userId: string,
  ): Promise<FormResponse> {
    // Verify user has access to form
    await this.formsService.findOne(formId, workspaceId, userId);

    const result = await this.db
      .table('form_responses')
      .select('*')
      .where('id', '=', responseId)
      .where('form_id', '=', formId)
      .execute();

    if (!result.data || result.data.length === 0) {
      throw new NotFoundException('Response not found');
    }

    return this.transformResponseToCamelCase(result.data[0]);
  }

  /**
   * Delete a response
   */
  async remove(
    responseId: string,
    formId: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    // Verify user has access to form
    await this.formsService.findOne(formId, workspaceId, userId);

    const result = await this.db
      .table('form_responses')
      .delete()
      .where('id', '=', responseId)
      .where('form_id', '=', formId)
      .execute();

    if (!result.data || result.data.length === 0) {
      throw new NotFoundException('Response not found');
    }

    // Update form response count
    await this.db
      .table('form_templates')
      .update({
        response_count: this.db.raw('response_count - 1'),
      })
      .where('id', '=', formId)
      .execute();
  }

  /**
   * Export responses to CSV
   */
  async exportToCSV(formId: string, workspaceId: string, userId: string): Promise<string> {
    // Get form
    const form = await this.formsService.findOne(formId, workspaceId, userId);

    // Get all responses
    const results = await this.db
      .table('form_responses')
      .select('*')
      .where('form_id', '=', formId)
      .orderBy('submitted_at', 'DESC')
      .execute();

    if (!results.data || results.data.length === 0) {
      throw new BadRequestException('No responses to export');
    }

    // Transform data for CSV
    const csvData = (results.data || []).map((response: any) => {
      const row: any = {
        'Response ID': response.id,
        'Submitted At': response.submitted_at,
        'Respondent Email': response.respondent_email || '',
        'Respondent Name': response.respondent_name || '',
        'Completion Time (seconds)': response.submission_time_seconds || '',
      };

      // Add field responses
      // Parse responses if they're stored as JSON string
      const responses = typeof response.responses === 'string'
        ? JSON.parse(response.responses)
        : response.responses;

      for (const field of form.fields) {
        const fieldResponse = responses[field.id];
        if (fieldResponse) {
          let value = fieldResponse.value;
          // Convert arrays to comma-separated strings
          if (Array.isArray(value)) {
            value = value.join(', ');
          }
          row[field.label] = value;
        } else {
          row[field.label] = '';
        }
      }

      return row;
    });

    // Generate CSV
    const parser = new Parser();
    const csv = parser.parse(csvData);

    return csv;
  }

  /**
   * Get response summary statistics
   */
  async getSummary(formId: string, workspaceId: string, userId: string): Promise<any> {
    // Verify user has access to form
    const form = await this.formsService.findOne(formId, workspaceId, userId);

    // Get total responses
    const countResult = await this.db
      .table('form_responses')
      .select('COUNT(*) as count')
      .where('form_id', '=', formId)
      .execute();

    const totalResponses = countResult.data && countResult.data[0]
      ? parseInt(countResult.data[0].count, 10)
      : 0;

    // Get avg completion time
    const avgTimeResult = await this.db
      .table('form_responses')
      .select('AVG(submission_time_seconds) as avg_time')
      .where('form_id', '=', formId)
      .where('submission_time_seconds', 'IS NOT', null)
      .execute();

    const avgCompletionTime = avgTimeResult.data && avgTimeResult.data[0].avg_time
      ? Math.round(parseFloat(avgTimeResult.data[0].avg_time))
      : null;

    // Calculate completion rate
    const completionRate = form.viewCount > 0
      ? ((totalResponses / form.viewCount) * 100).toFixed(2)
      : 0;

    return {
      totalViews: form.viewCount,
      totalResponses,
      completionRate: parseFloat(completionRate as string),
      avgCompletionTimeSeconds: avgCompletionTime,
    };
  }
}
