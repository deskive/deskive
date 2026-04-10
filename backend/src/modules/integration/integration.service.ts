import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class IntegrationService {
  constructor(private readonly db: DatabaseService) {}
  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }


  // ============================================
  // VIDEO CALLS (Using database LiveKit)
  // ============================================

  async createVideoCall(workspaceId: string, channelId?: string, conversationId?: string, userId?: string) {
    try {
      // Generate unique room name
      const roomName = `deskive-${workspaceId}-${uuidv4()}`;

      // Create video call session record
      const sessionData = {
        workspace_id: workspaceId,
        channel_id: channelId,
        conversation_id: conversationId,
        room_name: roomName,
        started_by: userId,
        started_at: new Date().toISOString()
      };

      const session = await this.db.insert('video_call_sessions', sessionData);

      // Use database for video call functionality
      // The SDK abstracts the underlying LiveKit implementation
      const videoCallData = {
        room: roomName,
        identity: userId || 'anonymous',
        metadata: {
          workspace_id: workspaceId,
          session_id: session.id
        }
      };

      // Generate meeting URL or token (implementation depends on database)
      const meetingUrl = `${process.env.FRONTEND_URL}/video-call/${roomName}`;

      return {
        session_id: session.id,
        room_name: roomName,
        meeting_url: meetingUrl,
        ...videoCallData
      };
    } catch (error) {
      console.error('Video call creation error:', error);
      throw error;
    }
  }

  async joinVideoCall(sessionId: string, userId: string) {
    const sessionQuery = await this.db.find('video_call_sessions', {
      id: sessionId
    });

    const sessionData = Array.isArray(sessionQuery.data) ? sessionQuery.data : [];
    if (sessionData.length === 0) {
      throw new Error('Video call session not found');
    }

    const session = sessionQuery[0];

    // Add participant record
    await this.db.insert('call_participants', {
      session_id: sessionId,
      user_id: userId,
      joined_at: new Date().toISOString()
    });

    return {
      room_name: session.room_name,
      meeting_url: `${process.env.FRONTEND_URL}/video-call/${session.room_name}`
    };
  }

  async endVideoCall(sessionId: string, userId: string) {
    const session = await this.db.find('video_call_sessions', {
      id: sessionId,
      started_by: userId
    });

    const sessionData = Array.isArray(session.data) ? session.data : [];
    if (sessionData.length === 0) {
      throw new Error('Video call session not found or permission denied');
    }

    // Update session end time
    await this.db.update('video_call_sessions', sessionId, {
      ended_at: new Date().toISOString()
    });

    // Update all participants left time
    const participants = await this.db.find('call_participants', {
      session_id: sessionId
    });

    const participantsData = Array.isArray(participants.data) ? participants.data : [];
    const updatePromises = participantsData
      .filter(p => !p.left_at)
      .map(p => this.db.update('call_participants', p.id, {
        left_at: new Date().toISOString()
      }));

    await Promise.all(updatePromises);

    return { success: true, message: 'Video call ended' };
  }

  // ============================================
  // AI SERVICES (Using database AI)
  // ============================================

  async generateText(prompt: string, options?: any) {
    try {
      // Use database AI service - abstracts OpenAI/other providers
      return await this.aiProvider.generateText(prompt, options);
    } catch (error) {
      console.error('AI text generation error:', error);
      throw new Error('AI service temporarily unavailable');
    }
  }

  async generateSummary(content: string, type: 'meeting' | 'document' | 'conversation' = 'document') {
    const prompts = {
      meeting: `Summarize the following meeting content in bullet points, highlighting key decisions, action items, and next steps:\n\n${content}`,
      document: `Provide a concise summary of the following document:\n\n${content}`,
      conversation: `Summarize the key points from this conversation:\n\n${content}`
    };

    return await this.generateText(prompts[type], {
      max_tokens: 200,
      temperature: 0.3
    });
  }

  async generateMeetingNotes(transcript: string) {
    const prompt = `
    Create structured meeting notes from this transcript. Format as:
    
    ## Meeting Summary
    [Brief overview]
    
    ## Key Points
    [Bullet points of main topics]
    
    ## Action Items
    [List of action items with responsible parties if mentioned]
    
    ## Decisions Made
    [Key decisions from the meeting]
    
    Transcript:
    ${transcript}
    `;

    return await this.generateText(prompt, {
      max_tokens: 500,
      temperature: 0.3
    });
  }

  // Content analysis temporarily unavailable - not in AI module yet
  async analyzeContent(content: string, analysisType: 'sentiment' | 'readability' | 'seo' | 'engagement' | 'all' = 'all') {
    // TODO: Implement when AI module supports content analysis
    return {
      error: 'Content analysis feature coming soon',
      analysisType
    };
  }

  async generateTranscription(audioBuffer: Buffer) {
    try {
      // Use database AI for speech-to-text
      return await this.aiProvider.generateAudio(audioBuffer.toString('base64'), {
        task: 'transcribe',
        response_format: 'text'
      });
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Transcription service temporarily unavailable');
    }
  }

  // ============================================
  // EMAIL NOTIFICATIONS
  // ============================================

  async sendNotificationEmail(to: string | string[], subject: string, content: string, templateData?: any) {
    try {
      // Use database email service
      const emailData = {
        to: Array.isArray(to) ? to : [to],
        subject,
        html: this.generateEmailHtml(content, templateData),
        text: content
      };

      return await /* TODO: use EmailService */ this.db.sendEmail(
        emailData.to,
        emailData.subject,
        emailData.html,
        emailData.text
      );
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Email service temporarily unavailable');
    }
  }

  async sendWorkspaceInviteEmail(email: string, workspaceName: string, inviterName: string, inviteToken: string) {
    const subject = `You've been invited to join ${workspaceName}`;
    const content = `
      <h2>You're invited to join ${workspaceName}</h2>
      <p>${inviterName} has invited you to collaborate in their Deskive workspace.</p>
      <p><a href="${process.env.FRONTEND_URL}/invite/accept/${inviteToken}" 
         style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
         Accept Invitation
      </a></p>
      <p>If the button doesn't work, copy and paste this link: 
         ${process.env.FRONTEND_URL}/invite/accept/${inviteToken}</p>
    `;

    return await this.sendNotificationEmail(email, subject, content);
  }

  async sendTaskAssignmentEmail(email: string, taskTitle: string, projectName: string, assignerName: string, taskUrl: string) {
    const subject = `New task assigned: ${taskTitle}`;
    const content = `
      <h2>You've been assigned a new task</h2>
      <p><strong>Task:</strong> ${taskTitle}</p>
      <p><strong>Project:</strong> ${projectName}</p>
      <p><strong>Assigned by:</strong> ${assignerName}</p>
      <p><a href="${taskUrl}" 
         style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
         View Task
      </a></p>
    `;

    return await this.sendNotificationEmail(email, subject, content);
  }

  async sendEventReminderEmail(email: string, eventTitle: string, startTime: string, meetingUrl?: string) {
    const eventDate = new Date(startTime);
    const subject = `Reminder: ${eventTitle} starts soon`;
    
    let content = `
      <h2>Event Reminder</h2>
      <p><strong>Event:</strong> ${eventTitle}</p>
      <p><strong>Time:</strong> ${eventDate.toLocaleString()}</p>
    `;

    if (meetingUrl) {
      content += `
        <p><a href="${meetingUrl}" 
           style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
           Join Meeting
        </a></p>
      `;
    }

    return await this.sendNotificationEmail(email, subject, content);
  }

  // ============================================
  // PUSH NOTIFICATIONS
  // ============================================

  async sendPushNotification(userIds: string | string[], title: string, body: string, data?: any) {
    try {
      return await /* TODO: use Firebase directly */ this.db.sendPushNotification(userIds, title, body, data);
    } catch (error) {
      console.error('Push notification error:', error);
      throw new Error('Push notification service temporarily unavailable');
    }
  }

  async sendWorkspaceNotification(workspaceId: string, title: string, body: string, excludeUserId?: string) {
    // Get all workspace members
    const members = await this.db.find('workspace_members', {
      workspace_id: workspaceId,
      is_active: true
    });

    const membersData = Array.isArray(members.data) ? members.data : [];
    const userIds = membersData
      .map(m => m.user_id)
      .filter(id => id !== excludeUserId);

    if (userIds.length > 0) {
      return await this.sendPushNotification(userIds, title, body, { workspace_id: workspaceId });
    }

    return { success: true, sent_to: 0 };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateEmailHtml(content: string, templateData?: any): string {
    // Basic HTML email template
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Deskive Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #007bff;">Deskive</h1>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              ${content}
            </div>
            <div style="text-align: center; margin-top: 30px; font-size: 14px; color: #666;">
              <p>This email was sent from Deskive. If you no longer wish to receive these emails, 
                 you can update your notification preferences in your account settings.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Integration health check
  async healthCheck() {
    const checks = {
      video_calls: true,
      ai_services: true,
      email: true,
      push_notifications: true
    };

    try {
      // Test database connection
      await this.db.raw("SELECT 1");
    } catch (error) {
      console.error('Integration health check failed:', error);
      Object.keys(checks).forEach(key => {
        checks[key] = false;
      });
    }

    return checks;
  }
}