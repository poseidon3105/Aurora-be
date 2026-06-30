import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { ChangeTaskStatusDto } from './dto/change-task-status.dto';
import { ReorderTaskDto } from './dto/reorder-task.dto';
export declare class TasksService {
    private readonly prisma;
    private readonly notificationsService;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
    private findTaskOrThrow;
    private isProjectMember;
    private hasProjectRole;
    private validateAssignee;
    private autoUpdateChecklistStatus;
    create(checklistId: number, dto: CreateTaskDto, userId: number): Promise<{
        id: number;
        title: string;
        status: string;
    }>;
    findAll(checklistId: number, userId: number): Promise<{
        title: string;
        id: number;
        deletedAt: Date | null;
        description: string | null;
        dueDate: Date | null;
        orderIndex: number | null;
        completedAt: Date | null;
        checklistId: number;
        assigneeId: number | null;
        statusId: number;
    }[]>;
    findOne(taskId: number, userId: number): Promise<{
        tags: {
            id: number;
            name: string;
            color: string | null;
        }[];
        status: {
            id: number;
            name: string | null;
            color: string | null;
        };
        _count: {
            comments: number;
            attachments: number;
        };
        checklist: {
            projectId: number;
        };
        assignee: {
            id: number;
            fullName: string;
            email: string;
            avatarUrl: string | null;
        } | null;
        title: string;
        id: number;
        deletedAt: Date | null;
        description: string | null;
        dueDate: Date | null;
        orderIndex: number | null;
        completedAt: Date | null;
        checklistId: number;
        assigneeId: number | null;
        statusId: number;
    }>;
    update(taskId: number, dto: UpdateTaskDto, userId: number): Promise<{
        title: string;
        id: number;
        deletedAt: Date | null;
        description: string | null;
        dueDate: Date | null;
        orderIndex: number | null;
        completedAt: Date | null;
        checklistId: number;
        assigneeId: number | null;
        statusId: number;
    } | null>;
    assign(taskId: number, dto: AssignTaskDto, userId: number): Promise<{
        title: string;
        id: number;
        deletedAt: Date | null;
        description: string | null;
        dueDate: Date | null;
        orderIndex: number | null;
        completedAt: Date | null;
        checklistId: number;
        assigneeId: number | null;
        statusId: number;
    } | null>;
    changeStatus(taskId: number, dto: ChangeTaskStatusDto, userId: number): Promise<{
        message: string;
        status: string | null;
        completedAt: Date | null;
    }>;
    reorder(dto: ReorderTaskDto, userId: number): Promise<{
        message: string;
    }>;
    remove(taskId: number, userId: number): Promise<{
        message: string;
    }>;
    getTaskSummary(projectId: number, userId: number): Promise<{
        totalTasks: number;
    }>;
    private toCamelCaseKey;
}
