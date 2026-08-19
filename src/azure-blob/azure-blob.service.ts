import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlobServiceClient,
  BlobSASPermissions,
  BlockBlobClient,
  ContainerClient,
} from '@azure/storage-blob';

@Injectable()
export class AzureBlobService implements OnModuleInit {
  private readonly logger = new Logger(AzureBlobService.name);
  private readonly containerClient: ContainerClient;
  private readonly isConfigured: boolean;
  private readonly sasTtlSeconds: number;

  constructor(private readonly configService: ConfigService) {
    const connectionString = this.configService.get<string>(
      'azure.storageConnectionString',
      '',
    );
    const containerName = this.configService.get<string>(
      'azure.container',
      'attachments',
    );
    const configuredSasTtl = this.configService.get<number>(
      'azure.sasTtlSeconds',
      300,
    );
    this.sasTtlSeconds = Number.isFinite(configuredSasTtl)
      ? Math.min(Math.max(configuredSasTtl, 60), 3600)
      : 300;

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

  async onModuleInit(): Promise<void> {
    if (!this.isConfigured) return;

    await this.containerClient.createIfNotExists();

    // Raw blob URLs must never grant access. Preserve existing stored access
    // policies while clearing public container/blob access.
    const { signedIdentifiers } = await this.containerClient.getAccessPolicy();
    await this.containerClient.setAccessPolicy(undefined, signedIdentifiers);
  }

  /**
   * Upload a file buffer to Azure Blob Storage.
   * Returns a canonical URL for server-side persistence only; callers must
   * create a short-lived SAS URL before exposing it to a client.
   */
  async upload(
    blobName: string,
    buffer: Buffer,
    mimeType: string,
    contentDisposition: 'attachment' | 'inline' = 'attachment',
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Azure Blob Storage is not configured');
    }

    const blockBlobClient: BlockBlobClient =
      this.containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
        blobContentDisposition: contentDisposition,
      },
    });

    return blockBlobClient.url;
  }

  /** Generate a short-lived, read-only URL for a blob stored by this service. */
  async getReadSasUrl(
    blobUrl: string,
    downloadFileName?: string | null,
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Azure Blob Storage is not configured');
    }

    const blobName = this.getBlobNameFromUrl(blobUrl);
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    const contentDisposition = this.getDownloadContentDisposition(downloadFileName);

    return blockBlobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse('r'),
      expiresOn: new Date(Date.now() + this.sasTtlSeconds * 1000),
      ...(contentDisposition ? { contentDisposition } : {}),
    });
  }

  private getDownloadContentDisposition(
    downloadFileName?: string | null,
  ): string | undefined {
    if (!downloadFileName) return undefined;

    const safeFileName = downloadFileName
      .replace(/[\r\n\\"]/g, '')
      .trim();
    if (!safeFileName) return undefined;

    const asciiFallback =
      safeFileName
        .normalize('NFKD')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/[\\"]/g, '') || 'download';
    const encodedFileName = encodeURIComponent(safeFileName).replace(
      /['()*]/g,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );

    return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`;
  }
  /**
   * Avatar fields may hold a legacy/external provider URL. Azure-managed URLs
   * are signed; external URLs are left unchanged.
   */
  async getClientReadUrl(blobUrl: string | null): Promise<string | null> {
    if (!blobUrl || !this.isConfigured || !this.isManagedBlobUrl(blobUrl)) {
      return blobUrl;
    }

    return this.getReadSasUrl(blobUrl);
  }

  private isManagedBlobUrl(blobUrl: string): boolean {
    try {
      this.getBlobNameFromUrl(blobUrl);
      return true;
    } catch {
      return false;
    }
  }

  private getBlobNameFromUrl(blobUrl: string): string {
    let blobUrlObject: URL;
    let containerUrlObject: URL;

    try {
      blobUrlObject = new URL(blobUrl);
      containerUrlObject = new URL(this.containerClient.url);
    } catch {
      throw new Error('Invalid Azure Blob URL');
    }

    const containerPath = containerUrlObject.pathname.replace(/\/+$/, '');
    const blobPathPrefix = `${containerPath}/`;
    if (
      blobUrlObject.origin !== containerUrlObject.origin ||
      !blobUrlObject.pathname.startsWith(blobPathPrefix)
    ) {
      throw new Error('Blob URL does not belong to the configured container');
    }

    const blobName = decodeURIComponent(
      blobUrlObject.pathname.slice(blobPathPrefix.length),
    );
    if (!blobName) {
      throw new Error('Blob URL does not include a blob name');
    }

    return blobName;
  }

  /** Delete a blob from Azure Blob Storage by its persisted canonical URL. */
  async delete(blobUrl: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Azure Blob Storage is not configured');
    }

    const blobName = this.getBlobNameFromUrl(blobUrl);
    const blockBlobClient: BlockBlobClient =
      this.containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.deleteIfExists();
  }
}