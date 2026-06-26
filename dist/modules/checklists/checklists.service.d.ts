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
        deletedAt: Date | null;
        id: number;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        projectId: number;
        description: string | null;
        createdById: number;
        title: string;
        dueDate: Date | null;
    }>;
    findAll(projectId: number, userId: number): Promise<{
        deletedAt: Date | null;
        id: number;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        projectId: number;
        description: string | null;
        createdById: number;
        title: string;
        dueDate: Date | null;
    }[]>;
    findOne(checklistId: number, userId: number): Promise<{
        taskCount: number;
        completedTaskCount: number;
        deletedAt: Date | null;
        id: number;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        projectId: number;
        description: string | null;
        createdById: number;
        title: string;
        dueDate: Date | null;
    }>;
    update(checklistId: number, dto: UpdateChecklistDto, userId: number): Promise<{
        deletedAt: Date | null;
        id: number;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        projectId: number;
        description: string | null;
        createdById: number;
        title: string;
        dueDate: Date | null;
    }>;
    changeStatus(checklistId: number, dto: ChangeChecklistStatusDto, userId: number): Promise<{
        deletedAt: Date | null;
        id: number;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        projectId: number;
        description: string | null;
        createdById: number;
        title: string;
        dueDate: Date | null;
    }>;
    remove(checklistId: number, userId: number): Promise<{
        deletedAt: Date | null;
        id: number;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        projectId: number;
        description: string | null;
        createdById: number;
        title: string;
        dueDate: Date | null;
    }>;
}
