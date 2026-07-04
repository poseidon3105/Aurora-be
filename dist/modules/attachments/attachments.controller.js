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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const attachments_service_1 = require("./attachments.service");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const upload_attachment_response_dto_1 = require("./dto/upload-attachment-response.dto");
let AttachmentsController = class AttachmentsController {
    constructor(attachmentsService, configService) {
        this.attachmentsService = attachmentsService;
        this.configService = configService;
        this.maxFileSize = this.configService.get('upload.maxFileSize', 20971520);
    }
    async upload(taskId, file, user) {
        if (!file) {
            throw new common_1.BadRequestException('File is required');
        }
        return this.attachmentsService.upload(taskId, file, user.id);
    }
    async findAll(taskId, user) {
        return this.attachmentsService.findAll(taskId, user.id);
    }
    async download(attachmentId, user) {
        return this.attachmentsService.getDownloadUrl(attachmentId, user.id);
    }
    async remove(attachmentId, user) {
        return this.attachmentsService.remove(attachmentId, user.id);
    }
};
exports.AttachmentsController = AttachmentsController;
__decorate([
    (0, common_1.Post)('tasks/:taskId/attachments'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: {
            fileSize: Number(process.env.MAX_FILE_SIZE) || 20971520,
        },
    })),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a file attachment to a task' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'File to upload (max 20MB)',
                },
            },
        },
    }),
    (0, swagger_1.ApiParam)({ name: 'taskId', type: Number, description: 'Task ID' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Attachment uploaded successfully',
        type: upload_attachment_response_dto_1.UploadAttachmentResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid file or task deleted' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found' }),
    __param(0, (0, common_1.Param)('taskId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)('tasks/:taskId/attachments'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get all attachments for a task' }),
    (0, swagger_1.ApiParam)({ name: 'taskId', type: Number, description: 'Task ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of attachments returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found' }),
    __param(0, (0, common_1.Param)('taskId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('attachments/:attachmentId/download'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get download URL for an attachment' }),
    (0, swagger_1.ApiParam)({ name: 'attachmentId', type: Number, description: 'Attachment ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Download URL returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Attachment not found' }),
    __param(0, (0, common_1.Param)('attachmentId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "download", null);
__decorate([
    (0, common_1.Delete)('attachments/:attachmentId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Soft delete an attachment (owner, project manager, or admin only)',
    }),
    (0, swagger_1.ApiParam)({ name: 'attachmentId', type: Number, description: 'Attachment ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Attachment deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Attachment not found' }),
    __param(0, (0, common_1.Param)('attachmentId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "remove", null);
exports.AttachmentsController = AttachmentsController = __decorate([
    (0, swagger_1.ApiTags)('Task Attachments'),
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [attachments_service_1.AttachmentsService,
        config_1.ConfigService])
], AttachmentsController);
//# sourceMappingURL=attachments.controller.js.map