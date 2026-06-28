import { ChecklistsService } from './checklists.service';
import { AuthenticatedUser } from './decorators/current-user.decorator';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { ChangeChecklistStatusDto } from './dto/change-checklist-status.dto';
export declare class ChecklistsController {
    private readonly checklistsService;
    constructor(checklistsService: ChecklistsService);
    create(projectId: number, dto: CreateChecklistDto, user: AuthenticatedUser): Promise<{
        description: string | null;
        title: string;
        id: number;
        deletedAt: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        projectId: number;
        createdById: number;
        dueDate: Date | null;
    }>;
    findAll(projectId: number, user: AuthenticatedUser): Promise<{
        description: string | null;
        title: string;
        id: number;
        deletedAt: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        projectId: number;
        createdById: number;
        dueDate: Date | null;
    }[]>;
    findOne(checklistId: number, user: AuthenticatedUser): Promise<{
        taskCount: number;
        completedTaskCount: number;
        description: string | null;
        title: string;
        id: number;
        deletedAt: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        projectId: number;
        createdById: number;
        dueDate: Date | null;
    }>;
    update(checklistId: number, dto: UpdateChecklistDto, user: AuthenticatedUser): Promise<{
        description: string | null;
        title: string;
        id: number;
        deletedAt: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        projectId: number;
        createdById: number;
        dueDate: Date | null;
    }>;
    changeStatus(checklistId: number, dto: ChangeChecklistStatusDto, user: AuthenticatedUser): Promise<{
        description: string | null;
        title: string;
        id: number;
        deletedAt: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        projectId: number;
        createdById: number;
        dueDate: Date | null;
    }>;
    remove(checklistId: number, user: AuthenticatedUser): Promise<{
        description: string | null;
        title: string;
        id: number;
        deletedAt: Date | null;
        status: import(".prisma/client").$Enums.ChecklistStatus;
        projectId: number;
        createdById: number;
        dueDate: Date | null;
    }>;
}
