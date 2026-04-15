import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { MulterError } from 'multer';

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
          maxBytes: Number(process.env.MAX_UPLOAD_SIZE || 10485760), // or from env
          receivedBytes: exception?.fieldSize || null,
        },
      });
    }

    return response.status(400).json({
      statusCode: 400,
      message: exception.message,
    });
  }
}