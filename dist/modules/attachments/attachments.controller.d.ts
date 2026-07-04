import { ConfigService } from '@nestjs/config';
import { AttachmentsService } from './attachments.service';
import { AuthenticatedUser } from './decorators/current-user.decorator';
export declare class AttachmentsController {
    private readonly attachmentsService;
    private readonly configService;
    private readonly maxFileSize;
    constructor(attachmentsService: AttachmentsService, configService: ConfigService);
    upload(taskId: number, file: Express.Multer.File, user: AuthenticatedUser): Promise<{
        id: number;
        fileName: string | null;
        fileUrl: string | null;
    }>;
    findAll(taskId: number, user: AuthenticatedUser): Promise<{
        id: number;
        fileName: string | null;
        uploadedBy: {
            id: number;
            fullName: string;
        };
        createdAt: Date;
    }[]>;
    download(attachmentId: number, user: AuthenticatedUser): Promise<{
        fileUrl: string | null;
        fileName: string | null;
    }>;
    remove(attachmentId: number, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
}
