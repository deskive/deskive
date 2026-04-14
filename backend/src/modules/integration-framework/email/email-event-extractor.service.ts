import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AiProviderService } from '../../ai-provider/ai-provider.service';
import { CalendarService } from '../../calendar/calendar.service';
import * as ical from 'node-ical';

interface ExtractedEvent {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  isAllDay?: boolean;
  source: 'ics' | 'ai';
  confidence?: number;
}

interface EmailForExtraction {
  id: string;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  from?: { name?: string; email: string };
  date?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

// Known event-related keywords and patterns
const EVENT_KEYWORDS = [
  // Travel
  'flight',
  'booking',
  'reservation',
  'itinerary',
  'confirmation',
  'e-ticket',
  'boarding pass',
  'check-in',
  'departure',
  'arrival',
  'airline',
  // Hotels
  'hotel',
  'check-out',
  'room reservation',
  'stay',
  'accommodation',
  // Tickets
  'ticket',
  'concert',
  'event',
  'show',
  'performance',
  'admission',
  'entry',
  // Appointments
  'appointment',
  'scheduled',
  'meeting',
  'consultation',
  'session',
  // Restaurants
  'restaurant',
  'table reservation',
  'dining',
  'dinner reservation',
  // Delivery
  'delivery',
  'arriving',
  'shipment',
  'package',
  'estimated delivery',
  // General
  'reminder',
  'upcoming',
  'scheduled for',
  'on the date',
  'at the time',
];

// Known event sender patterns (domains)
const EVENT_SENDER_PATTERNS = [
  // Airlines
  'airline',
  'airways',
  'air.com',
  'united.com',
  'delta.com',
  'emirates.com',
  'booking.com',
  'expedia.com',
  'kayak.com',
  'skyscanner.com',
  // Hotels
  'hotels.com',
  'marriott.com',
  'hilton.com',
  'airbnb.com',
  'vrbo.com',
  // Tickets
  'ticketmaster.com',
  'eventbrite.com',
  'stubhub.com',
  'livenation.com',
  // Restaurants
  'opentable.com',
  'resy.com',
  'yelp.com',
  // Delivery
  'fedex.com',
  'ups.com',
  'dhl.com',
  'usps.com',
  'amazon.com',
  // Calendar
  'calendar',
  'google.com',
  'outlook.com',
  'microsoft.com',
];

@Injectable()
export class EmailEventExtractorService {
  private readonly logger = new Logger(EmailEventExtractorService.name);

  constructor(
    private readonly db: DatabaseService,
    private calendarService: CalendarService,
  ) {}

  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }

  /**
   * Process an email and extract/create events if applicable
   */
  async processEmailForEvents(
    email: EmailForExtraction,
    workspaceId: string,
    userId: string,
  ): Promise<{ eventsCreated: number; events: ExtractedEvent[] }> {
    const extractedEvents: ExtractedEvent[] = [];

    try {
      // Step 1: Check for ICS attachments (most reliable)
      if (email.attachments && email.attachments.length > 0) {
        const icsEvents = await this.extractFromIcsAttachments(email.attachments);
        extractedEvents.push(...icsEvents);
      }

      // Step 2: If no ICS found, check if email looks like an event notification
      if (extractedEvents.length === 0 && this.isLikelyEventEmail(email)) {
        const aiEvent = await this.extractEventWithAI(email);
        if (aiEvent) {
          extractedEvents.push(aiEvent);
        }
      }

      // Step 3: Create calendar events for extracted events
      let eventsCreated = 0;
      for (const event of extractedEvents) {
        try {
          await this.createCalendarEvent(event, workspaceId, userId, email);
          eventsCreated++;
          this.logger.log(`📅 Created event "${event.title}" from email (source: ${event.source})`);
        } catch (error) {
          this.logger.error(`Failed to create event "${event.title}": ${error.message}`);
        }
      }

      return { eventsCreated, events: extractedEvents };
    } catch (error) {
      this.logger.error(`Failed to process email for events: ${error.message}`);
      return { eventsCreated: 0, events: [] };
    }
  }

  /**
   * Extract events from ICS attachments
   */
  private async extractFromIcsAttachments(
    attachments: Array<{ filename: string; content: Buffer; contentType: string }>,
  ): Promise<ExtractedEvent[]> {
    const events: ExtractedEvent[] = [];

    for (const attachment of attachments) {
      // Check if it's an ICS file
      const isIcs =
        attachment.filename?.toLowerCase().endsWith('.ics') ||
        attachment.contentType?.includes('calendar') ||
        attachment.contentType?.includes('ics');

      if (!isIcs) continue;

      try {
        const icsContent = attachment.content.toString('utf-8');
        const parsed = ical.sync.parseICS(icsContent);

        for (const key of Object.keys(parsed)) {
          const component = parsed[key];
          if (component.type === 'VEVENT') {
            const event: ExtractedEvent = {
              title: component.summary || 'Untitled Event',
              description: component.description,
              startTime: component.start
                ? new Date(component.start).toISOString()
                : new Date().toISOString(),
              endTime: component.end
                ? new Date(component.end).toISOString()
                : new Date(Date.now() + 3600000).toISOString(),
              location: component.location,
              isAllDay: component.datetype === 'date',
              source: 'ics',
              confidence: 100,
            };
            events.push(event);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to parse ICS attachment ${attachment.filename}: ${error.message}`);
      }
    }

    return events;
  }

  /**
   * Check if an email is likely an event notification
   */
  private isLikelyEventEmail(email: EmailForExtraction): boolean {
    const subject = (email.subject || '').toLowerCase();
    const body = (email.bodyText || email.bodyHtml || '').toLowerCase();
    const senderEmail = (email.from?.email || '').toLowerCase();

    // Check sender patterns
    const hasEventSender = EVENT_SENDER_PATTERNS.some((pattern) =>
      senderEmail.includes(pattern.toLowerCase()),
    );

    // Check keywords in subject or body
    const hasEventKeywords = EVENT_KEYWORDS.some(
      (keyword) => subject.includes(keyword.toLowerCase()) || body.includes(keyword.toLowerCase()),
    );

    // Look for date/time patterns in body
    const hasDatePattern = this.containsDateTimePattern(body);

    // Scoring: needs at least 2 signals
    const score = (hasEventSender ? 1 : 0) + (hasEventKeywords ? 1 : 0) + (hasDatePattern ? 1 : 0);

    return score >= 2;
  }

  /**
   * Check if text contains date/time patterns
   */
  private containsDateTimePattern(text: string): boolean {
    const patterns = [
      // Date patterns
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/, // 12/25/2024 or 25-12-2024
      /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/, // 2024-12-25
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i,
      /\d{1,2}(st|nd|rd|th)\s+(of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)/i,
      // Time patterns
      /\d{1,2}:\d{2}\s*(am|pm)?/i,
      /at\s+\d{1,2}(:\d{2})?\s*(am|pm)?/i,
    ];

    return patterns.some((pattern) => pattern.test(text));
  }

  /**
   * Extract event details using AI
   */
  private async extractEventWithAI(email: EmailForExtraction): Promise<ExtractedEvent | null> {
    try {
      const emailContent = `
Subject: ${email.subject || 'No Subject'}
From: ${email.from?.name || ''} <${email.from?.email || ''}>
Date: ${email.date || ''}

${email.bodyText || this.stripHtml(email.bodyHtml || '')}
      `.trim();

      // Use database AI to extract event details
      const prompt = `Analyze this email and extract event/appointment/booking details if present.
Return a JSON object with these fields (or null if no event found):
- title: string (event title/name)
- startDate: string (ISO date format YYYY-MM-DDTHH:mm:ss)
- endDate: string (ISO date format, if not specified use startDate + 1 hour)
- location: string or null
- isAllDay: boolean
- confidence: number (0-100, how confident you are this is an event)

Only extract if this is clearly an event notification (booking, ticket, appointment, reservation, etc).
Do NOT extract for regular emails, newsletters, or promotional content.

Email:
${emailContent}

Return ONLY valid JSON, no other text.`;

      const response = await this.aiProvider.generateText(prompt, {
        saveToDatabase: false,
      });

      // Parse AI response
      const content = response.content || response;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed || parsed === null || !parsed.title || !parsed.startDate) {
        return null;
      }

      // Only accept if confidence is above threshold
      if (parsed.confidence && parsed.confidence < 60) {
        this.logger.debug(`AI extraction confidence too low (${parsed.confidence}%), skipping`);
        return null;
      }

      return {
        title: parsed.title,
        description: `Auto-created from email: ${email.subject}`,
        startTime: new Date(parsed.startDate).toISOString(),
        endTime: parsed.endDate
          ? new Date(parsed.endDate).toISOString()
          : new Date(new Date(parsed.startDate).getTime() + 3600000).toISOString(),
        location: parsed.location || undefined,
        isAllDay: parsed.isAllDay || false,
        source: 'ai',
        confidence: parsed.confidence || 70,
      };
    } catch (error) {
      this.logger.warn(`AI event extraction failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000); // Limit content length
  }

  /**
   * Create a calendar event from extracted data
   */
  private async createCalendarEvent(
    event: ExtractedEvent,
    workspaceId: string,
    userId: string,
    sourceEmail: EmailForExtraction,
  ): Promise<void> {
    // Check for duplicates (same title and start time within last 24 hours)
    const existingEvents = await this.checkForDuplicateEvent(
      workspaceId,
      event.title,
      event.startTime,
    );

    if (existingEvents) {
      this.logger.debug(`Skipping duplicate event: ${event.title}`);
      return;
    }

    // Create the event
    await this.calendarService.createEvent(
      workspaceId,
      {
        title: event.title,
        description: event.description || `Created from email: ${sourceEmail.subject}`,
        start_time: event.startTime,
        end_time: event.endTime,
        location: event.location,
        all_day: event.isAllDay,
        priority: 'normal' as any,
      },
      userId,
    );
  }

  /**
   * Check if a similar event already exists
   */
  private async checkForDuplicateEvent(
    workspaceId: string,
    title: string,
    startTime: string,
  ): Promise<boolean> {
    try {
      const result = await this.db
        .table('calendar_events')
        .select('id')
        .where('workspace_id', '=', workspaceId)
        .where('title', '=', title)
        .where('start_time', '=', startTime)
        .execute();

      const data = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
      return data.length > 0;
    } catch (error) {
      this.logger.warn(`Failed to check for duplicate event: ${error.message}`);
      return false;
    }
  }
}
