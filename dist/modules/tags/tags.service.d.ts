import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { AssignTagDto } from './dto/assign-tag.dto';
export declare class TagsService {
    private readonly prisma;
    private readonly activityLogService;
    constructor(prisma: PrismaService, activityLogService: ActivityLogService);
    private findProjectOrThrow;
    private findTagOrThrow;
    private findTaskOrThrow;
    private isProjectMember;
    private hasProjectRole;
    private hasElevatedRole;
    private hasManagerOrElevatedRole;
    create(projectId: number, dto: CreateTagDto, userId: number): Promise<{
        id: number;
        name: string;
        color: string | null;
    }>;
    findAll(projectId: number, userId: number): Promise<{
        id: number;
        name: string;
        color: string | null;
    }[]>;
    update(tagId: number, dto: UpdateTagDto, userId: number): Promise<{
        message: string;
    }>;
    remove(tagId: number, userId: number): Promise<{
        message: string;
    }>;
    assignToTask(taskId: number, dto: AssignTagDto, userId: number): Promise<{
        message: string;
    }>;
    removeFromTask(taskId: number, tagId: number, userId: number): Promise<{
        message: string;
    }>;
    getTaskTags(taskId: number, userId: number): Promise<{
        id: number;
        name: string;
        color: string | null;
    }[]>;
}
