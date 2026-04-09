import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private publicUrl: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const accountId = this.configService.get('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('R2_SECRET_ACCESS_KEY');

    if (!accountId || !accessKeyId || !secretAccessKey) {
      this.logger.warn('R2/S3 storage credentials not configured. File operations will fail.');
      return;
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.publicUrl = this.configService.get('R2_PUBLIC_URL', '');
    this.logger.log('Storage service (R2/S3) initialized');
  }

  async uploadFile(
    bucket: string,
    fileBuffer: Buffer,
    path: string,
    options?: { contentType?: string; metadata?: Record<string, string> },
  ): Promise<{ path: string; url: string }> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: fileBuffer,
      ContentType: options?.contentType || 'application/octet-stream',
      Metadata: options?.metadata,
    });

    await this.s3Client.send(command);

    return {
      path,
      url: this.getPublicUrl(bucket, path),
    };
  }

  async downloadFile(bucket: string, path: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: path,
    });

    const response = await this.s3Client.send(command);
    const stream = response.Body as any;

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: path,
    });

    await this.s3Client.send(command);
  }

  getPublicUrl(bucket: string, path: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${path}`;
    }
    return `/${bucket}/${path}`;
  }

  async createSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: path,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async listFiles(bucket: string, prefix?: string): Promise<{ key: string; size: number; lastModified: Date }[]> {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });

    const response = await this.s3Client.send(command);

    return (response.Contents || []).map((obj) => ({
      key: obj.Key || '',
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
    }));
  }
}
