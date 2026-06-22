import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
export declare class ProjectsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private ensureProjectRole;
    private hasElevatedRole;
    private hasProjectRole;
    private findProjectOrThrow;
    create(dto: CreateProjectDto, userId: number): Promise<{
        name: string;
        description: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        startDate: Date | null;
        endDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        ownerId: number;
    }>;
    findAll(userId: number): Promise<({
        owner: {
            id: number;
            fullName: string;
            email: string;
        };
        _count: {
            members: number;
            checklists: number;
        };
    } & {
        name: string;
        description: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        startDate: Date | null;
        endDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        ownerId: number;
    })[]>;
    findOne(projectId: number, userId: number): Promise<({
        owner: {
            id: number;
            fullName: string;
            email: string;
            avatarUrl: string | null;
        };
        _count: {
            members: number;
            checklists: number;
        };
    } & {
        name: string;
        description: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        startDate: Date | null;
        endDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        ownerId: number;
    }) | null>;
    update(projectId: number, dto: UpdateProjectDto, userId: number): Promise<{
        name: string;
        description: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        startDate: Date | null;
        endDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        ownerId: number;
    }>;
    archive(projectId: number, userId: number): Promise<{
        name: string;
        description: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        startDate: Date | null;
        endDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        ownerId: number;
    }>;
    complete(projectId: number, userId: number): Promise<{
        name: string;
        description: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        startDate: Date | null;
        endDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        ownerId: number;
    }>;
    remove(projectId: number, userId: number): Promise<{
        name: string;
        description: string | null;
        status: import(".prisma/client").$Enums.ProjectStatus;
        startDate: Date | null;
        endDate: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        ownerId: number;
    }>;
}
