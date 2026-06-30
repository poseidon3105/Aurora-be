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
exports.CommentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../../mail/mail.service");
const notifications_service_1 = require("../notifications/notifications.service");
let CommentsService = class CommentsService {
    constructor(prisma, mailService, notificationsService) {
        this.prisma = prisma;
        this.mailService = mailService;
        this.notificationsService = notificationsService;
    }
    async isProjectMember(projectId, userId) {
        const member = await this.prisma.projectMember.findFirst({
            where: { projectId, userId, status: 'ACTIVE' },
        });
        return !!member;
    }
    async hasProjectRole(projectId, userId, roleName) {
        const role = await this.prisma.projectRole.findUnique({ where: { name: roleName } });
        if (!role)
            return false;
        const membership = await this.prisma.projectMember.findFirst({
            where: { projectId, userId, roleId: role.id, status: 'ACTIVE' },
        });
        return !!membership;
    }
    async findTaskWithProjectOrThrow(taskId) {
        const task = await this.prisma.checklistItem.findUnique({
            where: { id: taskId },
            include: { checklist: { select: { projectId: true } } },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        return task;
    }
    async findCommentOrThrow(commentId) {
        const comment = await this.prisma.taskComment.findUnique({
            where: { id: commentId },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        return comment;
    }
    async findCommentWithProject(commentId) {
        const comment = await this.prisma.taskComment.findUnique({
            where: { id: commentId },
            include: {
                task: {
                    include: {
                        checklist: { select: { projectId: true } },
                    },
                },
            },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        return comment;
    }
    async notifyTaskParticipants(taskId, projectId, commenterId, commenterName, taskTitle) {
        const task = await this.prisma.checklistItem.findUnique({
            where: { id: taskId },
            select: { assigneeId: true },
        });
        if (!task)
            return;
        const participantIds = new Set();
        if (task.assigneeId && task.assigneeId !== commenterId) {
            participantIds.add(task.assigneeId);
        }
        const otherCommenters = await this.prisma.taskComment.findMany({
            where: {
                taskId,
                deletedAt: null,
                userId: { not: commenterId },
            },
            select: { userId: true },
        });
        otherCommenters.forEach((c) => participantIds.add(c.userId));
        if (participantIds.size === 0)
            return;
        const content = `${commenterName} commented on task "${taskTitle}".`;
        for (const participantId of participantIds) {
            await this.notificationsService.create(participantId, 'New Comment', content).catch(() => { });
        }
    }
    async processMentions(content, projectId, taskId, senderId, senderName) {
        const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
            mentions.push(match[1].trim());
        }
        if (mentions.length === 0)
            return;
        const projectMembers = await this.prisma.projectMember.findMany({
            where: { projectId, status: 'ACTIVE' },
            include: {
                user: { select: { id: true, fullName: true, email: true } },
            },
        });
        const userMap = new Map();
        for (const member of projectMembers) {
            const lowerName = member.user.fullName.toLowerCase();
            if (!userMap.has(lowerName)) {
                userMap.set(lowerName, member.user);
            }
        }
        const processedUserIds = new Set();
        for (const mention of mentions) {
            const user = userMap.get(mention.toLowerCase());
            if (!user || processedUserIds.has(user.id))
                continue;
            if (user.id === senderId)
                continue;
            processedUserIds.add(user.id);
            await this.prisma.notification.create({
                data: {
                    userId: user.id,
                    title: 'You were mentioned in a comment',
                    content: `${senderName} mentioned you in a comment on task #${taskId}`,
                },
            });
            await this.mailService
                .sendMentionNotification(user.email, senderName, taskId)
                .catch(() => {
            });
        }
    }
    async create(taskId, dto, userId) {
        const task = await this.findTaskWithProjectOrThrow(taskId);
        if (task.deletedAt) {
            throw new common_1.BadRequestException('Cannot comment on a deleted task');
        }
        const projectId = task.checklist.projectId;
        const isMember = await this.isProjectMember(projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const sender = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, fullName: true },
        });
        const comment = await this.prisma.taskComment.create({
            data: {
                taskId,
                userId,
                content: dto.content,
            },
        });
        if (sender) {
            await this.processMentions(dto.content, projectId, taskId, sender.id, sender.fullName);
        }
        if (sender) {
            await this.notifyTaskParticipants(taskId, task.checklist.projectId, sender.id, sender.fullName, task.title);
        }
        return {
            id: comment.id,
            content: comment.content,
        };
    }
    async findAll(taskId, userId) {
        const taskWithProject = await this.findTaskWithProjectOrThrow(taskId);
        const projectId = taskWithProject.checklist.projectId;
        const isMember = await this.isProjectMember(projectId, userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this project');
        }
        const comments = await this.prisma.taskComment.findMany({
            where: { taskId, deletedAt: null },
            orderBy: { createdAt: 'asc' },
            include: {
                user: {
                    select: { id: true, fullName: true },
                },
            },
        });
        return comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            user: {
                id: comment.user.id,
                fullName: comment.user.fullName,
            },
            createdAt: comment.createdAt,
        }));
    }
    async update(commentId, dto, userId) {
        const comment = await this.findCommentOrThrow(commentId);
        if (comment.deletedAt) {
            throw new common_1.BadRequestException('Cannot update a deleted comment');
        }
        if (comment.userId !== userId) {
            throw new common_1.ForbiddenException('Only the comment owner can edit this comment');
        }
        const updated = await this.prisma.taskComment.update({
            where: { id: commentId },
            data: {
                content: dto.content,
                updatedAt: new Date(),
            },
        });
        return {
            id: updated.id,
            content: updated.content,
        };
    }
    async remove(commentId, userId) {
        const commentWithProject = await this.findCommentWithProject(commentId);
        if (commentWithProject.deletedAt) {
            throw new common_1.BadRequestException('Comment has already been deleted');
        }
        const projectId = commentWithProject.task.checklist.projectId;
        const isOwner = commentWithProject.userId === userId;
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        if (!isOwner && !isManager) {
            throw new common_1.ForbiddenException('Only the comment owner or a project manager can delete this comment');
        }
        await this.prisma.taskComment.update({
            where: { id: commentId },
            data: { deletedAt: new Date() },
        });
        return { message: 'Comment deleted successfully' };
    }
};
exports.CommentsService = CommentsService;
exports.CommentsService = CommentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        notifications_service_1.NotificationsService])
], CommentsService);
//# sourceMappingURL=comments.service.js.map