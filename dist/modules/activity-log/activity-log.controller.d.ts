import { ActivityLogService } from './activity-log.service';
import { AuthenticatedUser } from './decorators/current-user.decorator';
export declare class ActivityLogController {
    private readonly activityLogService;
    constructor(activityLogService: ActivityLogService);
    findMyActivities(user: AuthenticatedUser, page?: number, limit?: number): Promise<{
        data: {
            action: string | null;
            entityType: string | null;
            entityId: number | null;
            oldValue: string | null;
            newValue: string | null;
            createdAt: Date;
            id: number;
            userId: number;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findProjectActivities(projectId: number, user: AuthenticatedUser, page?: number, limit?: number): Promise<{
        data: {
            action: string | null;
            entityType: string | null;
            entityId: number | null;
            oldValue: string | null;
            newValue: string | null;
            createdAt: Date;
            id: number;
            userId: number;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findTaskActivities(taskId: number, user: AuthenticatedUser, page?: number, limit?: number): Promise<{
        data: {
            action: string | null;
            entityType: string | null;
            entityId: number | null;
            oldValue: string | null;
            newValue: string | null;
            createdAt: Date;
            id: number;
            userId: number;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
