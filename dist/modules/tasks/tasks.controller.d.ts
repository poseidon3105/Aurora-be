import { TasksService } from './tasks.service';
import { AuthenticatedUser } from './decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { ChangeTaskStatusDto } from './dto/change-task-status.dto';
import { ReorderTaskDto } from './dto/reorder-task.dto';
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    create(checklistId: number, dto: CreateTaskDto, user: AuthenticatedUser): Promise<{
        id: number;
        title: string;
        status: string;
    }>;
    findAll(checklistId: number, user: AuthenticatedUser): Promise<{
        deletedAt: Date | null;
        id: number;
        title: string;
        description: string | null;
        dueDate: Date | null;
        checklistId: number;
        assigneeId: number | null;
        statusId: number;
        orderIndex: number | null;
        completedAt: Date | null;
    }[]>;
    findOne(taskId: number, user: AuthenticatedUser): Promise<{
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
        title: string;
        description: string | null;
        dueDate: Date | null;
        checklistId: number;
        assigneeId: number | null;
        statusId: number;
        orderIndex: number | null;
        completedAt: Date | null;
    }>;
    update(taskId: number, dto: UpdateTaskDto, user: AuthenticatedUser): Promise<{
        deletedAt: Date | null;
        id: number;
        title: string;
        description: string | null;
        dueDate: Date | null;
        checklistId: number;
        assigneeId: number | null;
        statusId: number;
        orderIndex: number | null;
        completedAt: Date | null;
    }>;
    assign(taskId: number, dto: AssignTaskDto, user: AuthenticatedUser): Promise<{
        deletedAt: Date | null;
        id: number;
        title: string;
        description: string | null;
        dueDate: Date | null;
        checklistId: number;
        assigneeId: number | null;
        statusId: number;
        orderIndex: number | null;
        completedAt: Date | null;
    }>;
    changeStatus(taskId: number, dto: ChangeTaskStatusDto, user: AuthenticatedUser): Promise<{
        message: string;
        status: string | null;
        completedAt: Date | null;
    }>;
    reorder(dto: ReorderTaskDto, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    remove(taskId: number, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    getTaskSummary(projectId: number, user: AuthenticatedUser): Promise<{
        totalTasks: number;
    }>;
}
