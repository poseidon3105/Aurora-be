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
exports.ChecklistsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const activity_log_service_1 = require("../activity-log/activity-log.service");
const client_1 = require("@prisma/client");
let ChecklistsService = class ChecklistsService {
    constructor(prisma, activityLogService) {
        this.prisma = prisma;
        this.activityLogService = activityLogService;
    }
    async findChecklistOrThrow(checklistId) {
        const checklist = await this.prisma.checklist.findUnique({
            where: { id: checklistId },
        });
        if (!checklist) {
            throw new common_1.NotFoundException('Checklist not found');
        }
        return checklist;
    }
    async isProjectMember(projectId, userId) {
        const member = await this.prisma.projectMember.findFirst({
            where: { projectId, userId, status: client_1.ProjectMemberStatus.ACTIVE },
        });
        return !!member;
    }
    async hasProjectRole(projectId, userId, roleName) {
        const role = await this.prisma.projectRole.findUnique({ where: { name: roleName } });
        if (!role)
            return false;
        const membership = await this.prisma.projectMember.findFirst({
            where: { projectId, userId, roleId: role.id, status: client_1.ProjectMemberStatus.ACTIVE },
        });
        return !!membership;
    }
    async create(projectId, dto, userId) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        if (project.deletedAt) {
            throw new common_1.BadRequestException('Project has been deleted');
        }
        if (project.status !== client_1.ProjectStatus.ACTIVE) {
            throw new common_1.BadRequestException('Project must be ACTIVE to create checklists');
        }
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        const isMember = await this.hasProjectRole(projectId, userId, 'PROJECT_MEMBER');
        if (!isManager && !isMember) {
            throw new common_1.ForbiddenException('Only a project manager or project member can create checklists');
        }
        const { title, description, dueDate } = dto;
        if (dueDate) {
            const due = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (due < today) {
                throw new common_1.BadRequestException('Due date must be greater than or equal to today');
            }
            if (project.endDate && due >= project.endDate) {
                throw new common_1.BadRequestException('Due date must be before the project end date');
            }
        }
        const checklist = await this.prisma.checklist.create({
            data: {
                projectId,
                title,
                description,
                createdById: userId,
                dueDate: dueDate ? new Date(dueDate) : null,
                status: client_1.ChecklistStatus.OPEN,
            },
        });
        await this.activityLogService.create(userId, 'CHECKLIST_CREATED', 'CHECKLIST', checklist.id, null, JSON.stringify({ title, description })).catch(() => { });
        return checklist;
    }
    async findAll(projectId, userId) {
        const isMember = await this.isProjectMember(projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        return this.prisma.checklist.findMany({
            where: {
                projectId,
                deletedAt: null,
            },
            orderBy: { id: 'desc' },
        });
    }
    async findOne(checklistId, userId) {
        const checklist = await this.findChecklistOrThrow(checklistId);
        const isMember = await this.isProjectMember(checklist.projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const taskCount = await this.prisma.checklistItem.count({
            where: { checklistId, deletedAt: null },
        });
        const doneStatus = await this.prisma.taskStatus.findFirst({
            where: { name: 'DONE' },
        });
        const completedTaskCount = doneStatus
            ? await this.prisma.checklistItem.count({
                where: {
                    checklistId,
                    deletedAt: null,
                    statusId: doneStatus.id,
                },
            })
            : 0;
        return {
            ...checklist,
            taskCount,
            completedTaskCount,
        };
    }
    async update(checklistId, dto, userId) {
        const checklist = await this.findChecklistOrThrow(checklistId);
        if (checklist.deletedAt) {
            throw new common_1.BadRequestException('Cannot update a deleted checklist');
        }
        const isManager = await this.hasProjectRole(checklist.projectId, userId, 'PROJECT_MANAGER');
        const isCreator = checklist.createdById === userId;
        if (!isManager && !isCreator) {
            throw new common_1.ForbiddenException('Only a project manager or the checklist creator can update this checklist');
        }
        if (dto.dueDate) {
            const project = await this.prisma.project.findUnique({
                where: { id: checklist.projectId },
            });
            if (project) {
                const due = new Date(dto.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (due < today) {
                    throw new common_1.BadRequestException('Due date must be greater than or equal to today');
                }
                if (project.endDate && due >= project.endDate) {
                    throw new common_1.BadRequestException('Due date must be before the project end date');
                }
            }
        }
        const updated = await this.prisma.checklist.update({
            where: { id: checklistId },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.dueDate !== undefined && {
                    dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                }),
            },
        });
        await this.activityLogService.create(userId, 'CHECKLIST_UPDATED', 'CHECKLIST', checklistId, JSON.stringify({ title: checklist.title, description: checklist.description }), JSON.stringify({
            title: dto.title ?? checklist.title,
            description: dto.description !== undefined ? dto.description : checklist.description,
        })).catch(() => { });
        return updated;
    }
    async changeStatus(checklistId, dto, userId) {
        const checklist = await this.findChecklistOrThrow(checklistId);
        const isMember = await this.isProjectMember(checklist.projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const { status: targetStatus } = dto;
        const currentStatus = checklist.status;
        const validTransitions = {
            [client_1.ChecklistStatus.OPEN]: [client_1.ChecklistStatus.IN_PROGRESS],
            [client_1.ChecklistStatus.IN_PROGRESS]: [client_1.ChecklistStatus.DONE],
            [client_1.ChecklistStatus.DONE]: [],
        };
        if (!validTransitions[currentStatus].includes(targetStatus)) {
            throw new common_1.BadRequestException(`Cannot transition from ${currentStatus} to ${targetStatus}. Allowed flow: OPEN → IN_PROGRESS → DONE`);
        }
        const result = await this.prisma.checklist.update({
            where: { id: checklistId },
            data: { status: targetStatus },
        });
        await this.activityLogService.create(userId, 'CHECKLIST_STATUS_CHANGED', 'CHECKLIST', checklistId, JSON.stringify({ status: currentStatus }), JSON.stringify({ status: targetStatus })).catch(() => { });
        return result;
    }
    async remove(checklistId, userId) {
        const checklist = await this.findChecklistOrThrow(checklistId);
        const isManager = await this.hasProjectRole(checklist.projectId, userId, 'PROJECT_MANAGER');
        const isCreator = checklist.createdById === userId;
        if (!isManager && !isCreator) {
            throw new common_1.ForbiddenException('Only a project manager or the checklist creator can delete this checklist');
        }
        const openStatus = await this.prisma.taskStatus.findFirst({
            where: { name: 'OPEN' },
        });
        const inProgressStatus = await this.prisma.taskStatus.findFirst({
            where: { name: 'IN_PROGRESS' },
        });
        const incompleteStatusIds = [openStatus, inProgressStatus]
            .filter((s) => s !== null)
            .map((s) => s.id);
        if (incompleteStatusIds.length > 0) {
            const incompleteTask = await this.prisma.checklistItem.findFirst({
                where: {
                    checklistId,
                    deletedAt: null,
                    statusId: { in: incompleteStatusIds },
                },
            });
            if (incompleteTask) {
                throw new common_1.ConflictException('Cannot delete checklist with incomplete tasks');
            }
        }
        else {
            const anyTask = await this.prisma.checklistItem.findFirst({
                where: { checklistId, deletedAt: null },
            });
            if (anyTask) {
                throw new common_1.ConflictException('Cannot delete checklist with incomplete tasks');
            }
        }
        const deleted = await this.prisma.checklist.update({
            where: { id: checklistId },
            data: { deletedAt: new Date() },
        });
        await this.activityLogService.create(userId, 'CHECKLIST_DELETED', 'CHECKLIST', checklistId, JSON.stringify({ title: checklist.title, status: checklist.status })).catch(() => { });
        return deleted;
    }
};
exports.ChecklistsService = ChecklistsService;
exports.ChecklistsService = ChecklistsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        activity_log_service_1.ActivityLogService])
], ChecklistsService);
//# sourceMappingURL=checklists.service.js.map