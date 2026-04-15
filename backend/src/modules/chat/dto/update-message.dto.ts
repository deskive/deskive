import { PartialType } from '@nestjs/swagger';
import { SendMessageDto } from './send-message.dto';

export class UpdateMessageDto extends PartialType(SendMessageDto) {}
