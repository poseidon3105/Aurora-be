import { ChecklistsService } from './checklists.service';
import { AuthenticatedUser } from './decorators/current-user.decorator';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { ChangeChecklistStatusDto } from './dto/change-checklist-status.dto';
export declare class ChecklistsController {
    private readonly checklistsService;
    constructor(checklistsService: ChecklistsService);
    create(projectId: number, dto: CreateChecklistDto, user: AuthenticatedUser): Promise<{
        title: string;
        description: string | null;
        dueDate: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        deletedAt: Date | null;
        id: number;
        projectId: number;
        createdById: number;
    }>;
    findAll(projectId: number, user: AuthenticatedUser): Promise<{
        title: string;
        description: string | null;
        dueDate: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        deletedAt: Date | null;
        id: number;
        projectId: number;
        createdById: number;
    }[]>;
    findOne(checklistId: number, user: AuthenticatedUser): Promise<{
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
    update(checklistId: number, dto: UpdateChecklistDto, user: AuthenticatedUser): Promise<{
        title: string;
        description: string | null;
        dueDate: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        deletedAt: Date | null;
        id: number;
        projectId: number;
        createdById: number;
    }>;
    changeStatus(checklistId: number, dto: ChangeChecklistStatusDto, user: AuthenticatedUser): Promise<{
        title: string;
        description: string | null;
        dueDate: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        deletedAt: Date | null;
        id: number;
        projectId: number;
        createdById: number;
    }>;
    remove(checklistId: number, user: AuthenticatedUser): Promise<{
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
