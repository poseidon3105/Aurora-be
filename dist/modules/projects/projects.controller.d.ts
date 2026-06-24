import { ProjectsService } from './projects.service';
import { AuthenticatedUser } from './decorators/current-user.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    create(dto: CreateProjectDto, user: AuthenticatedUser): Promise<{
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
    findAll(user: AuthenticatedUser): Promise<({
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
    findOne(projectId: number, user: AuthenticatedUser): Promise<({
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
    update(projectId: number, dto: UpdateProjectDto, user: AuthenticatedUser): Promise<{
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
    archive(projectId: number, user: AuthenticatedUser): Promise<{
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
    complete(projectId: number, user: AuthenticatedUser): Promise<{
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
    remove(projectId: number, user: AuthenticatedUser): Promise<{
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
    inviteMember(projectId: number, dto: InviteMemberDto, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    acceptInvitation(dto: AcceptInviteDto, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    getMembers(projectId: number, user: AuthenticatedUser): Promise<{
        id: number;
        userId: number;
        fullName: string;
        email: string;
        role: string;
        joinedAt: Date;
    }[]>;
    getMemberDetail(projectId: number, memberId: number, user: AuthenticatedUser): Promise<{
        id: number;
        userId: number;
        fullName: string;
        email: string;
        avatarUrl: string | null;
        role: string;
        roleId: number;
        joinedAt: Date;
    }>;
    updateMemberRole(projectId: number, memberId: number, dto: UpdateMemberRoleDto, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    removeMember(projectId: number, memberId: number, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
    leaveProject(projectId: number, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
}
