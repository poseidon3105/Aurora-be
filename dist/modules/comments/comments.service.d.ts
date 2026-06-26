import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
export declare class CommentsService {
    private readonly prisma;
    private readonly mailService;
    constructor(prisma: PrismaService, mailService: MailService);
    private isProjectMember;
    private hasProjectRole;
    private findTaskWithProjectOrThrow;
    private findCommentOrThrow;
    private findCommentWithProject;
    private processMentions;
    create(taskId: number, dto: CreateCommentDto, userId: number): Promise<{
        id: number;
        content: string;
    }>;
    findAll(taskId: number, userId: number): Promise<{
        id: number;
        content: string;
        user: {
            id: number;
            fullName: string;
        };
        createdAt: Date;
    }[]>;
    update(commentId: number, dto: UpdateCommentDto, userId: number): Promise<{
        id: number;
        content: string;
    }>;
    remove(commentId: number, userId: number): Promise<{
        message: string;
    }>;
}
