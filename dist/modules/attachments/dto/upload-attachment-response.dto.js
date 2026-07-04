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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadAttachmentResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class UploadAttachmentResponseDto {
}
exports.UploadAttachmentResponseDto = UploadAttachmentResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Attachment ID', example: 5 }),
    __metadata("design:type", Number)
], UploadAttachmentResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Original file name', example: 'Design.pdf' }),
    __metadata("design:type", String)
], UploadAttachmentResponseDto.prototype, "fileName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Azure Blob Storage URL',
        example: 'https://<storage-account>.blob.core.windows.net/files/550e8400-e29b-41d4-a716-446655440000.pdf',
    }),
    __metadata("design:type", String)
], UploadAttachmentResponseDto.prototype, "fileUrl", void 0);
//# sourceMappingURL=upload-attachment-response.dto.js.map