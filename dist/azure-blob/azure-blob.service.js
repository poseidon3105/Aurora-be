"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AzureBlobService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureBlobService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const storage_blob_1 = require("@azure/storage-blob");
let AzureBlobService = AzureBlobService_1 = class AzureBlobService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(AzureBlobService_1.name);
        const connectionString = this.configService.get('azure.storageConnectionString', '');
        const containerName = this.configService.get('azure.container', 'attachments');
        if (!connectionString) {
            this.isConfigured = false;
            this.logger.warn('Azure Blob Storage is not configured. AZURE_STORAGE_CONNECTION_STRING is missing.');
            this.containerClient = null;
            return;
        }
        this.isConfigured = true;
        const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(connectionString);
        this.containerClient =
            blobServiceClient.getContainerClient(containerName);
    }
    async upload(blobName, buffer, mimeType) {
        if (!this.isConfigured) {
            throw new Error('Azure Blob Storage is not configured');
        }
        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.uploadData(buffer, {
            blobHTTPHeaders: {
                blobContentType: mimeType,
            },
        });
        return blockBlobClient.url;
    }
    async delete(blobUrl) {
        if (!this.isConfigured) {
            throw new Error('Azure Blob Storage is not configured');
        }
        const urlParts = blobUrl.split('/');
        const blobName = decodeURIComponent(urlParts[urlParts.length - 1]);
        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.deleteIfExists();
    }
};
exports.AzureBlobService = AzureBlobService;
exports.AzureBlobService = AzureBlobService = AzureBlobService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AzureBlobService);
//# sourceMappingURL=azure-blob.service.js.map