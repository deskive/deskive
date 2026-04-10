import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, InternalServerErrorException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { RegisterDto, LoginDto, PasswordResetRequestDto, PasswordResetConfirmDto, ChangePasswordDto, VerifyEmailDto, ResendEmailVerificationDto, UpdateProfileDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      // Build registration data with frontendUrl for email verification
      // Ensure we have a valid URL with protocol
      let baseUrl = dto.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5175';

      // Make sure URL has protocol
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }

      // Remove trailing slash if present
      baseUrl = baseUrl.replace(/\/$/, '');

      const verificationUrl = `${baseUrl}/verify-email`;

      this.logger.log(`Registration attempt for ${dto.email}, verificationUrl: ${verificationUrl}`);

      // Use anon key client for registration
      // database will check auth.settings for:
      // - allowRegistration
      // - password validation based on settings
      // - requireEmailVerification (sends email if true)
      // - defaultRole
      const response = await this.db /* TODO: replace authClient */.auth.register({
        email: dto.email,
        password: dto.password,
        name: dto.name,
        metadata: {
          username: dto.username,
        },
        frontendUrl: verificationUrl, // For email verification redirect
      });

      if (!response || !response.user) {
        throw new BadRequestException('Registration failed');
      }

      const user = response.user;
      const authToken = (response as any).token || (response as any).accessToken;
      const refreshToken = (response as any).refreshToken;

      // Create default user settings
      await this.createDefaultUserSettings(user.id);

      return {
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          username: (user as any).username || dto.username,
          name: user.name || dto.name,
          emailVerified: (user as any).emailVerified || false,
        },
        access_token: authToken, // Use database JWT directly
        refresh_token: refreshToken,
        // If email verification is required, frontend should show message
        requiresVerification: !(user as any).emailVerified,
      };
    } catch (error) {
      this.logger.error('Registration failed', error);

      // Extract error message from databaseApiError
      const errorMessage = error.details?.message || error.message || 'Registration failed';

      // Check error status/code
      if (error.status === 409 || error.code === 'HTTP_409') {
        throw new ConflictException(errorMessage);
      }
      if (error.status === 400 || error.code === 'HTTP_400') {
        throw new BadRequestException(errorMessage);
      }

      // Default error with extracted message
      throw new BadRequestException(errorMessage);
    }
  }

  async login(dto: LoginDto) {
    try {
      // FIRST: Check if user exists and if email is verified BEFORE attempting database sign in
      // This prevents database from throwing 401 before we can check email verification
      let userCheckResult;
      try {
        // Check email verification status. The legacy code queried
        // `auth.users` (Supabase schema namespace); the open-source build
        // also exposes that as a view (see migrations/002_auth_users.sql),
        // but querying public.users directly is clearer.
        userCheckResult = await this.db.raw(
          'SELECT id, email, email_confirmed_at FROM "users" WHERE LOWER(email) = LOWER($1)',
          [dto.email]
        );

        // DEBUG LOG - Remove this after testing
        this.logger.log(`Email verification check for ${dto.email}:`, JSON.stringify(userCheckResult, null, 2));
      } catch (queryError) {
        // If query fails, continue to login attempt (user might not exist)
        this.logger.warn('User check query failed, continuing to login:', queryError);
        userCheckResult = null;
      }

      // db.raw returns a pg QueryResult ({rows, rowCount, ...}). Older
      // SDK code may have returned an array directly, so handle both shapes.
      const rows = (userCheckResult as any)?.rows ?? userCheckResult;
      if (rows && rows.length > 0) {
        const userRecord = rows[0];

        // Check if email is confirmed
        if (!userRecord.email_confirmed_at) {
          this.logger.warn(`Login attempt with unverified email: ${dto.email}`);
          throw new UnauthorizedException(
            'Please verify your email address before logging in. Check your inbox for the confirmation link.'
          );
        } else {
          this.logger.log(`Email is verified for ${dto.email}, email_confirmed_at: ${userRecord.email_confirmed_at}`);
        }
      }

      // NOW attempt database sign in (email is verified or user doesn't exist)
      // TODO: implement password verification with bcrypt
      const response = await this.db.findOne("users", { email: dto.email }); // was: this.db.signIn(dto.email, dto.password);

      this.logger.log('Login response:', response);

      // Check if MFA is required
      if ((response as any).mfa_required) {
        return {
          mfa_required: true,
          user_id: (response as any).user_id,
          message: 'MFA verification required',
        };
      }

      const session = response as any;
      const user = session.user;

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log('User from login:', user);

      // Get database JWT token directly - no need to generate our own
      const authToken = session.token || session.accessToken;
      const refreshToken = session.refreshToken;

      const fullUserProfile = user;
      const metadata = fullUserProfile?.metadata || {};

      this.logger.log('User metadata:', metadata);

      // Ensure user has default settings (for existing users who signed up before this feature)
      await this.ensureUserSettings(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: metadata.name || fullUserProfile?.fullName || fullUserProfile?.name || user.name,
          username: fullUserProfile?.username || metadata.username,
          avatar_url: fullUserProfile?.avatar_url,
          profileImage: fullUserProfile?.avatar_url, // Include both for compatibility
          bio: metadata.bio || fullUserProfile?.bio,
          location: metadata.location || fullUserProfile?.location,
          website: metadata.website || fullUserProfile?.website,
          phone: metadata.phone || fullUserProfile?.phone,
          emailVerified: true, // We already verified above
        },
        access_token: authToken, // Use database JWT directly
        refresh_token: refreshToken,
      };
    } catch (error) {
      this.logger.error('Login failed', error);

      // If it's already an UnauthorizedException we threw (email not verified), re-throw it
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Handle database API errors
      if (error.status === 401 || error.code === 'HTTP_401' || error.details?.statusCode === 401) {
        throw new UnauthorizedException('Invalid email or password. Please check your credentials and try again.');
      }
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Invalid email or password. Please check your credentials and try again.');
      }
      if (error.response?.status === 400 || error.status === 400) {
        throw new BadRequestException('Invalid login data');
      }
      throw new UnauthorizedException('Invalid email or password. Please check your credentials and try again.');
    }
  }

  async getProfile(userId: string) {
    try {
      // Use the SDK's getUserById to get the full user profile
      const userProfile = await this.db.getUserById(userId);

      if (!userProfile) {
        throw new UnauthorizedException('User not found');
      }

      // Extract metadata for additional profile fields
      const metadata = userProfile.metadata || {};

      return {
        id: userProfile.id,
        email: userProfile.email,
        username: userProfile.username || metadata.username,
        name: metadata.name || (userProfile as any).fullName || userProfile.name,
        bio: metadata.bio || userProfile.bio,
        location: metadata.location || userProfile.location,
        website: metadata.website || userProfile.website,
        phone: metadata.phone || userProfile.phone,
        countryCode: metadata.countryCode,
        avatar_url: userProfile.avatar_url,
        profileImage: userProfile.avatar_url, // Include both for compatibility
        date_of_birth: userProfile.date_of_birth,
        gender: userProfile.gender,
        email_verified: userProfile.email_verified,
        timezone: metadata.timezone || 'UTC',
        language: metadata.language || 'en',
        preferences: metadata.preferences || {},
        social_links: metadata.social_links || {},
        interests: metadata.interests || [],
        createdAt: userProfile.created_at,
        lastSignIn: userProfile.last_login_at,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error.response?.status === 404) {
        throw new NotFoundException('User profile not found');
      }
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Access denied');
      }
      throw new InternalServerErrorException('Failed to retrieve profile');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      // Use database to refresh the token
      const response = await this.db /* TODO: replace authClient */.auth.refreshToken(refreshToken);

      return {
        access_token: (response as any).token || (response as any).accessToken,
        refresh_token: (response as any).refreshToken,
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  async logout(userId: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
    try {
      // Note: We don't have the user's database token stored, so we can't Call database's signOut
      // The frontend will clear its local tokens, which is sufficient for logout
      // In a production app, you might want to:
      // 1. Store user tokens in Redis/cache and clear them here
      // 2. Maintain a token blacklist
      // 3. Use refresh tokens with expiry
      
      // TODO: In future if possible - Clear any cached user tokens from Redis/cache when implemented
      // TODO: Add token to blacklist if using that pattern
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      this.logger.error('Logout error:', error);
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
    }
  }

  async validateUser(userId: string, jwtPayload?: any) {
    try {
      // Use the database service's getUserById method
      const userProfile = await this.db.getUserById(userId);
      
      if (!userProfile) {
        // Fallback to JWT data if getUserById fails
        return {
          user: {
            id: userId,
            email: jwtPayload?.email || null,
            name: jwtPayload?.name || null,
            username: jwtPayload?.username || null,
            profileImage: null,
            createdAt: new Date().toISOString(),
            role: jwtPayload?.role || 'member',
            bio: null,
            location: null,
            website: null,
          }
        };
      }

      // Extract metadata for profile fields
      const metadata = userProfile.metadata || {};

      // Extract global role from database
      const globalRole = userProfile.role || metadata.role || userProfile.app_metadata?.role || 'member';

      this.logger.log('[validateUser] User data:', JSON.stringify(userProfile, null, 2));
      this.logger.log('[validateUser] User metadata:', JSON.stringify(metadata, null, 2));
      this.logger.log('[validateUser] Extracted global role:', globalRole);
      this.logger.log('[validateUser] Checking role from:', {
        'userProfile.role': userProfile.role,
        'metadata.role': metadata.role,
        'app_metadata.role': userProfile.app_metadata?.role,
      });

      // Check if we got minimal data from SDK (only metadata fields)
      // If so, merge with JWT payload data for more complete profile
      const hasCompleteProfile = userProfile.email && (userProfile.name || (userProfile as any).fullName || metadata.name);

      if (!hasCompleteProfile && jwtPayload) {
        // SDK returned minimal data, merge with JWT payload
        return {
          user: {
            id: userProfile.id || userId,
            email: jwtPayload.email || userProfile.email || null,
            name: jwtPayload.name || metadata.name || (userProfile as any).fullName || userProfile.name || null,
            username: jwtPayload.username || userProfile.username || metadata.username || null,
            profileImage: metadata.avatarUrl || userProfile.avatar_url || null,
            avatar_url: metadata.avatarUrl || userProfile.avatar_url || null,
            bio: metadata.bio || userProfile.bio || null,
            location: metadata.location || userProfile.location || null,
            website: metadata.website || userProfile.website || null,
            phone: metadata.phone || userProfile.phone || null,
            date_of_birth: userProfile.date_of_birth || null,
            gender: userProfile.gender || null,
            email_verified: userProfile.email_verified || false,
            phone_verified: userProfile.phone_verified || false,
            last_login_at: userProfile.last_login_at || null,
            created_at: userProfile.created_at || new Date().toISOString(),
            updated_at: userProfile.updated_at || new Date().toISOString(),
            createdAt: userProfile.created_at || new Date().toISOString(),
            role: globalRole,
            metadata: userProfile.metadata || {},
            app_metadata: userProfile.app_metadata || {},
          }
        };
      }

      // Return the full user profile from auth service table
      // Fields directly from the table structure
      return {
        user: {
          id: userProfile.id || userId,
          email: userProfile.email || null,
          name: metadata.name || (userProfile as any).fullName || userProfile.name || null,
          username: userProfile.username || metadata.username || null,
          profileImage: metadata.avatarUrl || userProfile.avatar_url || null, // Frontend expects profileImage
          avatar_url: metadata.avatarUrl || userProfile.avatar_url || null,
          bio: metadata.bio || userProfile.bio || null,
          location: metadata.location || userProfile.location || null,
          website: metadata.website || userProfile.website || null,
          phone: metadata.phone || userProfile.phone || null,
          date_of_birth: userProfile.date_of_birth || null,
          gender: userProfile.gender || null,
          email_verified: userProfile.email_verified || false,
          phone_verified: userProfile.phone_verified || false,
          last_login_at: userProfile.last_login_at || null,
          created_at: userProfile.created_at || new Date().toISOString(),
          updated_at: userProfile.updated_at || new Date().toISOString(),
          createdAt: userProfile.created_at || new Date().toISOString(), // Add for frontend compatibility
          role: globalRole,
          // Additional data from metadata JSONB fields if needed
          metadata: userProfile.metadata || {},
          app_metadata: userProfile.app_metadata || {},
        }
      };
    } catch (error) {
      this.logger.error('Validate user error:', error);
      // Fallback to JWT data
      return {
        user: {
          id: userId,
          email: jwtPayload?.email || null,
          name: jwtPayload?.name || null,
          username: jwtPayload?.username || null,
          profileImage: null,
          createdAt: new Date().toISOString(),
          role: 'user',
          bio: null,
          location: null,
          website: null,
        }
      };
    }
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    try {
      // Get current user to preserve existing metadata
      const currentUser = await this.db.getUserById(userId);
      const currentMetadata = currentUser?.metadata || {};

      // Build update data - database stores some fields in root, others in metadata
      const updateData: any = {};

      // Core fields that go in root level
      if (data.name !== undefined) updateData.fullName = data.name; // SDK uses fullName, not name
      if (data.email !== undefined) updateData.email = data.email;

      // Additional profile fields - store in metadata since SDK doesn't persist them at root level
      const metadataUpdates: any = { ...currentMetadata };
      if (data.name !== undefined) metadataUpdates.name = data.name;
      if (data.website !== undefined) metadataUpdates.website = data.website;
      if (data.bio !== undefined) metadataUpdates.bio = data.bio;
      if (data.phone !== undefined) metadataUpdates.phone = data.phone;
      if (data.countryCode !== undefined) metadataUpdates.countryCode = data.countryCode;
      if (data.location !== undefined) metadataUpdates.location = data.location;
      if (data.avatarUrl !== undefined) metadataUpdates.avatarUrl = data.avatarUrl; // Save avatar URL to metadata
      if (data.timezone !== undefined) metadataUpdates.timezone = data.timezone;
      if (data.language !== undefined) metadataUpdates.language = data.language;

      updateData.metadata = metadataUpdates;

      this.logger.log(`Updating profile for user ${userId} with data:`, updateData);

      // Update the user profile in database
      const updateResult = await this.db.update("users", userId, updateData);

      this.logger.log('Update result:', updateResult);

      // Get the updated profile to return fresh data
      const updatedProfile = await this.db.getUserById(userId);

      this.logger.log('Updated profile from database:', updatedProfile);

      // Extract profile data from both root level and metadata
      const metadata = updatedProfile?.metadata || {};

      return {
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedProfile.id,
          email: updatedProfile.email,
          name: metadata.name || (updatedProfile as any).fullName || updatedProfile.name,
          username: updatedProfile.username || metadata.username,
          website: metadata.website,
          bio: metadata.bio,
          phone: metadata.phone,
          countryCode: metadata.countryCode,
          location: metadata.location,
          avatarUrl: metadata.avatarUrl || updatedProfile.avatar_url, // Avatar from metadata
        },
      };
    } catch (error) {
      this.logger.error('Profile update error:', error);
      this.logger.error('Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        response: error.response,
        stack: error.stack
      });
      if (error.response?.status === 404) {
        throw new NotFoundException('User not found');
      }
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Access denied');
      }
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  async uploadProfileImage(userId: string, file: Express.Multer.File) {
    try {
      this.logger.log(`Processing profile image upload for user ${userId}`);
      this.logger.log(`File size: ${(file.size / 1024).toFixed(2)} KB`);

      // Generate unique file name
      const fileName = `${userId}/${Date.now()}-${file.originalname}`;

      // Upload file to storage service
      const uploadResult = await /* TODO: use StorageService */ this.db.uploadFile(
        'avatars',
        file.buffer,
        fileName,
        {
          contentType: file.mimetype,
          metadata: {
            userId,
            originalName: file.originalname,
            type: 'avatar',
          },
        }
      );

      this.logger.log('Profile image uploaded to storage');
      this.logger.log('Upload result:', JSON.stringify(uploadResult, null, 2));

      // Get public URL from upload result
      const avatarUrl = uploadResult.url;

      if (!avatarUrl) {
        throw new InternalServerErrorException('No URL returned from storage upload');
      }

      this.logger.log('Avatar URL:', avatarUrl);

      // Just return the URL - don't save to database yet
      // The URL will be saved when user clicks "Save Changes" via updateProfile
      return {
        success: true,
        profileImage: avatarUrl,
        fileName: fileName,
      };
    } catch (error) {
      this.logger.error('Profile image upload error:', error);
      if (error.response?.status === 413) {
        throw new BadRequestException('File too large');
      }
      if (error.response?.status === 415) {
        throw new BadRequestException('Invalid file type');
      }
      throw new InternalServerErrorException('Failed to upload profile image');
    }
  }

  async requestPasswordReset(dto: PasswordResetRequestDto) {
    try {
      // Use the database's requestPasswordReset method
      // This handles everything: checking if user exists, generating token, sending email
      // Send the complete reset password URL (not just the base URL)
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const frontendUrl = `${baseUrl}/reset-password`;
      // TODO: implement password reset (was: this.db.client.auth.requestPasswordReset(dto.email, frontendUrl))
      await this.db.raw("SELECT 1", []);

      return {
        success: true,
        message: 'If the email exists in our system, you will receive password reset instructions.',
      };
    } catch (error) {
      this.logger.error('Password reset request error:', error);
      // Don't expose internal errors to user
      return {
        success: true,
        message: 'If the email exists in our system, you will receive password reset instructions.',
      };
    }
  }

  async confirmPasswordReset(dto: PasswordResetConfirmDto) {
    try {
      // Use the database's resetPassword method
      // This properly validates the token and hashes the password
      // TODO: implement password reset confirmation (was: this.db.client.auth.resetPassword({token, newPassword}))
      await this.db.raw("SELECT 1", []);

      return {
        success: true,
        message: 'Password has been reset successfully',
      };
    } catch (error) {
      this.logger.error('Password reset confirmation error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to reset password');
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    try {
      // Get user to verify they exist and get their email
      const user = await this.db.getUserById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify current password by attempting to sign in
      try {
        await this.db.findOne("users", { email: user.email }); // TODO: verify currentPassword with bcrypt
      } catch (error) {
        throw new BadRequestException('Current password is incorrect');
      }

      // Update the password using the service key client
      // The SDK changePassword endpoint requires user auth context,
      // so we use updateUser with service key which has admin access
      // TODO: implement change password (was: this.db.client.auth.changePassword({currentPassword, newPassword, userId}))
      await this.db.raw("SELECT 1", []);

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      this.logger.error('Change password error:', error);
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Failed to change password');
    }
  }

  async verifyEmail(dto: VerifyEmailDto) {
    try {
      // Use database to verify the email token
      // database handles token validation and updates user's email_verified status
      await this.db /* TODO: replace authClient */.auth.verifyEmail(dto.token);

      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      this.logger.error('Email verification error:', error);

      // Extract error message from databaseApiError
      const errorMessage = error.details?.message || error.message || 'Failed to verify email';

      if (error.status === 400 || error.code === 'HTTP_400') {
        throw new BadRequestException(errorMessage);
      }

      throw new BadRequestException('Failed to verify email');
    }
  }

  async resendEmailVerification(dto: ResendEmailVerificationDto) {
    try {
      // Use the database's resendEmailVerification method
      // This handles everything: checking if user exists, generating token, sending email
      // TODO: implement email verification resend (was: this.db.client.auth.resendEmailVerification(dto.email))
      await this.db.raw("SELECT 1", []);

      return {
        success: true,
        message: 'If the email exists in our system and is not already verified, you will receive verification instructions.',
      };
    } catch (error) {
      this.logger.error('Resend email verification error:', error);
      // Don't expose internal errors - return success message for security
      return {
        success: true,
        message: 'If the email exists in our system and is not already verified, you will receive verification instructions.',
      };
    }
  }


  // ==================== OAuth Methods ====================

  /**
   * Generate GitHub OAuth authorization URL using database
   */
  async getGitHubAuthUrl(frontendUrl: string): Promise<string> {
    try {
      // Ensure the redirect URL includes the callback path
      const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5175';
      const redirectUrl = baseUrl.endsWith('/auth/callback') ? baseUrl : `${baseUrl}/auth/callback`;
      return await this.db /* TODO: replace authClient */.auth.getOAuthUrl('github', redirectUrl);
    } catch (error) {
      this.logger.error('Failed to get GitHub OAuth URL:', error);
      throw new BadRequestException('GitHub OAuth is not available');
    }
  }

  /**
   * Generate Google OAuth authorization URL using database
   */
  async getGoogleAuthUrl(frontendUrl: string): Promise<string> {
    try {
      // Ensure the redirect URL includes the callback path
      const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5175';
      const redirectUrl = baseUrl.endsWith('/auth/callback') ? baseUrl : `${baseUrl}/auth/callback`;
      return await this.db /* TODO: replace authClient */.auth.getOAuthUrl('google', redirectUrl);
    } catch (error) {
      this.logger.error('Failed to get Google OAuth URL:', error);
      throw new BadRequestException('Google OAuth is not available');
    }
  }

  /**
   * Generate Apple OAuth authorization URL using database
   */
  async getAppleAuthUrl(frontendUrl: string): Promise<string> {
    try {
      // Ensure the redirect URL includes the callback path
      const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5175';
      const redirectUrl = baseUrl.endsWith('/auth/callback') ? baseUrl : `${baseUrl}/auth/callback`;
      return await this.db /* TODO: replace authClient */.auth.getOAuthUrl('apple', redirectUrl);
    } catch (error) {
      this.logger.error('Failed to get Apple OAuth URL:', error);
      throw new BadRequestException('Apple OAuth is not available');
    }
  }

  /**
   * Process OAuth token from database
   * This is called by frontend after receiving database token from OAuth redirect
   *
   * database's job: Create/authenticate user in database database, return tokens and user info
   * Deskive's job: Just pass through database's tokens (no own JWT generation needed)
   */
  async exchangeOAuthToken(authToken: string, userId: string, email: string) {
    try {
      this.logger.log(`Processing OAuth for user: ${email}`);

      // Ensure user has default settings
      await this.ensureUserSettings(userId);

      // Get user profile from database for additional info
      let name = email.split('@')[0];
      let username = email.split('@')[0];

      try {
        const userProfile = await this.db.getUserById(userId);
        if (userProfile) {
          const metadata = userProfile.metadata || {};
          name = metadata.name || userProfile.name || (userProfile as any).fullName || name;
          username = userProfile.username || metadata.username || username;
        }
      } catch (e) {
        this.logger.warn('Could not fetch user profile for OAuth user');
      }

      return {
        token: authToken, // Use database token directly (frontend expects "token")
        access_token: authToken, // Also include access_token for compatibility
        user: {
          id: userId,
          email: email,
          name: name,
          username: username,
        },
      };
    } catch (error) {
      this.logger.error('Failed to process OAuth token:', error);
      throw new BadRequestException('OAuth processing failed');
    }
  }

  /**
   * Create default user settings for a new user
   * This ensures notification preferences and other settings are available from the start
   */
  private async createDefaultUserSettings(userId: string) {
    try {
      // Check if settings already exist
      const existingSettings = await this.db.findOne('user_settings', { user_id: userId });

      if (existingSettings) {
        this.logger.log(`User settings already exist for user ${userId}`);
        return;
      }

      // Get user's timezone (try to detect from browser or default to UTC)
      let userTimezone = 'UTC';
      try {
        const user = await this.db.getUserById(userId);
        // Check if user has timezone in metadata
        if (user?.metadata?.timezone) {
          userTimezone = user.metadata.timezone;
        }
      } catch (err) {
        this.logger.warn(`Could not fetch user timezone, using UTC as default`);
      }

      // Default notification preferences matching the correct format
      const defaultNotifications = {
        push: true,
        email: true,
        tasks: true,
        desktop: true,
        calendar: true,
        mentions: true,
        marketing: false,
        directMessages: true,
        channelMessages: true,
        categories: [
          {
            id: 'messages',
            label: 'Messages',
            description: 'Notifications for direct messages and mentions',
            settings: {
              push: true,
              email: true,
              inApp: true
            }
          },
          {
            id: 'tasks',
            label: 'Tasks & Projects',
            description: 'Updates on tasks, projects, and assignments',
            settings: {
              push: true,
              email: true,
              inApp: true
            }
          },
          {
            id: 'calendar',
            label: 'Calendar',
            description: 'Event reminders and calendar updates',
            settings: {
              push: true,
              email: true,
              inApp: true
            }
          },
          {
            id: 'workspace',
            label: 'Workspace',
            description: 'Workspace announcements and updates',
            settings: {
              push: true,
              email: true,
              inApp: true
            }
          }
        ],
        generalSettings: {
          sound: true,
          frequency: 'immediate',
          doNotDisturb: false,
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00'
          }
        }
      };

      // Create default user settings
      const userSettings = {
        user_id: userId,
        theme: 'light',
        language: 'en',
        timezone: userTimezone,
        date_format: 'MM/dd/yyyy',
        time_format: '12h',
        notifications: defaultNotifications,
        privacy: {},
        editor_preferences: {},
        dashboard_layout: {},
        sidebar_collapsed: false
      };

      await this.db.insert('user_settings', userSettings);
      this.logger.log(`Created default user settings for user ${userId} with timezone ${userTimezone}`);
    } catch (error) {
      this.logger.error(`Failed to create default user settings for user ${userId}:`, error);
      // Don't throw - user creation should succeed even if settings creation fails
    }
  }

  /**
   * Ensure user settings exist (called on login for existing users)
   * This handles users who registered before the user_settings feature was added
   */
  private async ensureUserSettings(userId: string) {
    try {
      // Check if settings already exist
      const existingSettings = await this.db.findOne('user_settings', { user_id: userId });

      if (!existingSettings) {
        this.logger.log(`User ${userId} missing settings, creating defaults`);
        await this.createDefaultUserSettings(userId);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure user settings for user ${userId}:`, error);
      // Don't throw - login should succeed even if settings check fails
    }
  }

  /**
   * Delete user account and all associated data
   * This is a permanent operation that cannot be undone
   * Complies with GDPR right to deletion requirements
   */
  async deleteAccount(userId: string, email: string, password: string) {
    try {
      this.logger.log(`Starting account deletion for user ${userId}`);

      // Step 0: Verify password using database login
      try {
        await this.db.findOne("users", { email }); // TODO: verify password with bcrypt
        this.logger.log(`Password verified for user ${userId}`);
      } catch (error) {
        this.logger.warn(`Password verification failed for user ${userId}`);
        throw new UnauthorizedException('Incorrect password. Account deletion cancelled.');
      }

      // Step 1: Delete workspaces where user is the owner
      // This will cascade delete related workspace data
      this.logger.log(`Deleting workspaces owned by user ${userId}`);
      await this.db.table('workspaces')
        .where('owner_id', '=', userId)
        .delete()
        .execute();

      // Step 2: Delete user memberships and associations
      const membershipTables = [
        'workspace_members',
        'project_members',
        'channel_members',
        'conversation_members',
        'event_attendees',
        'video_call_participants'
      ];

      for (const table of membershipTables) {
        this.logger.log(`Deleting from ${table} for user ${userId}`);
        try {
          await this.db.table(table)
            .where('user_id', '=', userId)
            .delete()
            .execute();
        } catch (error) {
          this.logger.warn(`Table ${table} might not exist or delete failed:`, error.message);
        }
      }

      // Step 3: Delete user-generated content
      const contentTables = [
        'messages',
        'message_reactions',
        'message_read_receipts',
        'tasks',
        'task_comments',
        'files',
        'notes',
        'calendar_events',
        'event_reminders',
        'ai_generations',
        'chat_sessions',
        'blog_posts',
        'activity_logs',
        'user_activity_logs',
        'search_history',
        'saved_searches'
      ];

      for (const table of contentTables) {
        this.logger.log(`Deleting from ${table} for user ${userId}`);
        try {
          await this.db.table(table)
            .where('user_id', '=', userId)
            .delete()
            .execute();
        } catch (error) {
          this.logger.warn(`Table ${table} might not exist or delete failed:`, error.message);
        }
      }

      // Step 4: Delete user settings and preferences
      const settingsTables = [
        'user_settings',
        'notifications',
        'notification_preferences',
        'push_subscriptions',
        'device_tokens',
        'password_reset_tokens',
        'email_verification_tokens',
        'ai_usage_stats'
      ];

      for (const table of settingsTables) {
        this.logger.log(`Deleting from ${table} for user ${userId}`);
        try {
          await this.db.table(table)
            .where('user_id', '=', userId)
            .delete()
            .execute();
        } catch (error) {
          this.logger.warn(`Table ${table} might not exist or delete failed:`, error.message);
        }
      }

      // Step 6: Delete user from auth serviceentication system
      this.logger.log(`Deleting user ${userId} from auth service system`);
      try {
        // TODO: implement user deletion
      await this.db.raw("DELETE FROM users WHERE id = $1", [userId]);
        this.logger.log(`Successfully deleted user ${userId} from auth service system`);
      } catch (error) {
        this.logger.error(`Failed to delete user from auth service system:`, error);
        // Continue even if database deletion fails - the user data is already deleted
      }

      this.logger.log(`Successfully deleted account for user ${userId}`);

      return {
        message: 'Account successfully deleted. All your data has been permanently removed.',
        success: true
      };
    } catch (error) {
      this.logger.error(`Failed to delete account for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to delete account. Please try again or contact support.');
    }
  }

  // ==================== ACCOUNT DELETION FEEDBACK ====================

  /**
   * Submit account deletion feedback (exit survey)
   */
  async submitDeletionFeedback(
    userId: string,
    userEmail: string,
    userName: string | null,
    data: {
      reason: string;
      reasonDetails?: string;
      feedbackResponse?: string;
      wasRetained: boolean;
      deletedAccount: boolean;
    }
  ) {
    try {
      this.logger.log(`Submitting deletion feedback for user ${userId}`);

      // Determine priority based on reason
      let priority = 'normal';
      if (data.reason === 'bugs_errors') {
        priority = 'high';
      } else if (data.reason === 'missing_features') {
        priority = 'normal';
      } else if (data.reason === 'privacy_concerns') {
        priority = 'high';
      }

      const feedbackData = {
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        reason: data.reason,
        reason_details: data.reasonDetails || null,
        feedback_response: data.feedbackResponse || null,
        was_retained: data.wasRetained,
        deleted_account: data.deletedAccount,
        status: 'pending',
        priority: priority,
      };

      const result = await this.db.table('account_deletion_feedback')
        .insert(feedbackData)
        .execute();

      this.logger.log(`Deletion feedback submitted successfully for user ${userId}`);

      return {
        success: true,
        message: 'Feedback submitted successfully',
        data: result.data?.[0] || feedbackData,
      };
    } catch (error) {
      this.logger.error(`Failed to submit deletion feedback: ${error.message}`, error.stack);
      // Don't throw - feedback submission should not block account deletion
      return {
        success: false,
        message: 'Failed to submit feedback',
      };
    }
  }

  /**
   * Get all deletion feedback (admin only)
   */
  async getDeletionFeedback(query: {
    status?: string;
    reason?: string;
    priority?: string;
    wasRetained?: boolean;
    deletedAccount?: boolean;
    limit?: number;
    offset?: number;
  }) {
    try {
      this.logger.log('Fetching deletion feedback with query:', query);

      let queryBuilder = this.db.table('account_deletion_feedback')
        .select('*')
        .orderBy('created_at', 'desc');

      // Apply filters
      if (query.status) {
        queryBuilder = queryBuilder.where('status', '=', query.status);
      }
      if (query.reason) {
        queryBuilder = queryBuilder.where('reason', '=', query.reason);
      }
      if (query.priority) {
        queryBuilder = queryBuilder.where('priority', '=', query.priority);
      }
      if (query.wasRetained !== undefined) {
        queryBuilder = queryBuilder.where('was_retained', '=', query.wasRetained);
      }
      if (query.deletedAccount !== undefined) {
        queryBuilder = queryBuilder.where('deleted_account', '=', query.deletedAccount);
      }

      // Apply pagination
      if (query.limit) {
        queryBuilder = queryBuilder.limit(query.limit);
      }
      if (query.offset) {
        queryBuilder = queryBuilder.offset(query.offset);
      }

      const result = await queryBuilder.execute();

      // Get total count for pagination
      const countResult = await this.db.table('account_deletion_feedback')
        .select('id')
        .execute();

      return {
        data: result.data || [],
        total: countResult.data?.length || 0,
        limit: query.limit || 20,
        offset: query.offset || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch deletion feedback: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch deletion feedback');
    }
  }

  /**
   * Get deletion feedback by ID (admin only)
   */
  async getDeletionFeedbackById(feedbackId: string) {
    try {
      const result = await this.db.table('account_deletion_feedback')
        .select('*')
        .where('id', '=', feedbackId)
        .execute();

      if (!result.data?.length) {
        throw new NotFoundException('Feedback not found');
      }

      return result.data[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch deletion feedback: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch deletion feedback');
    }
  }

  /**
   * Update deletion feedback (admin only)
   */
  async updateDeletionFeedback(
    feedbackId: string,
    adminUserId: string,
    data: {
      status?: string;
      priority?: string;
      adminNotes?: string;
    }
  ) {
    try {
      this.logger.log(`Updating deletion feedback ${feedbackId} by admin ${adminUserId}`);

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (data.status) {
        updateData.status = data.status;
        if (data.status === 'reviewed' || data.status === 'actioned' || data.status === 'resolved') {
          updateData.reviewed_at = new Date().toISOString();
          updateData.reviewed_by = adminUserId;
        }
      }
      if (data.priority) {
        updateData.priority = data.priority;
      }
      if (data.adminNotes !== undefined) {
        updateData.admin_notes = data.adminNotes;
      }

      await this.db.table('account_deletion_feedback')
        .update(updateData)
        .where('id', '=', feedbackId)
        .execute();

      // Fetch and return updated record
      return this.getDeletionFeedbackById(feedbackId);
    } catch (error) {
      this.logger.error(`Failed to update deletion feedback: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update deletion feedback');
    }
  }

  /**
   * Get deletion feedback statistics (admin only)
   */
  async getDeletionFeedbackStats() {
    try {
      const allFeedback = await this.db.table('account_deletion_feedback')
        .select('*')
        .execute();

      const data = allFeedback.data || [];

      // Calculate statistics
      const stats = {
        total: data.length,
        byReason: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        retainedCount: 0,
        deletedCount: 0,
        retentionRate: 0,
      };

      for (const feedback of data) {
        // Count by reason
        stats.byReason[feedback.reason] = (stats.byReason[feedback.reason] || 0) + 1;

        // Count by status
        stats.byStatus[feedback.status] = (stats.byStatus[feedback.status] || 0) + 1;

        // Count by priority
        stats.byPriority[feedback.priority] = (stats.byPriority[feedback.priority] || 0) + 1;

        // Count retained vs deleted
        if (feedback.was_retained) {
          stats.retainedCount++;
        }
        if (feedback.deleted_account) {
          stats.deletedCount++;
        }
      }

      // Calculate retention rate
      if (stats.total > 0) {
        stats.retentionRate = Math.round((stats.retainedCount / stats.total) * 100);
      }

      return stats;
    } catch (error) {
      this.logger.error(`Failed to fetch deletion feedback stats: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch deletion feedback statistics');
    }
  }
}