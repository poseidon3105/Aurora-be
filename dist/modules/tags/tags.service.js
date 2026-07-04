"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const activity_log_service_1 = require("../activity-log/activity-log.service");
const client_1 = require("@prisma/client");
let TagsService = class TagsService {
    constructor(prisma, activityLogService) {
        this.prisma = prisma;
        this.activityLogService = activityLogService;
    }
    async findProjectOrThrow(projectId) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        return project;
    }
    async findTagOrThrow(tagId) {
        const tag = await this.prisma.tag.findUnique({
            where: { id: tagId },
        });
        if (!tag) {
            throw new common_1.NotFoundException('Tag not found');
        }
        return tag;
    }
    async findTaskOrThrow(taskId) {
        const task = await this.prisma.checklistItem.findUnique({
            where: { id: taskId },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        return task;
    }
    async isProjectMember(projectId, userId) {
        const member = await this.prisma.projectMember.findFirst({
            where: { projectId, userId, status: client_1.ProjectMemberStatus.ACTIVE },
        });
        return !!member;
    }
    async hasProjectRole(projectId, userId, roleName) {
        const role = await this.prisma.projectRole.findUnique({
            where: { name: roleName },
        });
        if (!role)
            return false;
        const membership = await this.prisma.projectMember.findFirst({
            where: {
                projectId,
                userId,
                roleId: role.id,
                status: client_1.ProjectMemberStatus.ACTIVE,
            },
        });
        return !!membership;
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
    async hasManagerOrElevatedRole(projectId, userId) {
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        if (isManager)
            return true;
        const isElevated = await this.hasElevatedRole(userId);
        return isElevated;
    }
    async create(projectId, dto, userId) {
        const project = await this.findProjectOrThrow(projectId);
        if (project.deletedAt) {
            throw new common_1.BadRequestException('Project has been deleted');
        }
        const hasPermission = await this.hasManagerOrElevatedRole(projectId, userId);
        if (!hasPermission) {
            throw new common_1.ForbiddenException('Only a project manager, admin, or super admin can create tags');
        }
        const existing = await this.prisma.tag.findUnique({
            where: { projectId_name: { projectId, name: dto.name } },
        });
        if (existing) {
            throw new common_1.ConflictException(`A tag with the name "${dto.name}" already exists in this project`);
        }
        const tag = await this.prisma.tag.create({
            data: {
                projectId,
                name: dto.name,
                color: dto.color,
                createdById: userId,
            },
        });
        await this.activityLogService.create(userId, 'TAG_CREATED', 'TAG', tag.id, null, JSON.stringify({ name: tag.name, color: tag.color })).catch(() => { });
        return {
            id: tag.id,
            name: tag.name,
            color: tag.color,
        };
    }
    async findAll(projectId, userId) {
        const isMember = await this.isProjectMember(projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const tags = await this.prisma.tag.findMany({
            where: { projectId },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                color: true,
            },
        });
        return tags;
    }
    async update(tagId, dto, userId) {
        const tag = await this.findTagOrThrow(tagId);
        const hasPermission = await this.hasManagerOrElevatedRole(tag.projectId, userId);
        if (!hasPermission) {
            throw new common_1.ForbiddenException('Only a project manager, admin, or super admin can update tags');
        }
        if (dto.name !== undefined && dto.name !== tag.name) {
            const existing = await this.prisma.tag.findUnique({
                where: {
                    projectId_name: { projectId: tag.projectId, name: dto.name },
                },
            });
            if (existing) {
                throw new common_1.ConflictException(`A tag with the name "${dto.name}" already exists in this project`);
            }
        }
        await this.prisma.tag.update({
            where: { id: tagId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.color !== undefined && { color: dto.color }),
            },
        });
        await this.activityLogService.create(userId, 'TAG_UPDATED', 'TAG', tagId, JSON.stringify({ name: tag.name, color: tag.color }), JSON.stringify({
            name: dto.name ?? tag.name,
            color: dto.color ?? tag.color,
        })).catch(() => { });
        return { message: 'Tag updated successfully' };
    }
    async remove(tagId, userId) {
        const tag = await this.findTagOrThrow(tagId);
        const hasPermission = await this.hasManagerOrElevatedRole(tag.projectId, userId);
        if (!hasPermission) {
            throw new common_1.ForbiddenException('Only a project manager, admin, or super admin can delete tags');
        }
        await this.prisma.$transaction([
            this.prisma.taskTag.deleteMany({ where: { tagId } }),
            this.prisma.tag.delete({ where: { id: tagId } }),
        ]);
        await this.activityLogService.create(userId, 'TAG_DELETED', 'TAG', tagId, JSON.stringify({ name: tag.name, color: tag.color })).catch(() => { });
        return { message: 'Tag deleted successfully' };
    }
    async assignToTask(taskId, dto, userId) {
        const { tagId } = dto;
        const task = await this.findTaskOrThrow(taskId);
        if (task.deletedAt) {
            throw new common_1.BadRequestException('Cannot assign tags to a deleted task');
        }
        const tag = await this.findTagOrThrow(tagId);
        const checklist = await this.prisma.checklist.findUnique({
            where: { id: task.checklistId },
            select: { projectId: true },
        });
        if (!checklist) {
            throw new common_1.NotFoundException('Checklist not found');
        }
        if (tag.projectId !== checklist.projectId) {
            throw new common_1.BadRequestException('Tag does not belong to this project');
        }
        const isMember = await this.isProjectMember(checklist.projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const existingAssignment = await this.prisma.taskTag.findUnique({
            where: { taskId_tagId: { taskId, tagId } },
        });
        if (existingAssignment) {
            throw new common_1.ConflictException('Tag is already assigned to this task');
        }
        await this.prisma.taskTag.create({
            data: { taskId, tagId },
        });
        await this.activityLogService.create(userId, 'TAG_ASSIGNED', 'TAG', tagId, null, JSON.stringify({ taskId, tagName: tag.name })).catch(() => { });
        return { message: 'Tag assigned successfully' };
    }
    async removeFromTask(taskId, tagId, userId) {
        const task = await this.findTaskOrThrow(taskId);
        if (task.deletedAt) {
            throw new common_1.BadRequestException('Cannot modify a deleted task');
        }
        const checklist = await this.prisma.checklist.findUnique({
            where: { id: task.checklistId },
            select: { projectId: true },
        });
        if (!checklist) {
            throw new common_1.NotFoundException('Checklist not found');
        }
        const isMember = await this.isProjectMember(checklist.projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const assignment = await this.prisma.taskTag.findUnique({
            where: { taskId_tagId: { taskId, tagId } },
        });
        if (!assignment) {
            throw new common_1.BadRequestException('Tag not assigned to task');
        }
        await this.prisma.taskTag.delete({
            where: { taskId_tagId: { taskId, tagId } },
        });
        await this.activityLogService.create(userId, 'TAG_REMOVED', 'TAG', tagId, JSON.stringify({ taskId })).catch(() => { });
        return { message: 'Tag removed from task successfully' };
    }
    async getTaskTags(taskId, userId) {
        const task = await this.findTaskOrThrow(taskId);
        if (task.deletedAt) {
            throw new common_1.BadRequestException('Task has been deleted');
        }
        const checklist = await this.prisma.checklist.findUnique({
            where: { id: task.checklistId },
            select: { projectId: true },
        });
        if (!checklist) {
            throw new common_1.NotFoundException('Checklist not found');
        }
        const isMember = await this.isProjectMember(checklist.projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const taskTags = await this.prisma.taskTag.findMany({
            where: { taskId },
            include: {
                tag: {
                    select: { id: true, name: true, color: true },
                },
            },
        });
        return taskTags.map((tt) => tt.tag);
    }
};
exports.TagsService = TagsService;
exports.TagsService = TagsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        activity_log_service_1.ActivityLogService])
], TagsService);
//# sourceMappingURL=tags.service.js.map