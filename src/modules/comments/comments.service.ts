import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ───────────────────────────
  //  Helper: Check if user is an active project member
  // ───────────────────────────

  private async isProjectMember(projectId: number, userId: number): Promise<boolean> {
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, status: 'ACTIVE' },
    });
    return !!member;
  }

  // ───────────────────────────
  //  Helper: Check if user has a specific project role
  // ───────────────────────────

  private async hasProjectRole(
    projectId: number,
    userId: number,
    roleName: string,
  ): Promise<boolean> {
    const role = await this.prisma.projectRole.findUnique({ where: { name: roleName } });
    if (!role) return false;
    const membership = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, roleId: role.id, status: 'ACTIVE' },
    });
    return !!membership;
  }

  // ───────────────────────────
  //  Helper: Find task with project ID, or throw 404
  // ───────────────────────────

  private async findTaskWithProjectOrThrow(taskId: number) {
    const task = await this.prisma.checklistItem.findUnique({
      where: { id: taskId },
      include: { checklist: { select: { projectId: true } } },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  // ───────────────────────────
  //  Helper: Find comment or throw 404
  // ───────────────────────────

  private async findCommentOrThrow(commentId: number) {
    const comment = await this.prisma.taskComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  // ───────────────────────────
  //  Helper: Find a comment with its task's project ID
  // ───────────────────────────

  private async findCommentWithProject(commentId: number) {
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
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  // ───────────────────────────
  //  Notify task participants about a new comment
  // ───────────────────────────

  /**
   * Find all users involved with this task (assignee + previous commenters)
   * and notify them about the new comment, excluding the comment author.
   */
  private async notifyTaskParticipants(
    taskId: number,
    projectId: number,
    commenterId: number,
    commenterName: string,
    taskTitle: string,
  ) {
    // Get the task to find the assignee
    const task = await this.prisma.checklistItem.findUnique({
      where: { id: taskId },
      select: { assigneeId: true },
    });
    if (!task) return;

    // Collect unique participant IDs (assignee + other commenters)
    const participantIds = new Set<number>();

    if (task.assigneeId && task.assigneeId !== commenterId) {
      participantIds.add(task.assigneeId);
    }

    // Find other commenters on this task
    const otherCommenters = await this.prisma.taskComment.findMany({
      where: {
        taskId,
        deletedAt: null,
        userId: { not: commenterId },
      },
      select: { userId: true },
    });
    otherCommenters.forEach((c) => participantIds.add(c.userId));

    if (participantIds.size === 0) return;

    const content = `${commenterName} commented on task "${taskTitle}".`;

    for (const participantId of participantIds) {
      await this.notificationsService.create(
        participantId,
        'New Comment',
        content,
      ).catch(() => {});
    }
  }

  // ═══════════════════════════════════════════════
  //  @mention Detection & Processing
  // ═══════════════════════════════════════════════

  /**
   * Parse @username mentions from content, find matching project members,
   * create notifications, and send emails.
   */
  private async processMentions(
    content: string,
    projectId: number,
    taskId: number,
    senderId: number,
    senderName: string,
  ) {
    // Match @username patterns (alphanumeric + spaces between words)
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const mentions: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1].trim());
    }

    if (mentions.length === 0) return;

    // Fetch all active project members with user info
    const projectMembers = await this.prisma.projectMember.findMany({
      where: { projectId, status: 'ACTIVE' },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Build a lookup of fullName → user
    const userMap = new Map<string, { id: number; fullName: string; email: string }>();
    for (const member of projectMembers) {
      const lowerName = member.user.fullName.toLowerCase();
      if (!userMap.has(lowerName)) {
        userMap.set(lowerName, member.user);
      }
    }

    // Process each unique mention
    const processedUserIds = new Set<number>();

    for (const mention of mentions) {
      const user = userMap.get(mention.toLowerCase());
      if (!user || processedUserIds.has(user.id)) continue;

      // Skip self-mentions — don't notify the comment author
      if (user.id === senderId) continue;

      processedUserIds.add(user.id);

      // Create notification
      await this.prisma.notification.create({
        data: {
          userId: user.id,
          title: 'You were mentioned in a comment',
          content: `${senderName} mentioned you in a comment on task #${taskId}`,
        },
      });

      // Send email notification
      await this.mailService
        .sendMentionNotification(user.email, senderName, taskId)
        .catch(() => {
          // Silently fail — email delivery should not block comment creation
        });
    }
  }

  // ═══════════════════════════════════════════════
  //  2. Create Comment
  // ═══════════════════════════════════════════════

  async create(taskId: number, dto: CreateCommentDto, userId: number) {
    // Validate task exists and is not deleted
    const task = await this.findTaskWithProjectOrThrow(taskId);
    if (task.deletedAt) {
      throw new BadRequestException('Cannot comment on a deleted task');
    }

    const projectId = task.checklist.projectId;

    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Fetch sender info for mentions
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true },
    });

    // Create the comment
    const comment = await this.prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content: dto.content,
      },
    });

    // Process @mentions (non-blocking — failures don't affect comment creation)
    if (sender) {
      await this.processMentions(dto.content, projectId, taskId, sender.id, sender.fullName);
    }

    // Notification: Notify task participants about the new comment
    if (sender) {
      await this.notifyTaskParticipants(
        taskId,
        task.checklist.projectId,
        sender.id,
        sender.fullName,
        task.title,
      );
    }

    // Activity Log: COMMENT_CREATED
    await this.activityLogService.create(
      userId,
      'COMMENT_CREATED',
      'TASK_COMMENT',
      comment.id,
    ).catch(() => {});

    return {
      id: comment.id,
      content: comment.content,
    };
  }

  // ═══════════════════════════════════════════════
  //  3. Get Comments
  // ═══════════════════════════════════════════════

  async findAll(taskId: number, userId: number) {
    // Validate task exists and get project ID for membership check
    const taskWithProject = await this.findTaskWithProjectOrThrow(taskId);
    const projectId = taskWithProject.checklist.projectId;

    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Fetch comments (oldest first, excluding deleted)
    const comments = await this.prisma.taskComment.findMany({
      where: { taskId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, fullName: true },
        },
      },
    });

    // Format response
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

  // ═══════════════════════════════════════════════
  //  4. Update Comment
  // ═══════════════════════════════════════════════

  async update(commentId: number, dto: UpdateCommentDto, userId: number) {
    const comment = await this.findCommentOrThrow(commentId);

    // Cannot update deleted comments
    if (comment.deletedAt) {
      throw new BadRequestException('Cannot update a deleted comment');
    }

    // Authorization: Only the comment owner can edit
    if (comment.userId !== userId) {
      throw new ForbiddenException('Only the comment owner can edit this comment');
    }

    // Update the comment
    const updated = await this.prisma.taskComment.update({
      where: { id: commentId },
      data: {
        content: dto.content,
        updatedAt: new Date(),
      },
    });

    // Activity Log: COMMENT_UPDATED
    await this.activityLogService.create(
      userId,
      'COMMENT_UPDATED',
      'TASK_COMMENT',
      commentId,
    ).catch(() => {});

    return {
      id: updated.id,
      content: updated.content,
    };
  }

  // ═══════════════════════════════════════════════
  //  5. Delete Comment
  // ═══════════════════════════════════════════════

  async remove(commentId: number, userId: number) {
    const commentWithProject = await this.findCommentWithProject(commentId);

    // Cannot delete already deleted comments
    if (commentWithProject.deletedAt) {
      throw new BadRequestException('Comment has already been deleted');
    }

    const projectId = commentWithProject.task.checklist.projectId;

    // Authorization: Comment Owner or PROJECT_MANAGER
    const isOwner = commentWithProject.userId === userId;
    const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');

    if (!isOwner && !isManager) {
      throw new ForbiddenException(
        'Only the comment owner or a project manager can delete this comment',
      );
    }

    // Soft delete
    await this.prisma.taskComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    // Activity Log: COMMENT_DELETED
    await this.activityLogService.create(
      userId,
      'COMMENT_DELETED',
      'TASK_COMMENT',
      commentId,
    ).catch(() => {});

    return { message: 'Comment deleted successfully' };
  }
}
