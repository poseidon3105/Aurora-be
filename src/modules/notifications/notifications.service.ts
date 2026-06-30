import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────────
  //  Helper: Find notification or throw 404
  // ───────────────────────────

  private async findNotificationOrThrow(notificationId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }

  // ═══════════════════════════════════════════════
  //  Create a notification (used by other services)
  // ═══════════════════════════════════════════════

  async create(userId: number, title: string, content: string) {
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

  // ═══════════════════════════════════════════════
  //  Get My Notifications (paginated)
  // ═══════════════════════════════════════════════

  async findAll(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      isRead?: boolean;
    },
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { userId };

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

  // ═══════════════════════════════════════════════
  //  Get Unread Notification Count
  // ═══════════════════════════════════════════════

  async getUnreadCount(userId: number) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { count };
  }

  // ═══════════════════════════════════════════════
  //  Mark Notification as Read
  // ═══════════════════════════════════════════════

  async markAsRead(notificationId: number, userId: number) {
    const notification = await this.findNotificationOrThrow(notificationId);

    // Authorization: Must belong to current user
    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You can only mark your own notifications as read',
      );
    }

    // If already read, do nothing — no error per requirements
    if (notification.isRead) {
      return { message: 'Notification marked as read.' };
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return { message: 'Notification marked as read.' };
  }

  // ═══════════════════════════════════════════════
  //  Mark All Notifications as Read
  // ═══════════════════════════════════════════════

  async markAllAsRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { message: 'All notifications marked as read.' };
  }

  // ═══════════════════════════════════════════════
  //  Delete Notification
  // ═══════════════════════════════════════════════

  async remove(notificationId: number, userId: number) {
    const notification = await this.findNotificationOrThrow(notificationId);

    // Authorization: Must belong to current user
    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own notifications',
      );
    }

    // Hard delete (no deletedAt column in schema)
    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted successfully.' };
  }
}
