import { ConfigService } from '@nestjs/config';
export declare class AzureBlobService {
    private readonly configService;
    private readonly logger;
    private readonly containerClient;
    private readonly isConfigured;
    constructor(configService: ConfigService);
    upload(blobName: string, buffer: Buffer, mimeType: string): Promise<string>;
    delete(blobUrl: string): Promise<void>;
}
