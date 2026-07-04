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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let NotificationsService = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findNotificationOrThrow(notificationId) {
        const notification = await this.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        return notification;
    }
    async create(userId, title, content) {
        return this.prisma.notification.create({
            data: { userId, title, content },
            select: {
                id: true,
                title: true,
                content: true,
                isRead: true,
                createdAt: true,
            },
        });
    }
    async findAll(userId, options) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.max(1, Math.min(100, options.limit || 20));
        const skip = (page - 1) * limit;
        const where = { userId };
        if (options.isRead !== undefined) {
            where.isRead = options.isRead;
        }
        const [data, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    title: true,
                    content: true,
                    isRead: true,
                    createdAt: true,
                },
            }),
            this.prisma.notification.count({ where }),
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
    async getUnreadCount(userId) {
        const count = await this.prisma.notification.count({
            where: { userId, isRead: false },
        });
        return { count };
    }
    async markAsRead(notificationId, userId) {
        const notification = await this.findNotificationOrThrow(notificationId);
        if (notification.userId !== userId) {
            throw new common_1.ForbiddenException('You can only mark your own notifications as read');
        }
        if (notification.isRead) {
            return { message: 'Notification marked as read.' };
        }
        await this.prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
        return { message: 'Notification marked as read.' };
    }
    async markAllAsRead(userId) {
        await this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return { message: 'All notifications marked as read.' };
    }
    async remove(notificationId, userId) {
        const notification = await this.findNotificationOrThrow(notificationId);
        if (notification.userId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own notifications');
        }
        await this.prisma.notification.delete({
            where: { id: notificationId },
        });
        return { message: 'Notification deleted successfully.' };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map