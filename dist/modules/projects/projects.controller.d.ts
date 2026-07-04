import { ProjectsService } from './projects.service';
import { AuthenticatedUser } from './decorators/current-user.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    create(dto: CreateProjectDto, user: AuthenticatedUser): Promise<{
        name: string;
        description: string | null;
        id: number;
        status: import(".prisma/client").$Enums.ProjectStatus;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        startDate: Date | null;
        endDate: Date | null;
        ownerId: number;
    }>;
    findAll(user: AuthenticatedUser): Promise<({
        _count: {
            members: number;
            checklists: number;
        };
        owner: {
            email: string;
            fullName: string;
            id: number;
        };
    } & {
        name: string;
        description: string | null;
        id: number;
        status: import(".prisma/client").$Enums.ProjectStatus;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        startDate: Date | null;
        endDate: Date | null;
        ownerId: number;
    })[]>;
    findOne(projectId: number, user: AuthenticatedUser): Promise<({
        _count: {
            members: number;
            checklists: number;
        };
        owner: {
            email: string;
            fullName: string;
            id: number;
            avatarUrl: string | null;
        };
    } & {
        name: string;
        description: string | null;
        id: number;
        status: import(".prisma/client").$Enums.ProjectStatus;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        startDate: Date | null;
        endDate: Date | null;
        ownerId: number;
    }) | null>;
    update(projectId: number, dto: UpdateProjectDto, user: AuthenticatedUser): Promise<{
        name: string;
        description: string | null;
        id: number;
        status: import(".prisma/client").$Enums.ProjectStatus;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        startDate: Date | null;
        endDate: Date | null;
        ownerId: number;
    }>;
    archive(projectId: number, user: AuthenticatedUser): Promise<{
        name: string;
        description: string | null;
        id: number;
        status: import(".prisma/client").$Enums.ProjectStatus;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        startDate: Date | null;
        endDate: Date | null;
        ownerId: number;
    }>;
    complete(projectId: number, user: AuthenticatedUser): Promise<{
        name: string;
        description: string | null;
        id: number;
        status: import(".prisma/client").$Enums.ProjectStatus;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        startDate: Date | null;
        endDate: Date | null;
        ownerId: number;
    }>;
    remove(projectId: number, user: AuthenticatedUser): Promise<{
        name: string;
        description: string | null;
        id: number;
        status: import(".prisma/client").$Enums.ProjectStatus;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        startDate: Date | null;
        endDate: Date | null;
        ownerId: number;
    }>;
}
