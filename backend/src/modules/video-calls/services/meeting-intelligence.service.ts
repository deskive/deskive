import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import { AiProviderService } from '../../ai-provider/ai-provider.service';
import { v4 as uuidv4 } from 'uuid';

export interface ActionItem {
  id: string;
  task: string;
  assignee: string | null;
  assigneeId: string | null;
  deadline: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
}

export interface MeetingSummary {
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  decisions: string[];
  topicsDiscussed: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  participants: string[];
}

@Injectable()
export class MeetingIntelligenceService {
  private readonly logger = new Logger(MeetingIntelligenceService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }

  /**
   * Generate meeting summary and extract insights from transcript
   */
  async generateMeetingSummary(
    callId: string,
    workspaceId: string,
    transcript: string,
    participants: string[],
  ): Promise<MeetingSummary | null> {
    if (!transcript || transcript.trim().length < 50) {
      this.logger.debug(`Transcript too short for call ${callId}, skipping summary generation`);
      return null;
    }

    this.logger.log(`Generating meeting summary for call ${callId}`);

    try {
      const prompt = this.buildSummaryPrompt(transcript, participants);

      // Use database AI service for text generation
      const response = await this.aiProvider.generateText(prompt, {
        systemMessage: `You are a professional meeting analyst. Analyze meeting transcripts and provide structured summaries with actionable insights. Always respond with valid JSON.`,
      });

      const result = this.parseSummaryResponse(response.text);

      if (result) {
        // Store the summary in the database
        await this.storeMeetingSummary(callId, workspaceId, result, participants);
        this.logger.log(`Meeting summary generated and stored for call ${callId}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to generate meeting summary for call ${callId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract action items from transcript
   */
  async extractActionItems(
    callId: string,
    transcript: string,
    participants: string[],
  ): Promise<ActionItem[]> {
    if (!transcript || transcript.trim().length < 50) {
      return [];
    }

    this.logger.log(`Extracting action items for call ${callId}`);

    try {
      const prompt = this.buildActionItemsPrompt(transcript, participants);

      const response = await this.aiProvider.generateText(prompt, {
        systemMessage: `You are a task extraction specialist. Extract clear, actionable tasks from meeting transcripts. Always respond with valid JSON array.`,
      });

      const actionItems = this.parseActionItemsResponse(response.text);
      this.logger.log(`Extracted ${actionItems.length} action items for call ${callId}`);

      return actionItems;
    } catch (error) {
      this.logger.error(`Failed to extract action items for call ${callId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate quick summary for live caption display
   */
  async generateQuickSummary(transcript: string): Promise<string | null> {
    if (!transcript || transcript.length < 100) {
      return null;
    }

    try {
      const response = await this.aiProvider.summarizeText(transcript, {
        length: 'short',
      });

      return response.summary;
    } catch (error) {
      this.logger.error(`Failed to generate quick summary: ${error.message}`);
      return null;
    }
  }

  /**
   * Analyze meeting sentiment
   */
  async analyzeSentiment(transcript: string): Promise<'positive' | 'neutral' | 'negative'> {
    if (!transcript || transcript.length < 50) {
      return 'neutral';
    }

    try {
      const prompt = `Analyze the overall sentiment of this meeting transcript. Respond with ONLY one word: "positive", "neutral", or "negative".

Transcript:
${transcript.substring(0, 2000)}`;

      const response = await this.aiProvider.generateText(prompt, {
        systemMessage: 'You are a sentiment analysis expert. Respond with only one word.',
      });

      const sentiment = (response.text || '').toLowerCase().trim();

      if (sentiment.includes('positive')) return 'positive';
      if (sentiment.includes('negative')) return 'negative';
      return 'neutral';
    } catch (error) {
      this.logger.error(`Failed to analyze sentiment: ${error.message}`);
      return 'neutral';
    }
  }

  /**
   * Get meeting summary for a call
   */
  async getMeetingSummary(callId: string): Promise<any | null> {
    try {
      const summary = await this.db.findOne('meeting_summaries', {
        video_call_id: callId,
      });
      return summary;
    } catch (error) {
      this.logger.error(`Failed to get meeting summary for call ${callId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get transcript for a call
   */
  async getTranscript(callId: string): Promise<any | null> {
    try {
      const transcript = await this.db.findOne('video_call_transcripts', {
        video_call_id: callId,
      });
      return transcript;
    } catch (error) {
      this.logger.error(`Failed to get transcript for call ${callId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Process call end - generate summary if transcript exists
   */
  async processCallEnd(callId: string, workspaceId: string): Promise<void> {
    this.logger.log(`Processing call end for ${callId}`);

    try {
      // Get the transcript
      const transcript = await this.getTranscript(callId);

      if (!transcript || !transcript.full_text) {
        this.logger.debug(`No transcript found for call ${callId}, skipping summary generation`);
        return;
      }

      // Get participants
      const participantsResult = await this.db.findMany('video_call_participants', {
        video_call_id: callId,
      });
      const participants = (participantsResult.data || [])
        .map(p => p.display_name || 'Unknown')
        .filter(Boolean);

      // Generate summary
      await this.generateMeetingSummary(
        callId,
        workspaceId,
        transcript.full_text,
        participants,
      );
    } catch (error) {
      this.logger.error(`Failed to process call end for ${callId}: ${error.message}`);
    }
  }

  /**
   * Create tasks from action items
   */
  async createTasksFromActionItems(
    callId: string,
    workspaceId: string,
    projectId?: string,
  ): Promise<number> {
    try {
      const summary = await this.getMeetingSummary(callId);

      if (!summary || !summary.action_items || summary.action_items.length === 0) {
        return 0;
      }

      let tasksCreated = 0;

      for (const item of summary.action_items) {
        try {
          await this.db.insert('tasks', {
            id: uuidv4(),
            workspace_id: workspaceId,
            project_id: projectId || null,
            title: item.task,
            description: `Created from meeting action item.\nMeeting ID: ${callId}`,
            status: 'todo',
            priority: item.priority || 'medium',
            assignee_id: item.assigneeId || null,
            due_date: item.deadline || null,
            source: 'meeting',
            source_id: callId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          tasksCreated++;
        } catch (error) {
          this.logger.warn(`Failed to create task from action item: ${error.message}`);
        }
      }

      this.logger.log(`Created ${tasksCreated} tasks from meeting action items`);
      return tasksCreated;
    } catch (error) {
      this.logger.error(`Failed to create tasks from action items: ${error.message}`);
      return 0;
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private buildSummaryPrompt(transcript: string, participants: string[]): string {
    return `Analyze this meeting transcript and provide a structured summary.

Participants: ${participants.join(', ') || 'Unknown participants'}

Transcript:
${transcript.substring(0, 8000)}

Provide a JSON response with this exact structure:
{
  "summary": "A 2-3 sentence executive summary of the meeting",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "actionItems": [
    {
      "task": "Clear description of the task",
      "assignee": "Person name or null if not assigned",
      "deadline": "Date string or null if not specified",
      "priority": "high|medium|low"
    }
  ],
  "decisions": ["Decision 1", "Decision 2"],
  "topicsDiscussed": ["Topic 1", "Topic 2"],
  "sentiment": "positive|neutral|negative"
}

Important:
- Extract ONLY explicitly mentioned action items, don't infer or assume
- Include assignee name if someone was specifically assigned a task
- Mark priority as "high" if words like urgent, ASAP, critical were used
- Be concise but comprehensive`;
  }

  private buildActionItemsPrompt(transcript: string, participants: string[]): string {
    return `Extract action items from this meeting transcript.

Participants: ${participants.join(', ') || 'Unknown'}

Transcript:
${transcript.substring(0, 8000)}

Provide a JSON array of action items:
[
  {
    "task": "Clear task description",
    "assignee": "Person name or null",
    "deadline": "Date or null",
    "priority": "high|medium|low"
  }
]

Only extract explicitly mentioned tasks or commitments. Do not infer or assume tasks.`;
  }

  private parseSummaryResponse(response: string): MeetingSummary | null {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('No JSON found in summary response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || '',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        actionItems: Array.isArray(parsed.actionItems)
          ? parsed.actionItems.map((item: any) => ({
              id: uuidv4(),
              task: item.task || '',
              assignee: item.assignee || null,
              assigneeId: null,
              deadline: item.deadline || null,
              priority: item.priority || 'medium',
              status: 'pending',
            }))
          : [],
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        topicsDiscussed: Array.isArray(parsed.topicsDiscussed) ? parsed.topicsDiscussed : [],
        sentiment: parsed.sentiment || 'neutral',
        participants: [],
      };
    } catch (error) {
      this.logger.error(`Failed to parse summary response: ${error.message}`);
      return null;
    }
  }

  private parseActionItemsResponse(response: string): ActionItem[] {
    try {
      // Try to extract JSON array from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((item: any) => ({
        id: uuidv4(),
        task: item.task || '',
        assignee: item.assignee || null,
        assigneeId: null,
        deadline: item.deadline || null,
        priority: item.priority || 'medium',
        status: 'pending',
      }));
    } catch (error) {
      this.logger.error(`Failed to parse action items response: ${error.message}`);
      return [];
    }
  }

  private async storeMeetingSummary(
    callId: string,
    workspaceId: string,
    summary: MeetingSummary,
    participants: string[],
  ): Promise<void> {
    try {
      // Check if summary already exists
      const existing = await this.db.findOne('meeting_summaries', {
        video_call_id: callId,
      });

      const data = {
        video_call_id: callId,
        workspace_id: workspaceId,
        summary: summary.summary,
        key_points: summary.keyPoints,
        action_items: summary.actionItems,
        decisions: summary.decisions,
        topics_discussed: summary.topicsDiscussed,
        sentiment: summary.sentiment,
        participants: participants,
        generated_by: 'ai',
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await this.db.update('meeting_summaries', { id: existing.id }, data);
      } else {
        await this.db.insert('meeting_summaries', {
          id: uuidv4(),
          ...data,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(`Failed to store meeting summary: ${error.message}`);
      throw error;
    }
  }
}
