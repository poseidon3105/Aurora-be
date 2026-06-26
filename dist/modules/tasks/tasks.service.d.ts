import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { ChangeTaskStatusDto } from './dto/change-task-status.dto';
import { ReorderTaskDto } from './dto/reorder-task.dto';
export declare class TasksService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
        deletedAt: Date | null;
        id: number;
        description: string | null;
        checklistId: number;
        title: string;
        assigneeId: number | null;
        statusId: number;
        dueDate: Date | null;
        orderIndex: number | null;
        completedAt: Date | null;
    }[]>;
    findOne(taskId: number, userId: number): Promise<{
        tags: {
            id: number;
            name: string | null;
            color: string | null;
        }[];
        status: {
            id: number;
            name: string | null;
            color: string | null;
        };
        _count: {
            attachments: number;
            comments: number;
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
        deletedAt: Date | null;
        id: number;
        description: string | null;
        checklistId: number;
        title: string;
        assigneeId: number | null;
        statusId: number;
        dueDate: Date | null;
        orderIndex: number | null;
        completedAt: Date | null;
    }>;
    update(taskId: number, dto: UpdateTaskDto, userId: number): Promise<{
        deletedAt: Date | null;
        id: number;
        description: string | null;
        checklistId: number;
        title: string;
        assigneeId: number | null;
        statusId: number;
        dueDate: Date | null;
        orderIndex: number | null;
        completedAt: Date | null;
    }>;
    assign(taskId: number, dto: AssignTaskDto, userId: number): Promise<{
        deletedAt: Date | null;
        id: number;
        description: string | null;
        checklistId: number;
        title: string;
        assigneeId: number | null;
        statusId: number;
        dueDate: Date | null;
        orderIndex: number | null;
        completedAt: Date | null;
    }>;
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
