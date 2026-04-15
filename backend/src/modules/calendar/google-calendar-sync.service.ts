import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DatabaseService } from '../database/database.service';
import { GoogleCalendarOAuthService, GoogleOAuthTokens } from './google-calendar-oauth.service';

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    organizer?: boolean;
    self?: boolean;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  creator?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  status?: string;
  visibility?: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
  };
  recurrence?: string[];
  recurringEventId?: string;
  updated: string;
  created: string;
  iCalUID?: string;
  colorId?: string;
}

export interface GoogleCalendarEventsResponse {
  kind: string;
  etag: string;
  summary: string;
  updated: string;
  timeZone: string;
  accessRole: string;
  nextPageToken?: string;
  nextSyncToken?: string;
  items: GoogleCalendarEvent[];
}

interface GoogleCalendarInfo {
  id: string;
  name: string;
  color?: string;
  primary?: boolean;
  description?: string;
}

interface GoogleCalendarConnection {
  id: string;
  workspace_id: string;
  user_id: string;
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_at?: string;
  google_email?: string;
  google_name?: string;
  google_picture?: string;
  calendar_id: string; // Deprecated
  selected_calendars: GoogleCalendarInfo[];
  available_calendars: GoogleCalendarInfo[];
  calendar_sync_tokens: Record<string, string>; // calendarId -> syncToken
  sync_token?: string; // Deprecated
  last_synced_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class GoogleCalendarSyncService {
  private readonly logger = new Logger(GoogleCalendarSyncService.name);
  private readonly GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

  constructor(
    private configService: ConfigService,
    private readonly db: DatabaseService,
    private googleCalendarOAuthService: GoogleCalendarOAuthService,
  ) {}

  // ==================== Connection Management ====================

  /**
   * Complete OAuth flow and save connection
   */
  async handleOAuthCallback(
    code: string,
    userId: string,
    workspaceId: string,
  ): Promise<{ connection: any; redirectUrl?: string }> {
    // Exchange code for tokens
    const tokens = await this.googleCalendarOAuthService.exchangeCodeForTokens(code);

    // Get user info from Google
    const userInfo = await this.googleCalendarOAuthService.getUserInfo(tokens.accessToken);

    // Get all available calendars
    const calendars = await this.googleCalendarOAuthService.getCalendarList(tokens.accessToken);

    if (!calendars || calendars.length === 0) {
      throw new BadRequestException('No calendars found in your Google account');
    }

    // Transform calendars to our format
    const availableCalendars: GoogleCalendarInfo[] = calendars.map((cal) => ({
      id: cal.id,
      name: cal.summary,
      color: cal.backgroundColor,
      primary: cal.primary || false,
      description: cal.description,
    }));

    // Pre-select the primary calendar by default
    const primaryCalendar = availableCalendars.find((cal) => cal.primary);
    const selectedCalendars: GoogleCalendarInfo[] = primaryCalendar ? [primaryCalendar] : [];

    // Check if connection already exists
    const existingConnection = await this.db.findOne('google_calendar_connections', {
      workspace_id: workspaceId,
      user_id: userId,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: tokens.tokenType || 'Bearer',
      scope: tokens.scope,
      expires_at: tokens.expiresAt.toISOString(),
      google_email: userInfo.email,
      google_name: userInfo.name,
      google_picture: userInfo.picture,
      calendar_id: primaryCalendar?.id || 'primary', // Deprecated, for backward compatibility
      available_calendars: availableCalendars,
      selected_calendars:
        existingConnection?.selected_calendars?.length > 0
          ? existingConnection.selected_calendars // Keep existing selection on reconnect
          : selectedCalendars,
      calendar_sync_tokens: existingConnection?.calendar_sync_tokens || {},
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection: GoogleCalendarConnection;
    if (existingConnection) {
      await this.db.update('google_calendar_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData } as GoogleCalendarConnection;
      this.logger.log(
        `Updated Google Calendar connection for user ${userId} in workspace ${workspaceId}`,
      );
    } else {
      connection = (await this.db.insert('google_calendar_connections', {
        ...connectionData,
        created_at: new Date().toISOString(),
      })) as GoogleCalendarConnection;
      this.logger.log(
        `Created Google Calendar connection for user ${userId} in workspace ${workspaceId}`,
      );
    }

    // No longer syncing to database - events are fetched directly from Google API

    return { connection: this.transformConnection(connection) };
  }

  /**
   * Handle native mobile sign-in and store connection
   * Uses server auth code from native Google Sign-In SDK
   */
  async handleNativeSignIn(
    userId: string,
    workspaceId: string,
    serverAuthCode: string,
    userInfo: { email?: string; displayName?: string; photoUrl?: string },
  ): Promise<any> {
    // Exchange native auth code for tokens (no redirect_uri)
    const tokens =
      await this.googleCalendarOAuthService.exchangeNativeCodeForTokens(serverAuthCode);

    // Get user info from tokens if not provided by client
    let email = userInfo.email;
    let name = userInfo.displayName;
    let picture = userInfo.photoUrl;

    if (!email) {
      const googleUserInfo = await this.googleCalendarOAuthService.getUserInfo(tokens.accessToken);
      email = googleUserInfo.email;
      name = name || googleUserInfo.name;
      picture = picture || googleUserInfo.picture;
    }

    // Get all available calendars
    const calendars = await this.googleCalendarOAuthService.getCalendarList(tokens.accessToken);

    if (!calendars || calendars.length === 0) {
      throw new BadRequestException('No calendars found in your Google account');
    }

    // Transform calendars to our format
    const availableCalendars: GoogleCalendarInfo[] = calendars.map((cal) => ({
      id: cal.id,
      name: cal.summary,
      color: cal.backgroundColor,
      primary: cal.primary || false,
      description: cal.description,
    }));

    // Pre-select the primary calendar by default
    const primaryCalendar = availableCalendars.find((cal) => cal.primary);
    const selectedCalendars: GoogleCalendarInfo[] = primaryCalendar ? [primaryCalendar] : [];

    // Check if connection already exists
    const existingConnection = await this.db.findOne('google_calendar_connections', {
      workspace_id: workspaceId,
      user_id: userId,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || existingConnection?.refresh_token,
      token_type: tokens.tokenType || 'Bearer',
      scope: tokens.scope,
      expires_at: tokens.expiresAt.toISOString(),
      google_email: email,
      google_name: name,
      google_picture: picture,
      calendar_id: primaryCalendar?.id || 'primary',
      available_calendars: availableCalendars,
      selected_calendars:
        existingConnection?.selected_calendars?.length > 0
          ? existingConnection.selected_calendars
          : selectedCalendars,
      calendar_sync_tokens: existingConnection?.calendar_sync_tokens || {},
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection: GoogleCalendarConnection;
    if (existingConnection) {
      await this.db.update('google_calendar_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData } as GoogleCalendarConnection;
      this.logger.log(
        `Updated Google Calendar connection via native sign-in for user ${userId} in workspace ${workspaceId}`,
      );
    } else {
      connection = (await this.db.insert('google_calendar_connections', {
        ...connectionData,
        created_at: new Date().toISOString(),
      })) as GoogleCalendarConnection;
      this.logger.log(
        `Created Google Calendar connection via native sign-in for user ${userId} in workspace ${workspaceId}`,
      );
    }

    return this.transformConnection(connection);
  }

  /**
   * Get Google Calendar connection for a user
   */
  async getConnection(userId: string, workspaceId: string): Promise<any | null> {
    const connection = (await this.db.findOne('google_calendar_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    })) as GoogleCalendarConnection | null;

    if (!connection) {
      return null;
    }

    return this.transformConnection(connection);
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnect(userId: string, workspaceId: string): Promise<void> {
    const connection = (await this.db.findOne('google_calendar_connections', {
      workspace_id: workspaceId,
      user_id: userId,
    })) as GoogleCalendarConnection | null;

    if (!connection) {
      throw new NotFoundException('Google Calendar connection not found');
    }

    // Revoke token
    try {
      await this.googleCalendarOAuthService.revokeToken(connection.access_token);
    } catch (error) {
      this.logger.warn(`Failed to revoke token: ${error.message}`);
    }

    // Mark connection as inactive
    await this.db.update('google_calendar_connections', connection.id, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });

    // No need to remove synced events - we no longer store them in the database

    this.logger.log(`Disconnected Google Calendar for user ${userId} in workspace ${workspaceId}`);
  }

  /**
   * Update selected calendars for a user
   */
  async updateSelectedCalendars(
    userId: string,
    workspaceId: string,
    selectedCalendarIds: string[],
  ): Promise<any> {
    const connection = (await this.db.findOne('google_calendar_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    })) as GoogleCalendarConnection | null;

    if (!connection) {
      throw new NotFoundException(
        'Google Calendar not connected. Please connect your Google Calendar first.',
      );
    }

    // Validate that all selected calendars are in available calendars
    const availableIds = (connection.available_calendars || []).map((c) => c.id);
    const invalidIds = selectedCalendarIds.filter((id) => !availableIds.includes(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(`Invalid calendar IDs: ${invalidIds.join(', ')}`);
    }

    // Get the full calendar info for selected calendars
    const selectedCalendars = (connection.available_calendars || []).filter((cal) =>
      selectedCalendarIds.includes(cal.id),
    );

    // Update connection with new selected calendars
    await this.db.update('google_calendar_connections', connection.id, {
      selected_calendars: selectedCalendars,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(
      `Updated selected calendars for user ${userId}: ${selectedCalendarIds.join(', ')}`,
    );

    // No sync needed - events are fetched directly from Google API

    return this.transformConnection({ ...connection, selected_calendars: selectedCalendars });
  }

  /**
   * Refresh available calendars from Google
   */
  async refreshAvailableCalendars(userId: string, workspaceId: string): Promise<any> {
    const connection = (await this.db.findOne('google_calendar_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    })) as GoogleCalendarConnection | null;

    if (!connection) {
      throw new NotFoundException(
        'Google Calendar not connected. Please connect your Google Calendar first.',
      );
    }

    const accessToken = await this.getValidAccessToken(connection);

    // Fetch fresh calendar list from Google
    const calendars = await this.googleCalendarOAuthService.getCalendarList(accessToken);

    const availableCalendars: GoogleCalendarInfo[] = calendars.map((cal) => ({
      id: cal.id,
      name: cal.summary,
      color: cal.backgroundColor,
      primary: cal.primary || false,
      description: cal.description,
    }));

    // Update connection with new available calendars
    await this.db.update('google_calendar_connections', connection.id, {
      available_calendars: availableCalendars,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`Refreshed available calendars for user ${userId}`);

    return {
      ...this.transformConnection({ ...connection, available_calendars: availableCalendars }),
      availableCalendars,
    };
  }

  // ==================== Token Management ====================

  /**
   * Get valid access token, refreshing if necessary
   */
  private async getValidAccessToken(connection: GoogleCalendarConnection): Promise<string> {
    const expiresAt = new Date(connection.expires_at || Date.now());

    if (!this.googleCalendarOAuthService.isTokenExpired(expiresAt)) {
      return connection.access_token;
    }

    if (!connection.refresh_token) {
      throw new BadRequestException(
        'Token expired and no refresh token available. Please reconnect Google Calendar.',
      );
    }

    // Refresh the token
    const newTokens = await this.googleCalendarOAuthService.refreshAccessToken(
      connection.refresh_token,
    );

    // Update connection with new tokens
    await this.db.update('google_calendar_connections', connection.id, {
      access_token: newTokens.accessToken,
      expires_at: newTokens.expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`Refreshed access token for connection ${connection.id}`);

    return newTokens.accessToken;
  }

  // ==================== Fetch Google Events Directly ====================

  /**
   * Fetch events directly from Google Calendar API (no database storage)
   * This is the new approach - events are fetched on-demand and merged with local events
   */
  async fetchGoogleEvents(
    userId: string,
    workspaceId: string,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    const connection = (await this.db.findOne('google_calendar_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    })) as GoogleCalendarConnection | null;

    if (!connection) {
      return []; // No connection, return empty array
    }

    const accessToken = await this.getValidAccessToken(connection);

    // Get calendars to fetch - use selected_calendars if available
    const calendarsToFetch =
      connection.selected_calendars?.length > 0
        ? connection.selected_calendars
        : [{ id: connection.calendar_id || 'primary', name: 'Primary', primary: true }];

    const allEvents: any[] = [];

    for (const calendar of calendarsToFetch) {
      try {
        const events = await this.fetchEventsFromCalendar(
          accessToken,
          calendar.id,
          startDate,
          endDate,
          calendar,
          connection,
        );
        allEvents.push(...events);
      } catch (error) {
        this.logger.error(
          `Failed to fetch from calendar "${calendar.name}" (${calendar.id}): ${error.message}`,
        );
        // Continue with other calendars
      }
    }

    // Update last fetched timestamp
    await this.db.update('google_calendar_connections', connection.id, {
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return allEvents;
  }

  /**
   * Fetch events from a single Google Calendar
   */
  private async fetchEventsFromCalendar(
    accessToken: string,
    calendarId: string,
    startDate: string,
    endDate: string,
    calendarInfo: GoogleCalendarInfo,
    connection: GoogleCalendarConnection,
  ): Promise<any[]> {
    const events: any[] = [];
    let pageToken: string | undefined;

    try {
      do {
        const params: Record<string, string> = {
          maxResults: '250',
          singleEvents: 'true',
          orderBy: 'startTime',
          timeMin: new Date(startDate).toISOString(),
          timeMax: new Date(endDate).toISOString(),
        };

        if (pageToken) {
          params.pageToken = pageToken;
        }

        const response = await axios.get<GoogleCalendarEventsResponse>(
          `${this.GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params,
          },
        );

        const data = response.data;

        // Transform events to our format (without storing)
        for (const googleEvent of data.items) {
          if (googleEvent.status !== 'cancelled') {
            events.push(this.transformGoogleEvent(googleEvent, calendarInfo, connection));
          }
        }

        pageToken = data.nextPageToken;
      } while (pageToken);

      return events;
    } catch (error) {
      this.logger.error(`Error fetching events from calendar ${calendarId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transform Google Calendar event to our frontend format (camelCase)
   */
  private transformGoogleEvent(
    googleEvent: GoogleCalendarEvent,
    calendarInfo: GoogleCalendarInfo,
    connection: GoogleCalendarConnection,
  ): any {
    // Determine if it's an all-day event
    const isAllDay = !googleEvent.start.dateTime && !!googleEvent.start.date;

    // Parse start and end times
    let startTime: string;
    let endTime: string;

    if (isAllDay) {
      startTime = new Date(googleEvent.start.date!).toISOString();
      const endDate = new Date(googleEvent.end.date!);
      endDate.setDate(endDate.getDate() - 1);
      endTime = new Date(endDate.setHours(23, 59, 59, 999)).toISOString();
    } else {
      startTime = googleEvent.start.dateTime!;
      endTime = googleEvent.end.dateTime!;
    }

    // Extract attendees
    const attendees = googleEvent.attendees?.map((a) => a.email) || [];

    // Get meeting URL
    let meetingUrl: string | null = null;
    if (googleEvent.hangoutLink) {
      meetingUrl = googleEvent.hangoutLink;
    } else if (googleEvent.conferenceData?.entryPoints) {
      const videoEntry = googleEvent.conferenceData.entryPoints.find(
        (e) => e.entryPointType === 'video',
      );
      if (videoEntry) {
        meetingUrl = videoEntry.uri;
      }
    }

    // Use Google's event ID as our ID (prefixed to avoid collision with local events)
    const eventId = `google-${calendarInfo.id}-${googleEvent.id}`;

    return {
      id: eventId,
      workspaceId: connection.workspace_id,
      userId: connection.user_id,
      title: googleEvent.summary || '(No title)',
      description: googleEvent.description || null,
      startTime: startTime,
      endTime: endTime,
      allDay: isAllDay,
      location: googleEvent.location || null,
      organizerId: connection.user_id,
      attendees: attendees,
      meetingUrl: meetingUrl,
      visibility: googleEvent.visibility === 'public' ? 'public' : 'private',
      status: googleEvent.status === 'tentative' ? 'tentative' : 'confirmed',
      isRecurring: !!googleEvent.recurringEventId,
      // Google Calendar specific fields
      syncedFromGoogle: true,
      googleCalendarEventId: googleEvent.id,
      googleCalendarHtmlLink: googleEvent.htmlLink || null,
      googleCalendarName: calendarInfo.name,
      googleCalendarColor: calendarInfo.color,
      // These fields are null for Google events (not stored locally)
      categoryId: null,
      priority: 'normal',
      tags: [],
      createdAt: googleEvent.created,
      updatedAt: googleEvent.updated,
    };
  }

  // ==================== Helpers ====================

  private transformConnection(connection: GoogleCalendarConnection): any {
    return {
      id: connection.id,
      workspaceId: connection.workspace_id,
      userId: connection.user_id,
      googleEmail: connection.google_email,
      calendarId: connection.calendar_id,
      isActive: connection.is_active,
      lastSyncedAt: connection.last_synced_at,
      createdAt: connection.created_at,
      // Multi-calendar support
      availableCalendars: connection.available_calendars || [],
      selectedCalendars: connection.selected_calendars || [],
    };
  }
}
