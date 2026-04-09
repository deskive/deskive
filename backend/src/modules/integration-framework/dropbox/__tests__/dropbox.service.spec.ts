/**
 * Dropbox Service Tests
 *
 * Tests for the main Dropbox service including file operations
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import nock from 'nock';
import { DropboxService } from '../dropbox.service';
import { DropboxOAuthService } from '../dropbox-oauth.service';
import { deskiveService } from '../../../deskive/deskive.service';
import { ConfigService } from '@nestjs/config';
import { OAUTH_MOCK_CREDENTIALS } from '../../../../../test/helpers/mock-credentials';
import { cleanupOAuthMocks } from '../../../../../test/helpers/oauth-mock.helper';

describe('DropboxService', () => {
  let service: DropboxService;
  let deskiveService: jest.Mocked<deskiveService>;
  let oauthService: DropboxOAuthService;

  const mockUserId = 'user-123';
  const mockWorkspaceId = 'workspace-456';
  const mockAccessToken = OAUTH_MOCK_CREDENTIALS.dropbox.accessToken;

  const mockConnection = {
    id: 'connection-123',
    workspace_id: mockWorkspaceId,
    user_id: mockUserId,
    access_token: mockAccessToken,
    refresh_token: OAUTH_MOCK_CREDENTIALS.dropbox.refreshToken,
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
    account_id: OAUTH_MOCK_CREDENTIALS.dropbox.accountId,
    dropbox_email: 'test@example.com',
    dropbox_name: 'Test User',
    is_active: true,
  };

  const mockConfig: Record<string, string> = {
    DROPBOX_CLIENT_ID: OAUTH_MOCK_CREDENTIALS.dropbox.clientId,
    DROPBOX_CLIENT_SECRET: OAUTH_MOCK_CREDENTIALS.dropbox.clientSecret,
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const mockdeskiveService = {
      findOne: jest.fn(),
      findMany: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      uploadFile: jest.fn(),
      getPublicUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DropboxService,
        DropboxOAuthService,
        {
          provide: deskiveService,
          useValue: mockdeskiveService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<DropboxService>(DropboxService);
    deskiveService = module.get(deskiveService);
    oauthService = module.get<DropboxOAuthService>(DropboxOAuthService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    describe('getConnection', () => {
      it('should return connection when found', async () => {
        deskiveService.findOne.mockResolvedValue(mockConnection);

        const result = await service.getConnection(mockUserId, mockWorkspaceId);

        expect(result).toBeDefined();
        expect(result?.workspaceId).toBe(mockWorkspaceId);
        expect(result?.dropboxEmail).toBe('test@example.com');
        expect(deskiveService.findOne).toHaveBeenCalledWith('dropbox_connections', {
          workspace_id: mockWorkspaceId,
          user_id: mockUserId,
          is_active: true,
        });
      });

      it('should return null when connection not found', async () => {
        deskiveService.findOne.mockResolvedValue(null);

        const result = await service.getConnection(mockUserId, mockWorkspaceId);

        expect(result).toBeNull();
      });
    });

    describe('disconnect', () => {
      it('should disconnect user from Dropbox', async () => {
        deskiveService.findOne.mockResolvedValue(mockConnection);
        deskiveService.update.mockResolvedValue({ ...mockConnection, is_active: false });

        // Mock token revocation
        nock('https://api.dropboxapi.com')
          .post('/2/auth/token/revoke')
          .reply(200, null);

        await service.disconnect(mockUserId, mockWorkspaceId);

        expect(deskiveService.update).toHaveBeenCalledWith(
          'dropbox_connections',
          mockConnection.id,
          expect.objectContaining({
            is_active: false,
          })
        );
      });

      it('should throw NotFoundException when connection not found', async () => {
        deskiveService.findOne.mockResolvedValue(null);

        await expect(service.disconnect(mockUserId, mockWorkspaceId)).rejects.toThrow(
          NotFoundException
        );
      });
    });
  });

  describe('File Operations', () => {
    beforeEach(() => {
      // Mock connection retrieval for all file operations
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    describe('listFiles', () => {
      it('should list files in root folder', async () => {
        const mockFiles = {
          entries: [
            {
              '.tag': 'folder',
              id: 'id:folder1',
              name: 'Documents',
              path_lower: '/documents',
              path_display: '/Documents',
            },
            {
              '.tag': 'file',
              id: 'id:file1',
              name: 'test.pdf',
              path_lower: '/test.pdf',
              path_display: '/test.pdf',
              size: 1024,
              client_modified: '2024-01-01T00:00:00Z',
              server_modified: '2024-01-01T00:00:00Z',
            },
          ],
          cursor: 'mock-cursor-123',
          has_more: false,
        };

        nock('https://api.dropboxapi.com')
          .post('/2/files/list_folder')
          .reply(200, mockFiles);

        const result = await service.listFiles(mockUserId, mockWorkspaceId);

        expect(result.files).toHaveLength(2);
        expect(result.files[0].name).toBe('Documents');
        expect(result.files[1].name).toBe('test.pdf');
        expect(result.hasMore).toBe(false);
      });

      it('should search files when query is provided', async () => {
        const mockSearchResults = {
          matches: [
            {
              metadata: {
                metadata: {
                  '.tag': 'file',
                  id: 'id:file1',
                  name: 'report.pdf',
                  path_lower: '/documents/report.pdf',
                  path_display: '/Documents/report.pdf',
                  size: 2048,
                },
              },
            },
          ],
          cursor: 'search-cursor',
          has_more: false,
        };

        nock('https://api.dropboxapi.com')
          .post('/2/files/search_v2')
          .reply(200, mockSearchResults);

        const result = await service.listFiles(mockUserId, mockWorkspaceId, {
          query: 'report',
        });

        expect(result.files).toHaveLength(1);
        expect(result.files[0].name).toBe('report.pdf');
      });

      it('should handle pagination with cursor', async () => {
        const mockMoreFiles = {
          entries: [
            {
              '.tag': 'file',
              id: 'id:file2',
              name: 'more.txt',
              path_lower: '/more.txt',
              path_display: '/more.txt',
              size: 100,
            },
          ],
          cursor: 'new-cursor',
          has_more: false,
        };

        nock('https://api.dropboxapi.com')
          .post('/2/files/list_folder/continue')
          .reply(200, mockMoreFiles);

        const result = await service.listFiles(mockUserId, mockWorkspaceId, {
          cursor: 'previous-cursor',
        });

        expect(result.files).toHaveLength(1);
      });
    });

    describe('getFile', () => {
      it('should get file metadata', async () => {
        const mockFileMetadata = {
          '.tag': 'file',
          id: 'id:file1',
          name: 'document.pdf',
          path_lower: '/document.pdf',
          path_display: '/document.pdf',
          size: 4096,
          client_modified: '2024-01-01T00:00:00Z',
          server_modified: '2024-01-01T00:00:00Z',
          rev: 'abc123',
          content_hash: 'hash123',
        };

        nock('https://api.dropboxapi.com')
          .post('/2/files/get_metadata')
          .reply(200, mockFileMetadata);

        const result = await service.getFile(mockUserId, mockWorkspaceId, '/document.pdf');

        expect(result.name).toBe('document.pdf');
        expect(result.size).toBe(4096);
      });

      it('should throw NotFoundException for non-existent file', async () => {
        nock('https://api.dropboxapi.com')
          .post('/2/files/get_metadata')
          .reply(409, {
            error: {
              '.tag': 'path',
              path: { '.tag': 'not_found' },
            },
          });

        await expect(
          service.getFile(mockUserId, mockWorkspaceId, '/nonexistent.pdf')
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('getTemporaryLink', () => {
      it('should get temporary download link', async () => {
        nock('https://api.dropboxapi.com')
          .post('/2/files/get_temporary_link')
          .reply(200, {
            link: 'https://dl.dropboxusercontent.com/mock-temp-link',
            metadata: { name: 'file.pdf' },
          });

        const result = await service.getTemporaryLink(
          mockUserId,
          mockWorkspaceId,
          '/file.pdf'
        );

        expect(result).toContain('https://dl.dropboxusercontent.com');
      });
    });

    describe('createFolder', () => {
      it('should create a new folder', async () => {
        const mockCreatedFolder = {
          metadata: {
            '.tag': 'folder',
            id: 'id:newfolder',
            name: 'New Folder',
            path_lower: '/new folder',
            path_display: '/New Folder',
          },
        };

        nock('https://api.dropboxapi.com')
          .post('/2/files/create_folder_v2')
          .reply(200, mockCreatedFolder);

        const result = await service.createFolder(
          mockUserId,
          mockWorkspaceId,
          '/New Folder'
        );

        expect(result.name).toBe('New Folder');
      });
    });

    describe('deleteFile', () => {
      it('should delete a file', async () => {
        nock('https://api.dropboxapi.com')
          .post('/2/files/delete_v2')
          .reply(200, {
            metadata: {
              '.tag': 'file',
              name: 'deleted.txt',
            },
          });

        await expect(
          service.deleteFile(mockUserId, mockWorkspaceId, '/deleted.txt')
        ).resolves.not.toThrow();
      });
    });

    describe('moveFile', () => {
      it('should move a file', async () => {
        const mockMovedFile = {
          metadata: {
            '.tag': 'file',
            id: 'id:file1',
            name: 'moved.txt',
            path_lower: '/archive/moved.txt',
            path_display: '/Archive/moved.txt',
            size: 100,
          },
        };

        nock('https://api.dropboxapi.com')
          .post('/2/files/move_v2')
          .reply(200, mockMovedFile);

        const result = await service.moveFile(
          mockUserId,
          mockWorkspaceId,
          '/moved.txt',
          '/Archive/moved.txt'
        );

        expect(result.pathDisplay).toBe('/Archive/moved.txt');
      });
    });

    describe('copyFile', () => {
      it('should copy a file', async () => {
        const mockCopiedFile = {
          metadata: {
            '.tag': 'file',
            id: 'id:file2',
            name: 'copy.txt',
            path_lower: '/backup/copy.txt',
            path_display: '/Backup/copy.txt',
            size: 100,
          },
        };

        nock('https://api.dropboxapi.com')
          .post('/2/files/copy_v2')
          .reply(200, mockCopiedFile);

        const result = await service.copyFile(
          mockUserId,
          mockWorkspaceId,
          '/original.txt',
          '/Backup/copy.txt'
        );

        expect(result.pathDisplay).toBe('/Backup/copy.txt');
      });
    });

    describe('createSharedLink', () => {
      it('should create shared link for file', async () => {
        nock('https://api.dropboxapi.com')
          .post('/2/sharing/list_shared_links')
          .reply(200, { links: [] });

        nock('https://api.dropboxapi.com')
          .post('/2/sharing/create_shared_link_with_settings')
          .reply(200, {
            url: 'https://www.dropbox.com/s/mock-share-link',
            name: 'shared.pdf',
            path_lower: '/shared.pdf',
          });

        const result = await service.createSharedLink(
          mockUserId,
          mockWorkspaceId,
          '/shared.pdf'
        );

        expect(result.url).toContain('dropbox.com');
      });

      it('should return existing shared link', async () => {
        nock('https://api.dropboxapi.com')
          .post('/2/sharing/list_shared_links')
          .reply(200, {
            links: [
              {
                url: 'https://www.dropbox.com/s/existing-link',
                name: 'shared.pdf',
                path_lower: '/shared.pdf',
              },
            ],
          });

        const result = await service.createSharedLink(
          mockUserId,
          mockWorkspaceId,
          '/shared.pdf'
        );

        expect(result.url).toContain('existing-link');
      });
    });

    describe('getStorageQuota', () => {
      it('should get storage quota information', async () => {
        nock('https://api.dropboxapi.com')
          .post('/2/users/get_space_usage')
          .reply(200, {
            used: 1073741824, // 1 GB
            allocation: {
              '.tag': 'individual',
              allocated: 2147483648, // 2 GB
            },
          });

        const result = await service.getStorageQuota(mockUserId, mockWorkspaceId);

        expect(result.used).toBe(1073741824);
        expect(result.allocated).toBe(2147483648);
        expect(result.usagePercent).toBe(50);
      });
    });
  });

  describe('Token Refresh', () => {
    it('should refresh expired token before making API call', async () => {
      const expiredConnection = {
        ...mockConnection,
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
      };

      deskiveService.findOne.mockResolvedValue(expiredConnection);
      deskiveService.update.mockResolvedValue(mockConnection);

      // Mock token refresh
      nock('https://api.dropboxapi.com')
        .post('/oauth2/token')
        .reply(200, {
          access_token: 'new-access-token',
          token_type: 'bearer',
          expires_in: 14400,
        });

      // Mock the actual API call after refresh
      nock('https://api.dropboxapi.com')
        .post('/2/users/get_space_usage')
        .reply(200, {
          used: 1000,
          allocation: { allocated: 2000 },
        });

      await service.getStorageQuota(mockUserId, mockWorkspaceId);

      // Verify token was refreshed
      expect(deskiveService.update).toHaveBeenCalledWith(
        'dropbox_connections',
        expiredConnection.id,
        expect.objectContaining({
          access_token: 'new-access-token',
        })
      );
    });

    it('should throw error when no refresh token and token expired', async () => {
      const expiredConnectionNoRefresh = {
        ...mockConnection,
        expires_at: new Date(Date.now() - 1000).toISOString(),
        refresh_token: null,
      };

      deskiveService.findOne.mockResolvedValue(expiredConnectionNoRefresh);

      await expect(
        service.getStorageQuota(mockUserId, mockWorkspaceId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('No Connection', () => {
    it('should throw NotFoundException when no connection exists', async () => {
      deskiveService.findOne.mockResolvedValue(null);

      await expect(
        service.listFiles(mockUserId, mockWorkspaceId)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
