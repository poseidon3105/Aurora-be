import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
export declare class ProjectsService {
    private readonly prisma;
    private readonly configService;
    private readonly redisService;
    private readonly mailService;
    constructor(prisma: PrismaService, configService: ConfigService, redisService: RedisService, mailService: MailService);
    private ensureProjectRole;
    private hasElevatedRole;
    private hasProjectRole;
    private findProjectOrThrow;
    private validateProjectActive;
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
    inviteMember(projectId: number, dto: InviteMemberDto, userId: number): Promise<{
        message: string;
    }>;
    acceptInvitation(dto: AcceptInviteDto, authUser: {
        id: number;
        email: string;
    }): Promise<{
        message: string;
    }>;
    getMembers(projectId: number, userId: number): Promise<{
        id: number;
        userId: number;
        fullName: string;
        email: string;
        role: string;
        joinedAt: Date;
    }[]>;
    getMemberDetail(projectId: number, memberId: number, userId: number): Promise<{
        id: number;
        userId: number;
        fullName: string;
        email: string;
        avatarUrl: string | null;
        role: string;
        roleId: number;
        joinedAt: Date;
    }>;
    updateMemberRole(projectId: number, memberId: number, dto: UpdateMemberRoleDto, userId: number): Promise<{
        message: string;
    }>;
    removeMember(projectId: number, memberId: number, userId: number): Promise<{
        message: string;
    }>;
    leaveProject(projectId: number, userId: number): Promise<{
        message: string;
    }>;
}
