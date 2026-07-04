import { PrismaService } from '../../prisma/prisma.service';
export declare class NotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private findNotificationOrThrow;
    create(userId: number, title: string, content: string): Promise<{
        title: string | null;
        content: string | null;
        isRead: boolean;
        createdAt: Date;
        id: number;
    }>;
    findAll(userId: number, options: {
        page?: number;
        limit?: number;
        isRead?: boolean;
    }): Promise<{
        data: {
            title: string | null;
            content: string | null;
            isRead: boolean;
            createdAt: Date;
            id: number;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getUnreadCount(userId: number): Promise<{
        count: number;
    }>;
    markAsRead(notificationId: number, userId: number): Promise<{
        message: string;
    }>;
    markAllAsRead(userId: number): Promise<{
        message: string;
    }>;
    remove(notificationId: number, userId: number): Promise<{
        message: string;
    }>;
}
