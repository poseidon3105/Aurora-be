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
exports.ActivityLogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ActivityLogService = class ActivityLogService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, action, entityType, entityId, oldValue, newValue) {
        return this.prisma.activityLog.create({
            data: {
                userId,
                action,
                entityType,
                entityId,
                oldValue: oldValue ?? null,
                newValue: newValue ?? null,
            },
        });
    }
    async findMyActivities(userId, options) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.max(1, Math.min(100, options.limit || 20));
        const skip = (page - 1) * limit;
        const where = { userId };
        const [data, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.activityLog.count({ where }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 0,
            },
        };
    }
    async findProjectActivities(projectId, userId, options) {
        const isMember = await this.isProjectMember(projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const entityFilters = [];
        entityFilters.push({ entityType: 'PROJECT', entityId: projectId });
        const members = await this.prisma.projectMember.findMany({
            where: { projectId },
            select: { id: true },
        });
        for (const m of members) {
            entityFilters.push({ entityType: 'PROJECT_MEMBER', entityId: m.id });
        }
        const checklists = await this.prisma.checklist.findMany({
            where: { projectId },
            select: { id: true },
        });
        const checklistIds = checklists.map((c) => c.id);
        for (const id of checklistIds) {
            entityFilters.push({ entityType: 'CHECKLIST', entityId: id });
        }
        const tasks = await this.prisma.checklistItem.findMany({
            where: { checklistId: { in: checklistIds } },
            select: { id: true },
        });
        const taskIds = tasks.map((t) => t.id);
        for (const id of taskIds) {
            entityFilters.push({ entityType: 'TASK', entityId: id });
        }
        const comments = await this.prisma.taskComment.findMany({
            where: { taskId: { in: taskIds } },
            select: { id: true },
        });
        for (const c of comments) {
            entityFilters.push({ entityType: 'TASK_COMMENT', entityId: c.id });
        }
        const attachments = await this.prisma.taskAttachment.findMany({
            where: { taskId: { in: taskIds } },
            select: { id: true },
        });
        for (const a of attachments) {
            entityFilters.push({ entityType: 'TASK_ATTACHMENT', entityId: a.id });
        }
        const tags = await this.prisma.tag.findMany({
            where: { projectId },
            select: { id: true },
        });
        for (const t of tags) {
            entityFilters.push({ entityType: 'TAG', entityId: t.id });
        }
        const orConditions = entityFilters.map((f) => ({
            entityType: f.entityType,
            entityId: f.entityId,
        }));
        if (orConditions.length === 0) {
            return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
        }
        const page = Math.max(1, options.page || 1);
        const limit = Math.max(1, Math.min(100, options.limit || 20));
        const skip = (page - 1) * limit;
        const where = { OR: orConditions };
        const [data, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.activityLog.count({ where }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 0,
            },
        };
    }
    async findTaskActivities(taskId, userId, options) {
        const task = await this.prisma.checklistItem.findUnique({
            where: { id: taskId },
            include: { checklist: { select: { projectId: true } } },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        const isMember = await this.isProjectMember(task.checklist.projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const entityFilters = [];
        entityFilters.push({ entityType: 'TASK', entityId: taskId });
        const comments = await this.prisma.taskComment.findMany({
            where: { taskId },
            select: { id: true },
        });
        for (const c of comments) {
            entityFilters.push({ entityType: 'TASK_COMMENT', entityId: c.id });
        }
        const attachments = await this.prisma.taskAttachment.findMany({
            where: { taskId },
            select: { id: true },
        });
        for (const a of attachments) {
            entityFilters.push({ entityType: 'TASK_ATTACHMENT', entityId: a.id });
        }
        const page = Math.max(1, options.page || 1);
        const limit = Math.max(1, Math.min(100, options.limit || 20));
        const skip = (page - 1) * limit;
        const orConditions = entityFilters.map((f) => ({
            entityType: f.entityType,
            entityId: f.entityId,
        }));
        const where = { OR: orConditions };
        const [data, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.activityLog.count({ where }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 0,
            },
        };
    }
    async isProjectMember(projectId, userId) {
        const member = await this.prisma.projectMember.findFirst({
            where: { projectId, userId, status: 'ACTIVE' },
        });
        return !!member;
    }
};
exports.ActivityLogService = ActivityLogService;
exports.ActivityLogService = ActivityLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActivityLogService);
//# sourceMappingURL=activity-log.service.js.map