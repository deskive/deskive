import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { MulterError } from 'multer';
import { MAX_UPLOAD_SIZE } from '@/constants/upload';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception.code === 'LIMIT_FILE_SIZE') {
      return response.status(413).json({
        statusCode: 413,
        message: 'File too large',
        details: {
          maxBytes: MAX_UPLOAD_SIZE,
          receivedBytes: null, // Multer does not provide this information, so we set it to null
        },
      });
    }

    return response.status(400).json({
      statusCode: 400,
      message: exception.message,
    });
  }
}
