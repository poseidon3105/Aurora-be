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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const client_1 = require("@prisma/client");
let TasksService = class TasksService {
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
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
        const role = await this.prisma.projectRole.findUnique({ where: { name: roleName } });
        if (!role)
            return false;
        const membership = await this.prisma.projectMember.findFirst({
            where: { projectId, userId, roleId: role.id, status: client_1.ProjectMemberStatus.ACTIVE },
        });
        return !!membership;
    }
    async validateAssignee(assigneeId, projectId) {
        const user = await this.prisma.user.findUnique({ where: { id: assigneeId } });
        if (!user) {
            throw new common_1.BadRequestException('Assignee not found');
        }
        if (user.status !== client_1.UserStatus.ACTIVE) {
            throw new common_1.BadRequestException('Assignee is not active');
        }
        const isMember = await this.isProjectMember(projectId, assigneeId);
        if (!isMember) {
            throw new common_1.BadRequestException('Assignee is not a member of this project');
        }
        return user;
    }
    async autoUpdateChecklistStatus(checklistId) {
        const doneStatus = await this.prisma.taskStatus.findFirst({
            where: { name: 'DONE' },
        });
        if (!doneStatus)
            return;
        const totalTasks = await this.prisma.checklistItem.count({
            where: { checklistId, deletedAt: null },
        });
        if (totalTasks === 0) {
            await this.prisma.checklist.update({
                where: { id: checklistId },
                data: { status: client_1.ChecklistStatus.OPEN },
            });
            return;
        }
        const doneTasks = await this.prisma.checklistItem.count({
            where: { checklistId, deletedAt: null, statusId: doneStatus.id },
        });
        if (doneTasks === totalTasks) {
            await this.prisma.checklist.update({
                where: { id: checklistId },
                data: { status: client_1.ChecklistStatus.DONE },
            });
        }
        else {
            await this.prisma.checklist.update({
                where: { id: checklistId },
                data: { status: client_1.ChecklistStatus.IN_PROGRESS },
            });
        }
    }
    async create(checklistId, dto, userId) {
        const checklist = await this.prisma.checklist.findUnique({
            where: { id: checklistId },
            include: { project: true },
        });
        if (!checklist) {
            throw new common_1.NotFoundException('Checklist not found');
        }
        if (checklist.deletedAt) {
            throw new common_1.BadRequestException('Checklist has been deleted');
        }
        const project = checklist.project;
        if (project.deletedAt) {
            throw new common_1.BadRequestException('Project has been deleted');
        }
        if (project.status !== client_1.ProjectStatus.ACTIVE) {
            throw new common_1.BadRequestException('Project must be ACTIVE to create tasks');
        }
        const isManager = await this.hasProjectRole(project.id, userId, 'PROJECT_MANAGER');
        const isMember = await this.hasProjectRole(project.id, userId, 'PROJECT_MEMBER');
        if (!isManager && !isMember) {
            throw new common_1.ForbiddenException('Only a project manager or project member can create tasks');
        }
        const { title, description, assigneeId, dueDate } = dto;
        if (assigneeId) {
            await this.validateAssignee(assigneeId, project.id);
        }
        if (dueDate) {
            const due = new Date(dueDate);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            if (due < now) {
                throw new common_1.BadRequestException('Due date must be greater than or equal to today');
            }
            if (checklist.dueDate && due > new Date(checklist.dueDate)) {
                throw new common_1.BadRequestException('Task due date must be on or before the checklist due date');
            }
        }
        const todoStatus = await this.prisma.taskStatus.findFirst({
            where: { name: 'TODO' },
        });
        if (!todoStatus) {
            throw new common_1.BadRequestException('Default status (TODO) not found');
        }
        const maxOrderTask = await this.prisma.checklistItem.findFirst({
            where: { checklistId, deletedAt: null },
            orderBy: { orderIndex: 'desc' },
        });
        const orderIndex = (maxOrderTask?.orderIndex ?? -1) + 1;
        const task = await this.prisma.checklistItem.create({
            data: {
                checklistId,
                title,
                description,
                assigneeId: assigneeId ?? null,
                statusId: todoStatus.id,
                dueDate: dueDate ? new Date(dueDate) : null,
                orderIndex,
            },
        });
        if (checklist.status === client_1.ChecklistStatus.DONE) {
            await this.prisma.checklist.update({
                where: { id: checklistId },
                data: { status: client_1.ChecklistStatus.OPEN },
            });
        }
        return {
            id: task.id,
            title: task.title,
            status: 'TODO',
        };
    }
    async findAll(checklistId, userId) {
        const checklist = await this.prisma.checklist.findUnique({
            where: { id: checklistId },
        });
        if (!checklist) {
            throw new common_1.NotFoundException('Checklist not found');
        }
        const isMember = await this.isProjectMember(checklist.projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        return this.prisma.checklistItem.findMany({
            where: {
                checklistId,
                deletedAt: null,
            },
            orderBy: { orderIndex: 'asc' },
        });
    }
    async findOne(taskId, userId) {
        const task = await this.prisma.checklistItem.findUnique({
            where: { id: taskId },
            include: {
                checklist: { select: { projectId: true } },
                assignee: {
                    select: { id: true, fullName: true, email: true, avatarUrl: true },
                },
                status: {
                    select: { id: true, name: true, color: true },
                },
                tags: {
                    include: {
                        tag: { select: { id: true, name: true, color: true } },
                    },
                },
                _count: {
                    select: {
                        comments: true,
                        attachments: true,
                    },
                },
            },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        const isMember = await this.isProjectMember(task.checklist.projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        return {
            ...task,
            tags: task.tags.map((tt) => tt.tag),
        };
    }
    async update(taskId, dto, userId) {
        const task = await this.findTaskOrThrow(taskId);
        if (task.deletedAt) {
            throw new common_1.BadRequestException('Cannot update a deleted task');
        }
        const checklist = await this.prisma.checklist.findUnique({
            where: { id: task.checklistId },
            include: { project: true },
        });
        if (!checklist) {
            throw new common_1.NotFoundException('Checklist not found');
        }
        const isManager = await this.hasProjectRole(checklist.project.id, userId, 'PROJECT_MANAGER');
        const isAssignee = task.assigneeId === userId;
        if (!isManager && !isAssignee) {
            throw new common_1.ForbiddenException('Only a project manager or the task assignee can update this task');
        }
        if (dto.assigneeId !== undefined) {
            if (dto.assigneeId) {
                await this.validateAssignee(dto.assigneeId, checklist.project.id);
            }
        }
        if (dto.dueDate) {
            const due = new Date(dto.dueDate);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            if (due < now) {
                throw new common_1.BadRequestException('Due date must be greater than or equal to today');
            }
            if (checklist.dueDate && due > new Date(checklist.dueDate)) {
                throw new common_1.BadRequestException('Task due date must be on or before the checklist due date');
            }
        }
        await this.prisma.checklistItem.update({
            where: { id: taskId },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.assigneeId !== undefined && {
                    assigneeId: dto.assigneeId || null,
                }),
                ...(dto.dueDate !== undefined && {
                    dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                }),
            },
        });
        if (dto.assigneeId !== undefined && !dto.assigneeId && task.assigneeId) {
            await this.notificationsService.create(task.assigneeId, 'Task Unassigned', `You have been removed from task "${task.title}".`).catch(() => { });
        }
        if (dto.assigneeId !== undefined && dto.assigneeId && dto.assigneeId !== task.assigneeId) {
            const assigner = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { fullName: true },
            });
            const assignerName = assigner?.fullName || 'A user';
            await this.notificationsService.create(dto.assigneeId, 'Task Assigned', `${assignerName} assigned you to task "${task.title}".`).catch(() => { });
        }
        return this.prisma.checklistItem.findUnique({
            where: { id: taskId },
        });
    }
    async assign(taskId, dto, userId) {
        const task = await this.findTaskOrThrow(taskId);
        const checklist = await this.prisma.checklist.findUnique({
            where: { id: task.checklistId },
            include: { project: true },
        });
        if (!checklist) {
            throw new common_1.NotFoundException('Checklist not found');
        }
        const isManager = await this.hasProjectRole(checklist.project.id, userId, 'PROJECT_MANAGER');
        const isCurrentAssignee = task.assigneeId === userId;
        if (!isManager && !isCurrentAssignee) {
            throw new common_1.ForbiddenException('Only a project manager or the current assignee can assign tasks');
        }
        await this.validateAssignee(dto.assigneeId, checklist.project.id);
        await this.prisma.checklistItem.update({
            where: { id: taskId },
            data: { assigneeId: dto.assigneeId },
        });
        const assigner = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { fullName: true },
        });
        const assignerName = assigner?.fullName || 'A user';
        await this.notificationsService.create(dto.assigneeId, 'Task Assigned', `${assignerName} assigned you to task "${task.title}".`).catch(() => { });
        return this.prisma.checklistItem.findUnique({
            where: { id: taskId },
        });
    }
    async changeStatus(taskId, dto, userId) {
        const task = await this.findTaskOrThrow(taskId);
        const checklist = await this.prisma.checklist.findUnique({
            where: { id: task.checklistId },
            include: { project: true },
        });
        if (!checklist) {
            throw new common_1.NotFoundException('Checklist not found');
        }
        const isMember = await this.isProjectMember(checklist.project.id, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const newStatus = await this.prisma.taskStatus.findUnique({
            where: { id: dto.statusId },
        });
        if (!newStatus) {
            throw new common_1.BadRequestException('Status not found');
        }
        const doneStatus = await this.prisma.taskStatus.findFirst({
            where: { name: 'DONE' },
        });
        let completedAt = null;
        if (doneStatus && dto.statusId === doneStatus.id) {
            completedAt = new Date();
        }
        await this.prisma.checklistItem.update({
            where: { id: taskId },
            data: {
                statusId: dto.statusId,
                ...(doneStatus && { completedAt }),
            },
        });
        await this.autoUpdateChecklistStatus(task.checklistId);
        if (doneStatus && dto.statusId === doneStatus.id && task.assigneeId && task.assigneeId !== userId) {
            await this.notificationsService.create(task.assigneeId, 'Task Completed', `Task "${task.title}" has been completed.`).catch(() => { });
        }
        return {
            message: 'Status updated successfully',
            status: newStatus.name,
            completedAt,
        };
    }
    async reorder(dto, userId) {
        const { taskId, newPosition } = dto;
        const task = await this.findTaskOrThrow(taskId);
        const checklist = await this.prisma.checklist.findUnique({
            where: { id: task.checklistId },
        });
        if (!checklist) {
            throw new common_1.NotFoundException('Checklist not found');
        }
        const isMember = await this.isProjectMember(checklist.projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const allTasks = await this.prisma.checklistItem.findMany({
            where: { checklistId: task.checklistId, deletedAt: null },
            orderBy: { orderIndex: 'asc' },
            select: { id: true, orderIndex: true },
        });
        const taskIds = allTasks.map((t) => t.id);
        const currentIndex = taskIds.indexOf(taskId);
        if (currentIndex === -1) {
            throw new common_1.BadRequestException('Task not found in checklist');
        }
        taskIds.splice(currentIndex, 1);
        const clampedPosition = Math.min(newPosition, taskIds.length);
        taskIds.splice(clampedPosition, 0, taskId);
        const updates = taskIds.map((id, index) => this.prisma.checklistItem.update({
            where: { id },
            data: { orderIndex: index },
        }));
        await this.prisma.$transaction(updates);
        return { message: 'Tasks reordered successfully' };
    }
    async remove(taskId, userId) {
        const task = await this.findTaskOrThrow(taskId);
        const checklist = await this.prisma.checklist.findUnique({
            where: { id: task.checklistId },
            include: { project: true },
        });
        if (!checklist) {
            throw new common_1.NotFoundException('Checklist not found');
        }
        const isManager = await this.hasProjectRole(checklist.project.id, userId, 'PROJECT_MANAGER');
        const isAssignee = task.assigneeId === userId;
        if (!isManager && !isAssignee) {
            throw new common_1.ForbiddenException('Only a project manager or the task creator can delete this task');
        }
        await this.prisma.checklistItem.update({
            where: { id: taskId },
            data: { deletedAt: new Date() },
        });
        await this.autoUpdateChecklistStatus(task.checklistId);
        return { message: 'Task deleted successfully' };
    }
    async getTaskSummary(projectId, userId) {
        const isMember = await this.isProjectMember(projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const statuses = await this.prisma.taskStatus.findMany({
            orderBy: { orderIndex: 'asc' },
        });
        const totalTasks = await this.prisma.checklistItem.count({
            where: {
                deletedAt: null,
                checklist: { projectId, deletedAt: null },
            },
        });
        const statusCounts = {};
        for (const status of statuses) {
            const count = await this.prisma.checklistItem.count({
                where: {
                    deletedAt: null,
                    statusId: status.id,
                    checklist: { projectId, deletedAt: null },
                },
            });
            const key = this.toCamelCaseKey(status.name || 'UNKNOWN');
            statusCounts[key] = count;
        }
        return {
            totalTasks,
            ...statusCounts,
        };
    }
    toCamelCaseKey(name) {
        return name
            .toLowerCase()
            .split('_')
            .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map