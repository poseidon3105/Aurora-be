import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlobServiceClient,
  BlockBlobClient,
  ContainerClient,
} from '@azure/storage-blob';

@Injectable()
export class AzureBlobService {
  private readonly logger = new Logger(AzureBlobService.name);
  private readonly containerClient: ContainerClient;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const connectionString = this.configService.get<string>(
      'azure.storageConnectionString',
      '',
    );
    const containerName = this.configService.get<string>(
      'azure.container',
      'attachments',
    );

    if (!connectionString) {
      this.isConfigured = false;
      this.logger.warn(
        'Azure Blob Storage is not configured. AZURE_STORAGE_CONNECTION_STRING is missing.',
      );
      this.containerClient = null as unknown as ContainerClient;
      return;
    }

    this.isConfigured = true;
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient =
      blobServiceClient.getContainerClient(containerName);
  }

  /**
   * Upload a file buffer to Azure Blob Storage.
   * Returns the public URL of the uploaded blob.
   */
  async upload(
    blobName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Azure Blob Storage is not configured');
    }

    const blockBlobClient: BlockBlobClient =
      this.containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
      },
    });

    return blockBlobClient.url;
  }

  /**
   * Delete a blob from Azure Blob Storage by its URL.
   */
  async delete(blobUrl: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Azure Blob Storage is not configured');
    }

    // Extract blob name from URL
    const urlParts = blobUrl.split('/');
    const blobName = decodeURIComponent(urlParts[urlParts.length - 1]);

    const blockBlobClient: BlockBlobClient =
      this.containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.deleteIfExists();
  }
}
