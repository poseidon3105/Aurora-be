import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AzureBlobService } from '../../azure-blob/azure-blob.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
export declare class AttachmentsService {
    private readonly prisma;
    private readonly azureBlobService;
    private readonly configService;
    private readonly notificationsService;
    private readonly activityLogService;
    private readonly maxFileSize;
    constructor(prisma: PrismaService, azureBlobService: AzureBlobService, configService: ConfigService, notificationsService: NotificationsService, activityLogService: ActivityLogService);
    private isProjectMember;
    private hasProjectRole;
    private findTaskWithProjectOrThrow;
    private findAttachmentWithProjectOrThrow;
    private notifyTaskParticipants;
    upload(taskId: number, file: Express.Multer.File, userId: number): Promise<{
        id: number;
        fileName: string | null;
        fileUrl: string | null;
    }>;
    findAll(taskId: number, userId: number): Promise<{
        id: number;
        fileName: string | null;
        uploadedBy: {
            id: number;
            fullName: string;
        };
        createdAt: Date;
    }[]>;
    getDownloadUrl(attachmentId: number, userId: number): Promise<{
        fileUrl: string | null;
        fileName: string | null;
    }>;
    remove(attachmentId: number, userId: number): Promise<{
        message: string;
    }>;
}
