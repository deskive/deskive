/**
 * Azure Blob Storage provider.
 *
 *   STORAGE_PROVIDER=azure
 *   AZURE_STORAGE_CONNECTION_STRING=...
 *   STORAGE_BUCKET=my-container      (Azure calls buckets "containers")
 *
 * The `@azure/storage-blob` package is an OPTIONAL dependency — lazy-loaded
 * inside loadSdk() only when the provider is selected, and declared in
 * optionalDependencies in package.json.
 */
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ListedObject,
  PutOptions,
  PutResult,
  StorageProvider,
  StorageProviderNotConfiguredError,
} from './storage-provider.interface';

export class AzureProvider implements StorageProvider {
  readonly name = 'azure' as const;
  private readonly logger = new Logger('AzureProvider');

  private readonly connectionString: string;
  private readonly publicUrl?: string;

  private sdkLoaded = false;
  private client: any;
  private sdk: any;
  private sharedKeyCredential: any;

  constructor(config: ConfigService) {
    this.connectionString = config.get<string>(
      'AZURE_STORAGE_CONNECTION_STRING',
      '',
    );
    this.publicUrl = config.get<string>('STORAGE_PUBLIC_URL');

    if (this.isAvailable()) {
      this.logger.log('Azure Blob configured');
    } else {
      this.logger.warn(
        'Azure provider selected but AZURE_STORAGE_CONNECTION_STRING missing',
      );
    }
  }

  isAvailable(): boolean {
    return !!this.connectionString;
  }

  private loadSdk() {
    if (this.sdkLoaded) return;
    if (!this.isAvailable()) {
      throw new StorageProviderNotConfiguredError('azure', [
        'AZURE_STORAGE_CONNECTION_STRING',
      ]);
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sdk = require('@azure/storage-blob');
      this.sdk = sdk;
      this.client = sdk.BlobServiceClient.fromConnectionString(
        this.connectionString,
      );
      // Pull the StorageSharedKeyCredential out of the connection
      // string so we can sign SAS tokens below. If the connection
      // string uses a SAS token instead of AccountKey, this stays
      // undefined and getSignedUrl falls back to throwing.
      const accountName = /AccountName=([^;]+)/.exec(this.connectionString)?.[1];
      const accountKey = /AccountKey=([^;]+)/.exec(this.connectionString)?.[1];
      if (accountName && accountKey) {
        this.sharedKeyCredential = new sdk.StorageSharedKeyCredential(
          accountName,
          accountKey,
        );
      }
      this.sdkLoaded = true;
      this.logger.log('@azure/storage-blob loaded');
    } catch (e: any) {
      throw new Error(
        `Azure provider selected but "@azure/storage-blob" is not installed. ` +
          `Run: npm install @azure/storage-blob    Original: ${e.message}`,
      );
    }
  }

  async put(
    bucket: string,
    key: string,
    body: Buffer,
    options?: PutOptions,
  ): Promise<PutResult> {
    this.loadSdk();
    const containerClient = this.client.getContainerClient(bucket);
    await containerClient.createIfNotExists();
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    await blockBlobClient.uploadData(body, {
      blobHTTPHeaders: {
        blobContentType: options?.contentType ?? 'application/octet-stream',
        blobCacheControl: options?.cacheControl,
      },
      metadata: options?.metadata,
    });
    return {
      path: key,
      url: this.getPublicUrl(bucket, key),
      size: body.length,
    };
  }

  async get(bucket: string, key: string): Promise<Buffer> {
    this.loadSdk();
    const blobClient = this.client.getContainerClient(bucket).getBlobClient(key);
    return await blobClient.downloadToBuffer();
  }

  async delete(bucket: string, key: string): Promise<void> {
    this.loadSdk();
    await this.client
      .getContainerClient(bucket)
      .getBlobClient(key)
      .deleteIfExists();
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    this.loadSdk();
    return await this.client
      .getContainerClient(bucket)
      .getBlobClient(key)
      .exists();
  }

  async list(bucket: string, prefix?: string): Promise<ListedObject[]> {
    this.loadSdk();
    const out: ListedObject[] = [];
    const containerClient = this.client.getContainerClient(bucket);
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      out.push({
        key: blob.name,
        size: Number(blob.properties.contentLength) || 0,
        lastModified: blob.properties.lastModified ?? new Date(),
      });
    }
    return out;
  }

  getPublicUrl(bucket: string, key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
    }
    // Best-effort synth from the connection string's account name.
    const accountMatch = /AccountName=([^;]+)/.exec(this.connectionString);
    const account = accountMatch?.[1] ?? 'unknown';
    return `https://${account}.blob.core.windows.net/${bucket}/${key}`;
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    expiresInSeconds: number,
  ): Promise<string> {
    this.loadSdk();

    if (!this.sharedKeyCredential) {
      // The connection string didn't include an AccountKey (could be
      // a SAS-only connection string, or a managed-identity setup).
      // Fail loudly instead of silently returning a public URL.
      throw new Error(
        'AzureProvider.getSignedUrl requires an AccountKey-based ' +
          'AZURE_STORAGE_CONNECTION_STRING so the provider can sign ' +
          'SAS tokens. The supplied connection string does not expose ' +
          'AccountName/AccountKey (likely SAS or managed-identity). ' +
          'Use a full access key connection string for signed URLs.',
      );
    }

    const now = Date.now();
    const expiresOn = new Date(now + expiresInSeconds * 1000);
    // Start 60s in the past to tolerate mild clock skew.
    const startsOn = new Date(now - 60_000);

    const sasOptions = {
      containerName: bucket,
      blobName: key,
      permissions: this.sdk.BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn,
      protocol: this.sdk.SASProtocol.Https,
    };

    const sasToken = this.sdk
      .generateBlobSASQueryParameters(sasOptions, this.sharedKeyCredential)
      .toString();

    const blobUrl = this.client
      .getContainerClient(bucket)
      .getBlobClient(key).url;
    return `${blobUrl}?${sasToken}`;
  }
}
