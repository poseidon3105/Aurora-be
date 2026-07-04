import { TagsService } from './tags.service';
import { AuthenticatedUser } from './decorators/current-user.decorator';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { AssignTagDto } from './dto/assign-tag.dto';
export declare class TagsController {
    private readonly tagsService;
    constructor(tagsService: TagsService);
    create(projectId: number, dto: CreateTagDto, user: AuthenticatedUser): Promise<{
        id: number;
        name: string;
        color: string | null;
    }>;
    findAll(projectId: number, user: AuthenticatedUser): Promise<{
        id: number;
        name: string;
        color: string | null;
    }[]>;
    update(tagId: number, dto: UpdateTagDto, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    remove(tagId: number, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    assignToTask(taskId: number, dto: AssignTagDto, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    removeFromTask(taskId: number, tagId: number, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    getTaskTags(taskId: number, user: AuthenticatedUser): Promise<{
        id: number;
        name: string;
        color: string | null;
    }[]>;
}
