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
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        name: string;
        status: import(".prisma/client").$Enums.ProjectStatus;
        description: string | null;
        ownerId: number;
        startDate: Date | null;
        endDate: Date | null;
    }>;
    findAll(user: AuthenticatedUser): Promise<({
        _count: {
            members: number;
            checklists: number;
        };
        owner: {
            id: number;
            fullName: string;
            email: string;
        };
    } & {
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        name: string;
        status: import(".prisma/client").$Enums.ProjectStatus;
        description: string | null;
        ownerId: number;
        startDate: Date | null;
        endDate: Date | null;
    })[]>;
    findOne(projectId: number, user: AuthenticatedUser): Promise<({
        _count: {
            members: number;
            checklists: number;
        };
        owner: {
            id: number;
            fullName: string;
            email: string;
            avatarUrl: string | null;
        };
    } & {
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        name: string;
        status: import(".prisma/client").$Enums.ProjectStatus;
        description: string | null;
        ownerId: number;
        startDate: Date | null;
        endDate: Date | null;
    }) | null>;
    update(projectId: number, dto: UpdateProjectDto, user: AuthenticatedUser): Promise<{
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        name: string;
        status: import(".prisma/client").$Enums.ProjectStatus;
        description: string | null;
        ownerId: number;
        startDate: Date | null;
        endDate: Date | null;
    }>;
    archive(projectId: number, user: AuthenticatedUser): Promise<{
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        name: string;
        status: import(".prisma/client").$Enums.ProjectStatus;
        description: string | null;
        ownerId: number;
        startDate: Date | null;
        endDate: Date | null;
    }>;
    complete(projectId: number, user: AuthenticatedUser): Promise<{
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        name: string;
        status: import(".prisma/client").$Enums.ProjectStatus;
        description: string | null;
        ownerId: number;
        startDate: Date | null;
        endDate: Date | null;
    }>;
    remove(projectId: number, user: AuthenticatedUser): Promise<{
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        id: number;
        name: string;
        status: import(".prisma/client").$Enums.ProjectStatus;
        description: string | null;
        ownerId: number;
        startDate: Date | null;
        endDate: Date | null;
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
