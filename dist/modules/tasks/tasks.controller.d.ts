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
        description: string | null;
        title: string;
        dueDate: Date | null;
        orderIndex: number | null;
        completedAt: Date | null;
        deletedAt: Date | null;
        id: number;
        checklistId: number;
        assigneeId: number | null;
        statusId: number;
    }[]>;
    findOne(taskId: number, user: AuthenticatedUser): Promise<{
        tags: {
            name: string | null;
            id: number;
            color: string | null;
        }[];
        status: {
            name: string | null;
            id: number;
            color: string | null;
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
        _count: {
            comments: number;
            attachments: number;
        };
        description: string | null;
        title: string;
        dueDate: Date | null;
        orderIndex: number | null;
        completedAt: Date | null;
        deletedAt: Date | null;
        id: number;
        checklistId: number;
        assigneeId: number | null;
        statusId: number;
    }>;
    update(taskId: number, dto: UpdateTaskDto, user: AuthenticatedUser): Promise<{
        description: string | null;
        title: string;
        dueDate: Date | null;
        orderIndex: number | null;
        completedAt: Date | null;
        deletedAt: Date | null;
        id: number;
        checklistId: number;
        assigneeId: number | null;
        statusId: number;
    }>;
    assign(taskId: number, dto: AssignTaskDto, user: AuthenticatedUser): Promise<{
        description: string | null;
        title: string;
        dueDate: Date | null;
        orderIndex: number | null;
        completedAt: Date | null;
        deletedAt: Date | null;
        id: number;
        checklistId: number;
        assigneeId: number | null;
        statusId: number;
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
