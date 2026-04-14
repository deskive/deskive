import { Injectable, Logger } from '@nestjs/common';
import * as Imap from 'imap';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import { ImapConfigDto } from './dto/email.dto';
import {
  EmailDto,
  EmailListItemDto,
  EmailAddressDto,
  EmailAttachmentDto,
  LabelDto,
} from './dto/email.dto';

export interface ImapFetchResult {
  emails: EmailListItemDto[];
  nextPageToken?: string;
}

export interface ImapEmail {
  uid: number;
  messageId: string;
  from?: EmailAddressDto;
  to?: EmailAddressDto[];
  cc?: EmailAddressDto[];
  bcc?: EmailAddressDto[];
  subject?: string;
  date?: string;
  bodyText?: string;
  bodyHtml?: string;
  snippet: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments?: EmailAttachmentDto[];
  mailbox: string;
}

@Injectable()
export class ImapService {
  private readonly logger = new Logger(ImapService.name);

  /**
   * Create IMAP configuration object
   */
  private createImapConfig(config: ImapConfigDto): Imap.Config {
    return {
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.secure ?? true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 10000,
    };
  }

  /**
   * Test IMAP connection
   */
  async testConnection(config: ImapConfigDto): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const imap = new Imap(this.createImapConfig(config));

      const timeout = setTimeout(() => {
        imap.end();
        resolve({ success: false, message: 'IMAP connection timeout' });
      }, 15000);

      imap.once('ready', () => {
        clearTimeout(timeout);
        this.logger.log(`IMAP connection test successful for ${config.host}:${config.port}`);
        imap.end();
        resolve({ success: true, message: 'IMAP connection successful' });
      });

      imap.once('error', (err: Error) => {
        clearTimeout(timeout);
        this.logger.warn(
          `IMAP connection test failed for ${config.host}:${config.port}: ${err.message}`,
        );
        resolve({ success: false, message: `IMAP connection failed: ${err.message}` });
      });

      imap.connect();
    });
  }

  /**
   * Get list of mailboxes (folders)
   */
  async getMailboxes(config: ImapConfigDto): Promise<LabelDto[]> {
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.createImapConfig(config));

      imap.once('ready', () => {
        imap.getBoxes((err, boxes) => {
          if (err) {
            imap.end();
            reject(err);
            return;
          }

          const labels: LabelDto[] = this.parseMailboxes(boxes);
          imap.end();
          resolve(labels);
        });
      });

      imap.once('error', (err: Error) => {
        reject(err);
      });

      imap.connect();
    });
  }

  /**
   * Parse mailbox tree into flat list
   */
  private parseMailboxes(boxes: Imap.MailBoxes, prefix = ''): LabelDto[] {
    const labels: LabelDto[] = [];

    for (const [name, box] of Object.entries(boxes)) {
      const fullName = prefix ? `${prefix}${box.delimiter || '/'}${name}` : name;

      // Map common mailbox names to standardized labels
      const labelId = this.getStandardLabelId(name, fullName);

      labels.push({
        id: labelId,
        // Use fullName as the actual mailbox path for IMAP operations
        // Store display name separately if needed
        name: fullName,
        type: this.isSystemMailbox(name) ? 'system' : 'user',
        messagesTotal: 0, // Will be updated when opening mailbox
        messagesUnread: 0,
      });

      // Parse children if present
      if (box.children) {
        labels.push(...this.parseMailboxes(box.children, fullName));
      }
    }

    return labels;
  }

  /**
   * Map mailbox name to standard label ID
   */
  private getStandardLabelId(name: string, fullName: string): string {
    const upperName = name.toUpperCase();
    const standardNames: Record<string, string> = {
      INBOX: 'INBOX',
      SENT: 'SENT',
      'SENT MAIL': 'SENT',
      'SENT ITEMS': 'SENT',
      '[GMAIL]/SENT MAIL': 'SENT',
      DRAFTS: 'DRAFT',
      DRAFT: 'DRAFT',
      '[GMAIL]/DRAFTS': 'DRAFT',
      TRASH: 'TRASH',
      DELETED: 'TRASH',
      'DELETED ITEMS': 'TRASH',
      '[GMAIL]/TRASH': 'TRASH',
      SPAM: 'SPAM',
      JUNK: 'SPAM',
      'JUNK E-MAIL': 'SPAM',
      '[GMAIL]/SPAM': 'SPAM',
      STARRED: 'STARRED',
      '[GMAIL]/STARRED': 'STARRED',
      IMPORTANT: 'IMPORTANT',
      '[GMAIL]/IMPORTANT': 'IMPORTANT',
    };

    return standardNames[upperName] || standardNames[fullName.toUpperCase()] || fullName;
  }

  /**
   * Get possible mailbox names for a standard label ID
   * Returns an array of possible names to try, in order of preference
   */
  private getPossibleMailboxNames(standardLabel: string): string[] {
    const mappings: Record<string, string[]> = {
      INBOX: ['INBOX'],
      SENT: ['Sent', 'SENT', 'Sent Mail', 'Sent Items', '[Gmail]/Sent Mail'],
      DRAFT: ['Drafts', 'DRAFTS', 'Draft', '[Gmail]/Drafts'],
      TRASH: ['Trash', 'TRASH', 'Deleted', 'Deleted Items', '[Gmail]/Trash'],
      SPAM: ['Spam', 'SPAM', 'Junk', 'Junk E-mail', '[Gmail]/Spam'],
      STARRED: ['Starred', 'STARRED', '[Gmail]/Starred'],
      IMPORTANT: ['Important', 'IMPORTANT', '[Gmail]/Important'],
    };

    return mappings[standardLabel.toUpperCase()] || [standardLabel];
  }

  /**
   * Resolve actual mailbox name from standard label ID
   */
  async resolveMailboxName(config: ImapConfigDto, standardLabel: string): Promise<string> {
    // INBOX is always INBOX
    if (standardLabel.toUpperCase() === 'INBOX') {
      return 'INBOX';
    }

    // Get the list of actual mailboxes
    const mailboxes = await this.getMailboxes(config);
    const possibleNames = this.getPossibleMailboxNames(standardLabel);

    // Find a matching mailbox
    for (const possibleName of possibleNames) {
      const found = mailboxes.find(
        (m) =>
          m.name.toLowerCase() === possibleName.toLowerCase() ||
          m.id.toLowerCase() === possibleName.toLowerCase(),
      );
      if (found) {
        return found.name;
      }
    }

    // If no match found, return the original label (will likely fail)
    this.logger.warn(`Could not resolve mailbox for label: ${standardLabel}`);
    return standardLabel;
  }

  /**
   * Check if mailbox is a system mailbox
   */
  private isSystemMailbox(name: string): boolean {
    const systemNames = [
      'INBOX',
      'SENT',
      'SENT MAIL',
      'DRAFTS',
      'DRAFT',
      'TRASH',
      'DELETED',
      'SPAM',
      'JUNK',
      'STARRED',
      'IMPORTANT',
    ];
    return systemNames.includes(name.toUpperCase());
  }

  /**
   * Fetch emails from a mailbox
   */
  async fetchEmails(
    config: ImapConfigDto,
    mailbox: string = 'INBOX',
    options: {
      limit?: number;
      offset?: number;
      search?: string;
    } = {},
  ): Promise<ImapFetchResult> {
    const { limit = 20, offset = 0, search } = options;

    return new Promise((resolve, reject) => {
      const imap = new Imap(this.createImapConfig(config));
      const emails: EmailListItemDto[] = [];

      imap.once('ready', () => {
        imap.openBox(mailbox, true, (err, box) => {
          if (err) {
            imap.end();
            reject(err);
            return;
          }

          const totalMessages = box.messages.total;
          if (totalMessages === 0) {
            imap.end();
            resolve({ emails: [], nextPageToken: undefined });
            return;
          }

          // Calculate range (IMAP uses 1-based sequence numbers, newest first)
          const start = Math.max(1, totalMessages - offset - limit + 1);
          const end = Math.max(1, totalMessages - offset);

          if (start > end) {
            imap.end();
            resolve({ emails: [], nextPageToken: undefined });
            return;
          }

          // Build search criteria
          // IMAP OR only accepts exactly 2 arguments, so we nest them or use TEXT for broader search
          let searchCriteria: any[] = ['ALL'];
          if (search) {
            // Use nested OR: OR(OR(SUBJECT, FROM), BODY) to search in subject, from, and body
            searchCriteria = [
              ['OR', ['OR', ['SUBJECT', search], ['FROM', search]], ['BODY', search]],
            ];
          }

          imap.search(searchCriteria, (searchErr, results) => {
            if (searchErr) {
              imap.end();
              reject(searchErr);
              return;
            }

            if (results.length === 0) {
              imap.end();
              resolve({ emails: [], nextPageToken: undefined });
              return;
            }

            // Sort by UID descending (newest first) and apply pagination
            const sortedResults = results.sort((a, b) => b - a);
            const paginatedResults = sortedResults.slice(offset, offset + limit);

            if (paginatedResults.length === 0) {
              imap.end();
              resolve({ emails: [], nextPageToken: undefined });
              return;
            }

            const fetch = imap.fetch(paginatedResults, {
              bodies: ['HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)'],
              struct: true,
            });

            fetch.on('message', (msg, seqno) => {
              let uid = 0;
              let attributes: Imap.ImapMessageAttributes | undefined;
              let headerBuffer = '';

              msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                  headerBuffer += chunk.toString('utf8');
                });
              });

              msg.once('attributes', (attrs) => {
                attributes = attrs;
                uid = attrs.uid;
              });

              msg.once('end', () => {
                const headers = this.parseHeaders(headerBuffer);
                const flags = attributes?.flags || [];

                emails.push({
                  id: `imap-${uid}`,
                  threadId: `imap-thread-${uid}`,
                  labelIds: [mailbox],
                  snippet: '', // Would need full body fetch for snippet
                  from: this.parseEmailAddress(headers.from),
                  subject: headers.subject,
                  date: headers.date,
                  isRead: flags.includes('\\Seen'),
                  isStarred: flags.includes('\\Flagged'),
                  hasAttachments: this.hasAttachments(attributes?.struct),
                });
              });
            });

            fetch.once('error', (fetchErr) => {
              imap.end();
              reject(fetchErr);
            });

            fetch.once('end', () => {
              imap.end();

              // Sort by date descending
              emails.sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
              });

              const hasMore = offset + limit < sortedResults.length;
              resolve({
                emails,
                nextPageToken: hasMore ? String(offset + limit) : undefined,
              });
            });
          });
        });
      });

      imap.once('error', (err: Error) => {
        reject(err);
      });

      imap.connect();
    });
  }

  /**
   * Fetch a single email with full body
   */
  async fetchEmail(
    config: ImapConfigDto,
    messageId: string,
    mailbox: string = 'INBOX',
  ): Promise<EmailDto | null> {
    // Extract UID from our ID format
    const uidMatch = messageId.match(/^imap-(\d+)$/);
    if (!uidMatch) {
      throw new Error('Invalid IMAP message ID format');
    }
    const uid = parseInt(uidMatch[1], 10);

    this.logger.log(`Fetching email: messageId=${messageId}, uid=${uid}, mailbox=${mailbox}`);

    return new Promise((resolve, reject) => {
      const imap = new Imap(this.createImapConfig(config));

      imap.once('ready', () => {
        this.logger.log(`IMAP ready, opening mailbox: ${mailbox}`);
        imap.openBox(mailbox, true, (err, box) => {
          if (err) {
            this.logger.error(`Failed to open mailbox ${mailbox}: ${err.message}`);
            imap.end();
            reject(err);
            return;
          }

          this.logger.log(
            `Mailbox opened: ${mailbox}, total messages: ${box.messages.total}, uidvalidity: ${box.uidvalidity}`,
          );

          // imap.fetch() uses UIDs by default (sends UID FETCH command)
          // Fetch the message directly by UID
          this.logger.log(`Fetching UID: ${uid}`);
          const fetch = imap.fetch(uid, {
            bodies: '',
            struct: true,
            markSeen: false,
          });

          let emailData: EmailDto | null = null;
          let messageReceived = false;
          let parsePromise: Promise<void> | null = null;

          fetch.on('message', (msg, seqno) => {
            messageReceived = true;
            this.logger.log(`Message received: seqno=${seqno}`);
            let buffer = Buffer.alloc(0);
            let attributes: Imap.ImapMessageAttributes | undefined;

            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
              });
            });

            msg.once('attributes', (attrs) => {
              attributes = attrs;
              this.logger.log(
                `Message attributes: uid=${attrs.uid}, flags=${attrs.flags?.join(',')}`,
              );
            });

            msg.once('end', () => {
              this.logger.log(`Message body received, buffer size: ${buffer.length}`);
              // Store the parse promise so we can wait for it
              parsePromise = (async () => {
                try {
                  const parsed = await simpleParser(buffer);
                  const flags = attributes?.flags || [];

                  emailData = {
                    id: messageId,
                    threadId: `imap-thread-${uid}`,
                    labelIds: [mailbox],
                    snippet: this.createSnippet(parsed.text || ''),
                    from: this.parseAddressObject(parsed.from),
                    to: this.parseAddressArray(parsed.to),
                    cc: this.parseAddressArray(parsed.cc),
                    bcc: this.parseAddressArray(parsed.bcc),
                    subject: parsed.subject,
                    bodyText: parsed.text,
                    bodyHtml: parsed.html || undefined,
                    date: parsed.date?.toISOString(),
                    internalDate: parsed.date?.toISOString() || new Date().toISOString(),
                    isRead: flags.includes('\\Seen'),
                    isStarred: flags.includes('\\Flagged'),
                    attachments: parsed.attachments?.map((att, idx) => ({
                      attachmentId: `att-${uid}-${idx}`,
                      filename: att.filename || 'attachment',
                      mimeType: att.contentType,
                      size: att.size,
                    })),
                  };
                  this.logger.log(`Email parsed successfully: subject=${parsed.subject}`);
                } catch (parseErr) {
                  this.logger.error(`Failed to parse email: ${parseErr}`);
                }
              })();
            });
          });

          fetch.once('error', (fetchErr) => {
            imap.end();
            // If fetch fails (e.g., UID not found), resolve with null
            this.logger.warn(`Fetch error for UID ${uid}: ${fetchErr.message}`);
            resolve(null);
          });

          fetch.once('end', async () => {
            this.logger.log(`Fetch ended: messageReceived=${messageReceived}`);
            // Wait for parsing to complete before resolving
            if (parsePromise) {
              await parsePromise;
            }
            this.logger.log(`Parse complete: emailData=${emailData ? 'set' : 'null'}`);
            imap.end();
            resolve(emailData);
          });
        });
      });

      imap.once('error', (err: Error) => {
        reject(err);
      });

      imap.connect();
    });
  }

  /**
   * Fetch attachment data
   */
  async fetchAttachment(
    config: ImapConfigDto,
    messageId: string,
    attachmentId: string,
    mailbox: string = 'INBOX',
  ): Promise<{ data: Buffer; mimeType: string; filename: string } | null> {
    // Extract UID from message ID format
    const uidMatch = messageId.match(/^imap-(\d+)$/);
    if (!uidMatch) {
      throw new Error('Invalid IMAP message ID format');
    }
    const uid = parseInt(uidMatch[1], 10);

    // Extract attachment index from attachmentId format (att-{uid}-{idx})
    const attMatch = attachmentId.match(/^att-\d+-(\d+)$/);
    if (!attMatch) {
      throw new Error('Invalid attachment ID format');
    }
    const attachmentIndex = parseInt(attMatch[1], 10);

    this.logger.log(
      `Fetching attachment: messageId=${messageId}, attachmentId=${attachmentId}, index=${attachmentIndex}`,
    );

    return new Promise((resolve, reject) => {
      const imap = new Imap(this.createImapConfig(config));

      imap.once('ready', () => {
        imap.openBox(mailbox, true, (err) => {
          if (err) {
            imap.end();
            reject(err);
            return;
          }

          const fetch = imap.fetch(uid, {
            bodies: '',
            struct: true,
          });

          let attachmentData: { data: Buffer; mimeType: string; filename: string } | null = null;
          let parsePromise: Promise<void> | null = null;

          fetch.on('message', (msg) => {
            let buffer = Buffer.alloc(0);

            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
              });
            });

            msg.once('end', () => {
              parsePromise = (async () => {
                try {
                  const parsed = await simpleParser(buffer);

                  if (parsed.attachments && parsed.attachments[attachmentIndex]) {
                    const att = parsed.attachments[attachmentIndex];
                    attachmentData = {
                      data: att.content,
                      mimeType: att.contentType,
                      filename: att.filename || 'attachment',
                    };
                    this.logger.log(`Attachment found: ${att.filename}, size=${att.size}`);
                  }
                } catch (parseErr) {
                  this.logger.error(`Failed to parse email for attachment: ${parseErr}`);
                }
              })();
            });
          });

          fetch.once('error', (fetchErr) => {
            imap.end();
            this.logger.warn(`Fetch error for attachment: ${fetchErr.message}`);
            resolve(null);
          });

          fetch.once('end', async () => {
            if (parsePromise) {
              await parsePromise;
            }
            imap.end();
            resolve(attachmentData);
          });
        });
      });

      imap.once('error', (err: Error) => {
        reject(err);
      });

      imap.connect();
    });
  }

  /**
   * Mark email as read/unread
   */
  async markAsRead(
    config: ImapConfigDto,
    messageId: string,
    mailbox: string,
    isRead: boolean,
  ): Promise<void> {
    const uidMatch = messageId.match(/^imap-(\d+)$/);
    if (!uidMatch) {
      throw new Error('Invalid IMAP message ID format');
    }
    const uid = parseInt(uidMatch[1], 10);

    return new Promise((resolve, reject) => {
      const imap = new Imap(this.createImapConfig(config));

      imap.once('ready', () => {
        imap.openBox(mailbox, false, (err) => {
          if (err) {
            imap.end();
            reject(err);
            return;
          }

          // imap.addFlags/delFlags uses UIDs by default
          const method = isRead ? 'addFlags' : 'delFlags';
          imap[method](uid, '\\Seen', (flagErr) => {
            imap.end();
            if (flagErr) {
              reject(flagErr);
            } else {
              resolve();
            }
          });
        });
      });

      imap.once('error', (err: Error) => {
        reject(err);
      });

      imap.connect();
    });
  }

  /**
   * Star/unstar email
   */
  async starEmail(
    config: ImapConfigDto,
    messageId: string,
    mailbox: string,
    isStarred: boolean,
  ): Promise<void> {
    const uidMatch = messageId.match(/^imap-(\d+)$/);
    if (!uidMatch) {
      throw new Error('Invalid IMAP message ID format');
    }
    const uid = parseInt(uidMatch[1], 10);

    return new Promise((resolve, reject) => {
      const imap = new Imap(this.createImapConfig(config));

      imap.once('ready', () => {
        imap.openBox(mailbox, false, (err) => {
          if (err) {
            imap.end();
            reject(err);
            return;
          }

          // imap.addFlags/delFlags uses UIDs by default
          const method = isStarred ? 'addFlags' : 'delFlags';
          imap[method](uid, '\\Flagged', (flagErr) => {
            imap.end();
            if (flagErr) {
              reject(flagErr);
            } else {
              resolve();
            }
          });
        });
      });

      imap.once('error', (err: Error) => {
        reject(err);
      });

      imap.connect();
    });
  }

  /**
   * Delete email (move to trash or permanent delete)
   */
  async deleteEmail(
    config: ImapConfigDto,
    messageId: string,
    mailbox: string,
    permanent: boolean = false,
  ): Promise<void> {
    const uidMatch = messageId.match(/^imap-(\d+)$/);
    if (!uidMatch) {
      throw new Error('Invalid IMAP message ID format');
    }
    const uid = parseInt(uidMatch[1], 10);

    return new Promise((resolve, reject) => {
      const imap = new Imap(this.createImapConfig(config));

      imap.once('ready', () => {
        imap.openBox(mailbox, false, (err) => {
          if (err) {
            imap.end();
            reject(err);
            return;
          }

          if (permanent) {
            // Permanently delete - imap.addFlags uses UIDs by default
            imap.addFlags(uid, '\\Deleted', (flagErr) => {
              if (flagErr) {
                imap.end();
                reject(flagErr);
                return;
              }

              imap.expunge((expungeErr) => {
                imap.end();
                if (expungeErr) {
                  reject(expungeErr);
                } else {
                  resolve();
                }
              });
            });
          } else {
            // Move to Trash - imap.move uses UIDs by default
            imap.move(uid, 'Trash', (moveErr) => {
              imap.end();
              if (moveErr) {
                // Try alternative trash folder names
                this.tryMoveToTrash(config, uid, mailbox).then(resolve).catch(reject);
              } else {
                resolve();
              }
            });
          }
        });
      });

      imap.once('error', (err: Error) => {
        reject(err);
      });

      imap.connect();
    });
  }

  /**
   * Try moving to alternative trash folder names
   */
  private async tryMoveToTrash(config: ImapConfigDto, uid: number, mailbox: string): Promise<void> {
    const trashNames = ['Trash', 'Deleted', 'Deleted Items', '[Gmail]/Trash'];

    for (const trashName of trashNames) {
      try {
        await this.moveToFolder(config, uid, mailbox, trashName);
        return;
      } catch {
        // Continue to next trash folder name
      }
    }

    throw new Error('Could not find trash folder');
  }

  /**
   * Move email to a specific folder
   */
  private async moveToFolder(
    config: ImapConfigDto,
    uid: number,
    fromMailbox: string,
    toMailbox: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.createImapConfig(config));

      imap.once('ready', () => {
        imap.openBox(fromMailbox, false, (err) => {
          if (err) {
            imap.end();
            reject(err);
            return;
          }

          // imap.move uses UIDs by default
          imap.move(uid, toMailbox, (moveErr) => {
            imap.end();
            if (moveErr) {
              reject(moveErr);
            } else {
              resolve();
            }
          });
        });
      });

      imap.once('error', (err: Error) => {
        reject(err);
      });

      imap.connect();
    });
  }

  /**
   * Fetch new emails since last UID (for polling)
   */
  async fetchNewEmails(
    config: ImapConfigDto,
    mailbox: string,
    lastUid: number,
  ): Promise<{ emails: EmailListItemDto[]; lastUid: number }> {
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.createImapConfig(config));
      const emails: EmailListItemDto[] = [];
      let newLastUid = lastUid;

      imap.once('ready', () => {
        imap.openBox(mailbox, true, (err) => {
          if (err) {
            imap.end();
            reject(err);
            return;
          }

          // Search for messages with UID greater than lastUid
          imap.search([['UID', `${lastUid + 1}:*`]], (searchErr, results) => {
            if (searchErr) {
              imap.end();
              reject(searchErr);
              return;
            }

            // Filter out the lastUid itself (IMAP range is inclusive)
            const newResults = results.filter((uid) => uid > lastUid);

            if (newResults.length === 0) {
              imap.end();
              resolve({ emails: [], lastUid });
              return;
            }

            const fetch = imap.fetch(newResults, {
              bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
              struct: true,
            });

            fetch.on('message', (msg, seqno) => {
              let uid = 0;
              let attributes: Imap.ImapMessageAttributes | undefined;
              let headerBuffer = '';

              msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                  headerBuffer += chunk.toString('utf8');
                });
              });

              msg.once('attributes', (attrs) => {
                attributes = attrs;
                uid = attrs.uid;
                if (uid > newLastUid) {
                  newLastUid = uid;
                }
              });

              msg.once('end', () => {
                const headers = this.parseHeaders(headerBuffer);
                const flags = attributes?.flags || [];

                emails.push({
                  id: `imap-${uid}`,
                  threadId: `imap-thread-${uid}`,
                  labelIds: [mailbox],
                  snippet: '',
                  from: this.parseEmailAddress(headers.from),
                  subject: headers.subject,
                  date: headers.date,
                  isRead: flags.includes('\\Seen'),
                  isStarred: flags.includes('\\Flagged'),
                  hasAttachments: this.hasAttachments(attributes?.struct),
                });
              });
            });

            fetch.once('error', (fetchErr) => {
              imap.end();
              reject(fetchErr);
            });

            fetch.once('end', () => {
              imap.end();
              resolve({ emails, lastUid: newLastUid });
            });
          });
        });
      });

      imap.once('error', (err: Error) => {
        reject(err);
      });

      imap.connect();
    });
  }

  // ==================== Helper Methods ====================

  private parseHeaders(headerStr: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const lines = headerStr.split(/\r?\n/);
    let currentKey = '';
    let currentValue = '';

    for (const line of lines) {
      if (line.startsWith(' ') || line.startsWith('\t')) {
        // Continuation of previous header
        currentValue += ' ' + line.trim();
      } else {
        // Save previous header
        if (currentKey) {
          headers[currentKey.toLowerCase()] = currentValue;
        }

        // Parse new header
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          currentKey = line.substring(0, colonIndex);
          currentValue = line.substring(colonIndex + 1).trim();
        }
      }
    }

    // Save last header
    if (currentKey) {
      headers[currentKey.toLowerCase()] = currentValue;
    }

    return headers;
  }

  private parseEmailAddress(addressStr?: string): EmailAddressDto | undefined {
    if (!addressStr) return undefined;

    // Parse "Name <email@example.com>" or "email@example.com"
    const match = addressStr.match(/(?:"?([^"]*)"?\s*)?<?([^>]+@[^>]+)>?/);
    if (match) {
      return {
        name: match[1]?.trim() || undefined,
        email: match[2].trim(),
      };
    }

    return { email: addressStr.trim() };
  }

  private parseAddressObject(addr?: AddressObject | AddressObject[]): EmailAddressDto | undefined {
    if (!addr) return undefined;

    // Handle array of AddressObjects
    const addrObj = Array.isArray(addr) ? addr[0] : addr;
    if (!addrObj || !addrObj.value || addrObj.value.length === 0) return undefined;

    const first = addrObj.value[0];
    return {
      email: first.address || '',
      name: first.name || undefined,
    };
  }

  private parseAddressArray(addr?: AddressObject | AddressObject[]): EmailAddressDto[] | undefined {
    if (!addr) return undefined;

    // Handle array of AddressObjects
    const addrObj = Array.isArray(addr) ? addr[0] : addr;
    if (!addrObj || !addrObj.value || addrObj.value.length === 0) return undefined;

    return addrObj.value.map((a) => ({
      email: a.address || '',
      name: a.name || undefined,
    }));
  }

  private hasAttachments(struct: any): boolean {
    if (!struct) return false;

    if (Array.isArray(struct)) {
      return struct.some((part) => this.hasAttachments(part));
    }

    if (struct.disposition && struct.disposition.type === 'attachment') {
      return true;
    }

    if (struct.parts) {
      return this.hasAttachments(struct.parts);
    }

    return false;
  }

  private createSnippet(text: string, maxLength: number = 150): string {
    if (!text) return '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + '...' : cleaned;
  }
}
