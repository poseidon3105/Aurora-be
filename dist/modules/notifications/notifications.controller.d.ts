import { NotificationsService } from './notifications.service';
import { AuthenticatedUser } from './decorators/current-user.decorator';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(user: AuthenticatedUser, page?: number, limit?: number, isRead?: string): Promise<{
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
    getUnreadCount(user: AuthenticatedUser): Promise<{
        count: number;
    }>;
    markAsRead(notificationId: number, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    markAllAsRead(user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    remove(notificationId: number, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
}
