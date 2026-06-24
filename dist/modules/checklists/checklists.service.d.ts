import { PrismaService } from '../../prisma/prisma.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { ChangeChecklistStatusDto } from './dto/change-checklist-status.dto';
export declare class ChecklistsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private findChecklistOrThrow;
    private isProjectMember;
    private hasProjectRole;
    create(projectId: number, dto: CreateChecklistDto, userId: number): Promise<{
        title: string;
        description: string | null;
        dueDate: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        deletedAt: Date | null;
        id: number;
        projectId: number;
        createdById: number;
    }>;
    findAll(projectId: number, userId: number): Promise<{
        title: string;
        description: string | null;
        dueDate: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        deletedAt: Date | null;
        id: number;
        projectId: number;
        createdById: number;
    }[]>;
    findOne(checklistId: number, userId: number): Promise<{
        taskCount: number;
        completedTaskCount: number;
        title: string;
        description: string | null;
        dueDate: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        deletedAt: Date | null;
        id: number;
        projectId: number;
        createdById: number;
    }>;
    update(checklistId: number, dto: UpdateChecklistDto, userId: number): Promise<{
        title: string;
        description: string | null;
        dueDate: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        deletedAt: Date | null;
        id: number;
        projectId: number;
        createdById: number;
    }>;
    changeStatus(checklistId: number, dto: ChangeChecklistStatusDto, userId: number): Promise<{
        title: string;
        description: string | null;
        dueDate: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        deletedAt: Date | null;
        id: number;
        projectId: number;
        createdById: number;
    }>;
    remove(checklistId: number, userId: number): Promise<{
        title: string;
        description: string | null;
        dueDate: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        deletedAt: Date | null;
        id: number;
        projectId: number;
        createdById: number;
    }>;
}
