import { PrismaService } from '../../prisma/prisma.service';
export declare class ActivityLogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: number, action: string, entityType: string, entityId: number, oldValue?: string | null, newValue?: string | null): Promise<{
        action: string | null;
        entityType: string | null;
        entityId: number | null;
        oldValue: string | null;
        newValue: string | null;
        createdAt: Date;
        id: number;
        userId: number;
    }>;
    findMyActivities(userId: number, options: {
        page?: number;
        limit?: number;
    }): Promise<{
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
    findProjectActivities(projectId: number, userId: number, options: {
        page?: number;
        limit?: number;
    }): Promise<{
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
    findTaskActivities(taskId: number, userId: number, options: {
        page?: number;
        limit?: number;
    }): Promise<{
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
    private isProjectMember;
}
