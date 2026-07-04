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
        id: number;
        status: import(".prisma/client").$Enums.ProjectStatus;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        startDate: Date | null;
        endDate: Date | null;
        ownerId: number;
    }>;
    findAll(userId: number): Promise<({
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
    findOne(projectId: number, userId: number): Promise<({
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
    update(projectId: number, dto: UpdateProjectDto, userId: number): Promise<{
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
    archive(projectId: number, userId: number): Promise<{
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
    complete(projectId: number, userId: number): Promise<{
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
    remove(projectId: number, userId: number): Promise<{
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
