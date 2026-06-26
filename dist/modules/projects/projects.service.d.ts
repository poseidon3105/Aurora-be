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
    findAll(userId: number): Promise<({
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
    findOne(projectId: number, userId: number): Promise<({
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
    update(projectId: number, dto: UpdateProjectDto, userId: number): Promise<{
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
    archive(projectId: number, userId: number): Promise<{
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
    complete(projectId: number, userId: number): Promise<{
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
    remove(projectId: number, userId: number): Promise<{
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
