import { Controller, Post, Get, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CryptoService } from './crypto.service';
import { UploadKeyDto, GetPublicKeysDto, AddConversationKeyDto } from './dto/upload-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Crypto')
@Controller('crypto')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CryptoController {
  constructor(private readonly cryptoService: CryptoService) {}

  @Post('keys')
  @ApiOperation({ summary: 'Upload or update user public key' })
  @ApiResponse({ status: 201, description: 'Public key stored successfully' })
  async uploadPublicKey(@Body() dto: UploadKeyDto) {
    return this.cryptoService.storePublicKey(dto);
  }

  @Post('keys/batch')
  @ApiOperation({ summary: 'Get public keys for multiple users' })
  @ApiResponse({ status: 200, description: 'Returns public keys for requested users' })
  async getPublicKeys(@Body() dto: GetPublicKeysDto) {
    return this.cryptoService.getPublicKeys(dto);
  }

  @Get('keys/:userId')
  @ApiOperation({ summary: 'Get public key for a specific user' })
  @ApiResponse({ status: 200, description: 'Returns user public key' })
  async getUserPublicKey(@Param('userId') userId: string) {
    return this.cryptoService.getPublicKey(userId);
  }

  @Post('conversation-keys')
  @ApiOperation({ summary: 'Add encrypted conversation key for a user' })
  @ApiResponse({ status: 201, description: 'Conversation key added successfully' })
  async addConversationKey(@Body() dto: AddConversationKeyDto) {
    return this.cryptoService.addConversationKey(dto);
  }

  @Get('conversation-keys/:conversationId')
  @ApiOperation({ summary: 'Get encrypted conversation key for current user' })
  @ApiResponse({ status: 200, description: 'Returns encrypted conversation key' })
  async getConversationKey(
    @Param('conversationId') conversationId: string,
    @Request() req
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.cryptoService.getConversationKey(conversationId, userId);
  }

  @Get('devices/:userId')
  @ApiOperation({ summary: 'Get all devices for a user' })
  @ApiResponse({ status: 200, description: 'Returns list of user devices' })
  async getUserDevices(@Param('userId') userId: string) {
    return this.cryptoService.getUserDevices(userId);
  }

  @Post('devices/:deviceId/deactivate')
  @ApiOperation({ summary: 'Deactivate a device' })
  @ApiResponse({ status: 200, description: 'Device deactivated successfully' })
  async deactivateDevice(
    @Param('deviceId') deviceId: string,
    @Request() req
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.cryptoService.deactivateDevice(userId, deviceId);
  }
}
