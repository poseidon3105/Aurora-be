"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const azure_blob_service_1 = require("../../azure-blob/azure-blob.service");
const notifications_service_1 = require("../notifications/notifications.service");
const activity_log_service_1 = require("../activity-log/activity-log.service");
const file_validation_util_1 = require("./file-validation.util");
const crypto = __importStar(require("crypto"));
let AttachmentsService = class AttachmentsService {
    constructor(prisma, azureBlobService, configService, notificationsService, activityLogService) {
        this.prisma = prisma;
        this.azureBlobService = azureBlobService;
        this.configService = configService;
        this.notificationsService = notificationsService;
        this.activityLogService = activityLogService;
        this.maxFileSize = this.configService.get('upload.maxFileSize', 20971520);
    }
    async isProjectMember(projectId, userId) {
        const member = await this.prisma.projectMember.findFirst({
            where: { projectId, userId, status: 'ACTIVE' },
        });
        return !!member;
    }
    async hasProjectRole(projectId, userId, roleName) {
        const role = await this.prisma.projectRole.findUnique({ where: { name: roleName } });
        if (!role)
            return false;
        const membership = await this.prisma.projectMember.findFirst({
            where: { projectId, userId, roleId: role.id, status: 'ACTIVE' },
        });
        return !!membership;
    }
    async findTaskWithProjectOrThrow(taskId) {
        const task = await this.prisma.checklistItem.findUnique({
            where: { id: taskId },
            include: { checklist: { select: { projectId: true } } },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        if (task.deletedAt) {
            throw new common_1.BadRequestException('Cannot attach files to a deleted task');
        }
        return task;
    }
    async findAttachmentWithProjectOrThrow(attachmentId) {
        const attachment = await this.prisma.taskAttachment.findUnique({
            where: { id: attachmentId },
            include: {
                task: {
                    include: {
                        checklist: { select: { projectId: true } },
                    },
                },
            },
        });
        if (!attachment) {
            throw new common_1.NotFoundException('Attachment not found');
        }
        return attachment;
    }
    async notifyTaskParticipants(taskId, uploaderId, taskTitle) {
        const task = await this.prisma.checklistItem.findUnique({
            where: { id: taskId },
            select: { assigneeId: true },
        });
        if (!task)
            return;
        const participantIds = new Set();
        if (task.assigneeId && task.assigneeId !== uploaderId) {
            participantIds.add(task.assigneeId);
        }
        const commenters = await this.prisma.taskComment.findMany({
            where: {
                taskId,
                deletedAt: null,
                userId: { not: uploaderId },
            },
            select: { userId: true },
        });
        commenters.forEach((c) => participantIds.add(c.userId));
        if (participantIds.size === 0)
            return;
        const content = `A new file has been uploaded to task "${taskTitle}".`;
        for (const participantId of participantIds) {
            await this.notificationsService.create(participantId, 'New Attachment', content).catch(() => { });
        }
    }
    async upload(taskId, file, userId) {
        const task = await this.findTaskWithProjectOrThrow(taskId);
        const projectId = task.checklist.projectId;
        const isMember = await this.isProjectMember(projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        if (file.size > this.maxFileSize) {
            const maxMB = Math.round(this.maxFileSize / (1024 * 1024));
            throw new common_1.BadRequestException(`File size must not exceed ${maxMB} MB`);
        }
        const normalizedFileName = (0, file_validation_util_1.normalizeFileName)(file.originalname);
        (0, file_validation_util_1.validateFile)(normalizedFileName, file.mimetype);
        const extension = normalizedFileName.split('.').pop()?.toLowerCase() || '';
        const blobName = `${crypto.randomUUID()}.${extension}`;
        const fileUrl = await this.azureBlobService.upload(blobName, file.buffer, file.mimetype);
        const attachment = await this.prisma.taskAttachment.create({
            data: {
                taskId,
                uploadedById: userId,
                fileName: normalizedFileName,
                fileUrl,
            },
        });
        await this.notifyTaskParticipants(taskId, userId, task.title);
        await this.activityLogService.create(userId, 'ATTACHMENT_UPLOADED', 'TASK_ATTACHMENT', attachment.id).catch(() => { });
        return {
            id: attachment.id,
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
        };
    }
    async findAll(taskId, userId) {
        const task = await this.findTaskWithProjectOrThrow(taskId);
        const projectId = task.checklist.projectId;
        const isMember = await this.isProjectMember(projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const attachments = await this.prisma.taskAttachment.findMany({
            where: { taskId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: {
                uploadedBy: {
                    select: { id: true, fullName: true },
                },
            },
        });
        return attachments.map((attachment) => ({
            id: attachment.id,
            fileName: attachment.fileName,
            uploadedBy: {
                id: attachment.uploadedBy.id,
                fullName: attachment.uploadedBy.fullName,
            },
            createdAt: attachment.createdAt,
        }));
    }
    async getDownloadUrl(attachmentId, userId) {
        const attachment = await this.findAttachmentWithProjectOrThrow(attachmentId);
        const projectId = attachment.task.checklist.projectId;
        const isMember = await this.isProjectMember(projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        return {
            fileUrl: attachment.fileUrl,
            fileName: attachment.fileName,
        };
    }
    async remove(attachmentId, userId) {
        const attachment = await this.findAttachmentWithProjectOrThrow(attachmentId);
        const projectId = attachment.task.checklist.projectId;
        const isOwner = attachment.uploadedById === userId;
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        const isAdmin = await this.hasProjectRole(projectId, userId, 'ADMIN');
        const isSuperAdmin = await this.hasProjectRole(projectId, userId, 'SUPER_ADMIN');
        if (!isOwner && !isManager && !isAdmin && !isSuperAdmin) {
            throw new common_1.ForbiddenException('Only the attachment owner, project manager, or admin can delete this attachment');
        }
        await this.prisma.taskAttachment.update({
            where: { id: attachmentId },
            data: { deletedAt: new Date() },
        });
        await this.activityLogService.create(userId, 'ATTACHMENT_DELETED', 'TASK_ATTACHMENT', attachmentId, JSON.stringify({ fileName: attachment.fileName })).catch(() => { });
        if (attachment.fileUrl) {
            await this.azureBlobService.delete(attachment.fileUrl).catch(() => {
            });
        }
        return { message: 'Attachment deleted successfully' };
    }
};
exports.AttachmentsService = AttachmentsService;
exports.AttachmentsService = AttachmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        azure_blob_service_1.AzureBlobService,
        config_1.ConfigService,
        notifications_service_1.NotificationsService,
        activity_log_service_1.ActivityLogService])
], AttachmentsService);
//# sourceMappingURL=attachments.service.js.map