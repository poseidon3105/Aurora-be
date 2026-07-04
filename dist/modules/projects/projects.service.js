"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const redis_service_1 = require("../../redis/redis.service");
const mail_service_1 = require("../../mail/mail.service");
const notifications_service_1 = require("../notifications/notifications.service");
const activity_log_service_1 = require("../activity-log/activity-log.service");
const client_1 = require("@prisma/client");
const crypto = __importStar(require("crypto"));
const projects_constants_1 = require("./projects.constants");
let ProjectsService = class ProjectsService {
    constructor(prisma, configService, redisService, mailService, notificationsService, activityLogService) {
        this.prisma = prisma;
        this.configService = configService;
        this.redisService = redisService;
        this.mailService = mailService;
        this.notificationsService = notificationsService;
        this.activityLogService = activityLogService;
    }
    async ensureProjectRole(name) {
        let role = await this.prisma.projectRole.findUnique({ where: { name } });
        if (!role) {
            role = await this.prisma.projectRole.create({ data: { name } });
        }
        return role;
    }
    async hasElevatedRole(userId) {
        const elevatedRoles = ['SUPER_ADMIN', 'ADMIN'];
        const roles = await this.prisma.systemRole.findMany({
            where: { name: { in: elevatedRoles } },
        });
        if (roles.length === 0)
            return false;
        const roleIds = roles.map((r) => r.id);
        const assignment = await this.prisma.userSystemRole.findFirst({
            where: { userId, roleId: { in: roleIds } },
        });
        return !!assignment;
    }
    async hasProjectRole(projectId, userId, roleName) {
        const role = await this.prisma.projectRole.findUnique({ where: { name: roleName } });
        if (!role)
            return false;
        const membership = await this.prisma.projectMember.findFirst({
            where: { projectId, userId, roleId: role.id },
        });
        return !!membership;
    }
    async findProjectOrThrow(projectId) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        return project;
    }
    async validateProjectActive(projectId) {
        const project = await this.findProjectOrThrow(projectId);
        if (project.deletedAt) {
            throw new common_1.BadRequestException('Project has been deleted');
        }
        if (project.status !== client_1.ProjectStatus.ACTIVE) {
            throw new common_1.BadRequestException('Project is not active');
        }
        return project;
    }
    async create(dto, userId) {
        const { name, description, startDate, endDate } = dto;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (startDate && new Date(startDate) < today) {
            throw new common_1.BadRequestException('Start date must be greater than or equal to today\'s date');
        }
        if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
            throw new common_1.BadRequestException('End date must be later than start date');
        }
        const project = await this.prisma.project.create({
            data: {
                name,
                description,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                ownerId: userId,
                status: client_1.ProjectStatus.ACTIVE,
            },
        });
        const managerRole = await this.ensureProjectRole('PROJECT_MANAGER');
        await this.prisma.projectMember.create({
            data: {
                projectId: project.id,
                userId,
                roleId: managerRole.id,
            },
        });
        await this.activityLogService.create(userId, 'PROJECT_CREATED', 'PROJECT', project.id, null, JSON.stringify({ name, description })).catch(() => { });
        return project;
    }
    async findAll(userId) {
        return this.prisma.project.findMany({
            where: {
                deletedAt: null,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            include: {
                owner: {
                    select: { id: true, fullName: true, email: true },
                },
                _count: {
                    select: { members: true, checklists: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(projectId, userId) {
        const project = await this.findProjectOrThrow(projectId);
        const isMember = await this.prisma.projectMember.findFirst({
            where: { projectId, userId },
        });
        const isElevated = await this.hasElevatedRole(userId);
        if (!isMember && !isElevated) {
            throw new common_1.ForbiddenException('You do not have access to this project');
        }
        return this.prisma.project.findUnique({
            where: { id: projectId },
            include: {
                owner: {
                    select: { id: true, fullName: true, email: true, avatarUrl: true },
                },
                _count: {
                    select: { members: true, checklists: true },
                },
            },
        });
    }
    async update(projectId, dto, userId) {
        const project = await this.findProjectOrThrow(projectId);
        if (project.deletedAt) {
            throw new common_1.BadRequestException('Cannot modify a deleted project');
        }
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        const isElevated = await this.hasElevatedRole(userId);
        if (!isManager && !isElevated) {
            throw new common_1.ForbiddenException('Only a project manager, super admin, or admin can update this project');
        }
        const endDate = dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : project.endDate;
        if (project.startDate && endDate && endDate <= project.startDate) {
            throw new common_1.BadRequestException('End date must be later than start date');
        }
        const updated = await this.prisma.project.update({
            where: { id: projectId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
            },
        });
        const oldVal = JSON.stringify({
            name: project.name,
            description: project.description,
        });
        const newVal = JSON.stringify({
            name: dto.name ?? project.name,
            description: dto.description !== undefined ? dto.description : project.description,
        });
        await this.activityLogService.create(userId, 'PROJECT_UPDATED', 'PROJECT', projectId, oldVal, newVal).catch(() => { });
        return updated;
    }
    async archive(projectId, userId) {
        const project = await this.findProjectOrThrow(projectId);
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        if (!isManager) {
            throw new common_1.ForbiddenException('Only a project manager can archive this project');
        }
        if (project.status !== client_1.ProjectStatus.ACTIVE) {
            throw new common_1.ConflictException('Only active projects can be archived');
        }
        const archived = await this.prisma.project.update({
            where: { id: projectId },
            data: { status: client_1.ProjectStatus.ARCHIVED },
        });
        await this.activityLogService.create(userId, 'PROJECT_ARCHIVED', 'PROJECT', projectId).catch(() => { });
        return archived;
    }
    async complete(projectId, userId) {
        const project = await this.findProjectOrThrow(projectId);
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        if (!isManager) {
            throw new common_1.ForbiddenException('Only a project manager can complete this project');
        }
        if (project.status !== client_1.ProjectStatus.ACTIVE) {
            throw new common_1.ConflictException('Only active projects can be completed');
        }
        const completed = await this.prisma.project.update({
            where: { id: projectId },
            data: { status: client_1.ProjectStatus.COMPLETED },
        });
        await this.activityLogService.create(userId, 'PROJECT_COMPLETED', 'PROJECT', projectId).catch(() => { });
        return completed;
    }
    async remove(projectId, userId) {
        const project = await this.findProjectOrThrow(projectId);
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        const isElevated = await this.hasElevatedRole(userId);
        if (!isManager && !isElevated) {
            throw new common_1.ForbiddenException('Only a project manager, super admin, or admin can delete this project');
        }
        const deleted = await this.prisma.project.update({
            where: { id: projectId },
            data: { deletedAt: new Date() },
        });
        await this.activityLogService.create(userId, 'PROJECT_DELETED', 'PROJECT', projectId, JSON.stringify({ name: project.name, status: project.status })).catch(() => { });
        return deleted;
    }
    async inviteMember(projectId, dto, userId) {
        const { email, roleId } = dto;
        const project = await this.validateProjectActive(projectId);
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        if (!isManager) {
            throw new common_1.ForbiddenException('Only a project manager can invite members');
        }
        const role = await this.prisma.projectRole.findUnique({ where: { id: roleId } });
        if (!role) {
            throw new common_1.BadRequestException('Role not found');
        }
        const invitee = await this.prisma.user.findUnique({ where: { email } });
        if (!invitee) {
        }
        if (invitee && invitee.id === project.ownerId) {
            throw new common_1.BadRequestException('Cannot invite the project owner');
        }
        if (invitee) {
            const existingMember = await this.prisma.projectMember.findUnique({
                where: { projectId_userId: { projectId, userId: invitee.id } },
            });
            if (existingMember) {
                if (existingMember.status === client_1.ProjectMemberStatus.ACTIVE) {
                    throw new common_1.ConflictException('User is already a member of this project');
                }
            }
        }
        const token = crypto.randomBytes(16).toString('hex');
        const invitationTtl = Number(this.configService.get('INVITATION_TTL', 604800));
        const inviteData = JSON.stringify({ projectId, email, roleId });
        await this.redisService.set(`${projects_constants_1.PROJECT_REDIS_KEYS.INVITE}${token}`, inviteData, invitationTtl);
        await this.mailService.sendInvitationEmail(email, token);
        return { message: 'Invitation sent successfully' };
    }
    async acceptInvitation(dto, authUser) {
        const { token } = dto;
        const inviteData = await this.redisService.get(`${projects_constants_1.PROJECT_REDIS_KEYS.INVITE}${token}`);
        if (!inviteData) {
            throw new common_1.BadRequestException('Invitation not found or has expired');
        }
        let parsed;
        try {
            parsed = JSON.parse(inviteData);
        }
        catch {
            throw new common_1.BadRequestException('Invalid invitation data');
        }
        const { projectId, email, roleId } = parsed;
        if (authUser.email !== email) {
            throw new common_1.ForbiddenException('This invitation was sent to a different email address');
        }
        const role = await this.prisma.projectRole.findUnique({ where: { id: roleId } });
        if (!role) {
            throw new common_1.BadRequestException('The assigned role no longer exists');
        }
        const project = await this.validateProjectActive(projectId);
        const existingMember = await this.prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId: authUser.id } },
        });
        let memberId;
        if (existingMember) {
            if (existingMember.status === client_1.ProjectMemberStatus.ACTIVE) {
                await this.redisService.del(`${projects_constants_1.PROJECT_REDIS_KEYS.INVITE}${token}`);
                throw new common_1.ConflictException('You are already a member of this project');
            }
            await this.prisma.projectMember.update({
                where: { id: existingMember.id },
                data: {
                    status: client_1.ProjectMemberStatus.ACTIVE,
                    roleId,
                    deletedAt: null,
                    joinedAt: new Date(),
                },
            });
            memberId = existingMember.id;
        }
        else {
            const newMember = await this.prisma.projectMember.create({
                data: {
                    projectId,
                    userId: authUser.id,
                    roleId,
                },
            });
            memberId = newMember.id;
        }
        await this.redisService.del(`${projects_constants_1.PROJECT_REDIS_KEYS.INVITE}${token}`);
        await this.notificationsService.create(authUser.id, 'Added to Project', `You have been added to project "${project.name}".`).catch(() => {
        });
        await this.activityLogService.create(authUser.id, 'MEMBER_ADDED', 'PROJECT_MEMBER', memberId, null, JSON.stringify({ role: role.name })).catch(() => { });
        return { message: 'Joined project successfully' };
    }
    async getMembers(projectId, userId) {
        const project = await this.findProjectOrThrow(projectId);
        const isMember = await this.prisma.projectMember.findFirst({
            where: { projectId, userId, status: client_1.ProjectMemberStatus.ACTIVE },
        });
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const members = await this.prisma.projectMember.findMany({
            where: { projectId, status: client_1.ProjectMemberStatus.ACTIVE },
            include: {
                user: {
                    select: { id: true, fullName: true, email: true },
                },
                role: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { joinedAt: 'asc' },
        });
        return members.map((m) => ({
            id: m.id,
            userId: m.userId,
            fullName: m.user.fullName,
            email: m.user.email,
            role: m.role.name,
            joinedAt: m.joinedAt,
        }));
    }
    async getMemberDetail(projectId, memberId, userId) {
        const project = await this.findProjectOrThrow(projectId);
        const isMember = await this.prisma.projectMember.findFirst({
            where: { projectId, userId, status: client_1.ProjectMemberStatus.ACTIVE },
        });
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const member = await this.prisma.projectMember.findFirst({
            where: { id: memberId, projectId, status: client_1.ProjectMemberStatus.ACTIVE },
            include: {
                user: {
                    select: { id: true, fullName: true, email: true, avatarUrl: true },
                },
                role: {
                    select: { id: true, name: true },
                },
            },
        });
        if (!member) {
            throw new common_1.NotFoundException('Member not found in this project');
        }
        return {
            id: member.id,
            userId: member.userId,
            fullName: member.user.fullName,
            email: member.user.email,
            avatarUrl: member.user.avatarUrl,
            role: member.role.name,
            roleId: member.role.id,
            joinedAt: member.joinedAt,
        };
    }
    async updateMemberRole(projectId, memberId, dto, userId) {
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        if (!isManager) {
            throw new common_1.ForbiddenException('Only a project manager can update member roles');
        }
        const member = await this.prisma.projectMember.findFirst({
            where: { id: memberId, projectId, status: client_1.ProjectMemberStatus.ACTIVE },
            include: { project: { select: { ownerId: true } } },
        });
        if (!member) {
            throw new common_1.NotFoundException('Member not found in this project');
        }
        if (member.userId === member.project.ownerId) {
            throw new common_1.BadRequestException('Cannot change the project owner\'s role');
        }
        const newRole = await this.prisma.projectRole.findUnique({ where: { id: dto.roleId } });
        if (!newRole) {
            throw new common_1.BadRequestException('Role not found');
        }
        if (member.roleId === dto.roleId) {
            throw new common_1.BadRequestException('Member already has this role');
        }
        await this.prisma.projectMember.update({
            where: { id: memberId },
            data: { roleId: dto.roleId },
        });
        const roleChangeProject = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: { name: true },
        });
        await this.notificationsService.create(member.userId, 'Role Changed', `Your role has been changed to ${newRole.name} in project "${roleChangeProject?.name || 'Unknown'}".`).catch(() => {
        });
        await this.activityLogService.create(userId, 'MEMBER_ROLE_UPDATED', 'PROJECT_MEMBER', member.id, JSON.stringify({ role: member.roleId }), JSON.stringify({ role: dto.roleId })).catch(() => { });
        return { message: 'Role updated successfully' };
    }
    async removeMember(projectId, memberId, userId) {
        const project = await this.findProjectOrThrow(projectId);
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        const isElevated = await this.hasElevatedRole(userId);
        if (!isManager && !isElevated) {
            throw new common_1.ForbiddenException('Only a project manager, admin, or super admin can remove members');
        }
        const member = await this.prisma.projectMember.findFirst({
            where: { id: memberId, projectId },
        });
        if (!member) {
            throw new common_1.NotFoundException('Member not found in this project');
        }
        if (member.userId === project.ownerId) {
            throw new common_1.BadRequestException('Cannot remove the project owner');
        }
        if (member.userId === userId) {
            throw new common_1.BadRequestException('You cannot remove yourself. Use the leave endpoint instead');
        }
        const incompleteTaskStatuses = [client_1.ChecklistStatus.OPEN, client_1.ChecklistStatus.IN_PROGRESS];
        const activeTasks = await this.prisma.checklistItem.findFirst({
            where: {
                assigneeId: member.userId,
                checklist: { projectId },
                status: { name: { in: incompleteTaskStatuses } },
            },
        });
        if (activeTasks) {
            throw new common_1.ConflictException('Member has active tasks');
        }
        await this.prisma.projectMember.update({
            where: { id: memberId },
            data: { status: client_1.ProjectMemberStatus.INACTIVE, deletedAt: new Date() },
        });
        await this.activityLogService.create(userId, 'MEMBER_REMOVED', 'PROJECT_MEMBER', member.id, JSON.stringify({ userId: member.userId })).catch(() => { });
        return { message: 'Member removed successfully' };
    }
    async leaveProject(projectId, userId) {
        const project = await this.findProjectOrThrow(projectId);
        const member = await this.prisma.projectMember.findFirst({
            where: { projectId, userId },
        });
        if (!member) {
            throw new common_1.BadRequestException('You are not a member of this project');
        }
        const managerRole = await this.prisma.projectRole.findUnique({ where: { name: 'PROJECT_MANAGER' } });
        if (managerRole && member.roleId === managerRole.id) {
            const managerCount = await this.prisma.projectMember.count({
                where: { projectId, roleId: managerRole.id },
            });
            if (managerCount <= 1) {
                throw new common_1.BadRequestException('Cannot leave the project as the last remaining manager');
            }
        }
        const activeTasks = await this.prisma.checklistItem.findFirst({
            where: {
                assigneeId: userId,
                checklist: { projectId },
                status: { name: { in: [client_1.ChecklistStatus.OPEN, client_1.ChecklistStatus.IN_PROGRESS] } },
            },
        });
        if (activeTasks) {
            throw new common_1.ConflictException('You have active tasks. Please complete or reassign them before leaving');
        }
        await this.prisma.projectMember.update({
            where: { id: member.id },
            data: { status: client_1.ProjectMemberStatus.INACTIVE, deletedAt: new Date() },
        });
        return { message: 'Left project successfully' };
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        redis_service_1.RedisService,
        mail_service_1.MailService,
        notifications_service_1.NotificationsService,
        activity_log_service_1.ActivityLogService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map