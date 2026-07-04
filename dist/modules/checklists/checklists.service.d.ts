import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { ChangeChecklistStatusDto } from './dto/change-checklist-status.dto';
export declare class ChecklistsService {
    private readonly prisma;
    private readonly activityLogService;
    constructor(prisma: PrismaService, activityLogService: ActivityLogService);
    private findChecklistOrThrow;
    private isProjectMember;
    private hasProjectRole;
    create(projectId: number, dto: CreateChecklistDto, userId: number): Promise<{
        id: number;
        projectId: number;
        createdById: number;
        deletedAt: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        title: string;
        description: string | null;
        dueDate: Date | null;
    }>;
    findAll(projectId: number, userId: number): Promise<{
        id: number;
        projectId: number;
        createdById: number;
        deletedAt: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        title: string;
        description: string | null;
        dueDate: Date | null;
    }[]>;
    findOne(checklistId: number, userId: number): Promise<{
        taskCount: number;
        completedTaskCount: number;
        id: number;
        projectId: number;
        createdById: number;
        deletedAt: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        title: string;
        description: string | null;
        dueDate: Date | null;
    }>;
    update(checklistId: number, dto: UpdateChecklistDto, userId: number): Promise<{
        id: number;
        projectId: number;
        createdById: number;
        deletedAt: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        title: string;
        description: string | null;
        dueDate: Date | null;
    }>;
    changeStatus(checklistId: number, dto: ChangeChecklistStatusDto, userId: number): Promise<{
        id: number;
        projectId: number;
        createdById: number;
        deletedAt: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        title: string;
        description: string | null;
        dueDate: Date | null;
    }>;
    remove(checklistId: number, userId: number): Promise<{
        id: number;
        projectId: number;
        createdById: number;
        deletedAt: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        title: string;
        description: string | null;
        dueDate: Date | null;
    }>;
}
