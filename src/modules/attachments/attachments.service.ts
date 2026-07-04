import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AzureBlobService } from '../../azure-blob/azure-blob.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { validateFile, normalizeFileName } from './file-validation.util';
import * as crypto from 'crypto';

@Injectable()
export class AttachmentsService {
  private readonly maxFileSize: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly azureBlobService: AzureBlobService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly activityLogService: ActivityLogService,
  ) {
    this.maxFileSize = this.configService.get<number>('upload.maxFileSize', 20971520);
  }

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
    if (task.deletedAt) {
      throw new BadRequestException('Cannot attach files to a deleted task');
    }
    return task;
  }

  // ───────────────────────────
  //  Helper: Find attachment with its task's project ID
  // ───────────────────────────

  private async findAttachmentWithProjectOrThrow(attachmentId: number) {
    const attachment = await this.prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: {
          include: {
            checklist: { select: { projectId: true } },
          },
        },
      },
    });
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    return attachment;
  }

  // ───────────────────────────
  //  Notify task participants about a new attachment
  // ───────────────────────────

  private async notifyTaskParticipants(
    taskId: number,
    uploaderId: number,
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

    if (task.assigneeId && task.assigneeId !== uploaderId) {
      participantIds.add(task.assigneeId);
    }

    // Find other commenters on this task
    const commenters = await this.prisma.taskComment.findMany({
      where: {
        taskId,
        deletedAt: null,
        userId: { not: uploaderId },
      },
      select: { userId: true },
    });
    commenters.forEach((c) => participantIds.add(c.userId));

    if (participantIds.size === 0) return;

    const content = `A new file has been uploaded to task "${taskTitle}".`;

    for (const participantId of participantIds) {
      await this.notificationsService.create(
        participantId,
        'New Attachment',
        content,
      ).catch(() => {});
    }
  }

  // ═══════════════════════════════════════════════
  //  3. Upload Attachment
  // ═══════════════════════════════════════════════

  async upload(
    taskId: number,
    file: Express.Multer.File,
    userId: number,
  ) {
    // Validate task exists, is not deleted, and get project ID
    const task = await this.findTaskWithProjectOrThrow(taskId);
    const projectId = task.checklist.projectId;

    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      const maxMB = Math.round(this.maxFileSize / (1024 * 1024));
      throw new BadRequestException(
        `File size must not exceed ${maxMB} MB`,
      );
    }

    // Normalize filename first so validation and DB storage use the same safe name.
    const normalizedFileName = normalizeFileName(file.originalname);

    // Validate file type (extension + MIME type)
    validateFile(normalizedFileName, file.mimetype);

    // Generate a UUID-based filename while preserving the original extension
    const extension = normalizedFileName.split('.').pop()?.toLowerCase() || '';
    const blobName = `${crypto.randomUUID()}.${extension}`;

    // Upload to Azure Blob Storage
    const fileUrl = await this.azureBlobService.upload(
      blobName,
      file.buffer,
      file.mimetype,
    );

    // Save metadata to database
    const attachment = await this.prisma.taskAttachment.create({
      data: {
        taskId,
        uploadedById: userId,
        fileName: normalizedFileName,
        fileUrl,
      },
    });

    // Notification: Notify task participants about the new attachment
    await this.notifyTaskParticipants(
      taskId,
      userId,
      task.title,
    );

    // Activity Log: ATTACHMENT_UPLOADED
    await this.activityLogService.create(
      userId,
      'ATTACHMENT_UPLOADED',
      'TASK_ATTACHMENT',
      attachment.id,
    ).catch(() => {});

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
    };
  }

  // ═══════════════════════════════════════════════
  //  4. Get Attachments (by task)
  // ═══════════════════════════════════════════════

  async findAll(taskId: number, userId: number) {
    // Validate task exists and get project ID
    const task = await this.findTaskWithProjectOrThrow(taskId);
    const projectId = task.checklist.projectId;

    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Fetch attachments (excluding deleted)
    const attachments = await this.prisma.taskAttachment.findMany({
      where: { taskId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    return attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      uploadedBy: {
        id: attachment.uploadedBy.id,
        fullName: attachment.uploadedBy.fullName,
      },
      createdAt: attachment.createdAt,
    }));
  }

  // ═══════════════════════════════════════════════
  //  5. Download Attachment
  // ═══════════════════════════════════════════════

  async getDownloadUrl(attachmentId: number, userId: number) {
    const attachment = await this.findAttachmentWithProjectOrThrow(attachmentId);
    const projectId = attachment.task.checklist.projectId;

    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Return the file URL (Azure Blob Storage URL)
    return {
      fileUrl: attachment.fileUrl,
      fileName: attachment.fileName,
    };
  }

  // ═══════════════════════════════════════════════
  //  6. Delete Attachment
  // ═══════════════════════════════════════════════

  async remove(attachmentId: number, userId: number) {
    const attachment = await this.findAttachmentWithProjectOrThrow(attachmentId);
    const projectId = attachment.task.checklist.projectId;

    // Authorization: Attachment Owner, PROJECT_MANAGER, ADMIN, or SUPER_ADMIN
    const isOwner = attachment.uploadedById === userId;
    const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
    const isAdmin = await this.hasProjectRole(projectId, userId, 'ADMIN');
    const isSuperAdmin = await this.hasProjectRole(projectId, userId, 'SUPER_ADMIN');

    if (!isOwner && !isManager && !isAdmin && !isSuperAdmin) {
      throw new ForbiddenException(
        'Only the attachment owner, project manager, or admin can delete this attachment',
      );
    }

    // Soft delete in database
    await this.prisma.taskAttachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });

    // Activity Log: ATTACHMENT_DELETED
    await this.activityLogService.create(
      userId,
      'ATTACHMENT_DELETED',
      'TASK_ATTACHMENT',
      attachmentId,
      JSON.stringify({ fileName: attachment.fileName }),
    ).catch(() => {});

    // Attempt physical deletion from Azure Blob Storage (non-blocking)
    if (attachment.fileUrl) {
      await this.azureBlobService.delete(attachment.fileUrl).catch(() => {
        // Silently fail — DB soft-delete is the primary action
      });
    }

    return { message: 'Attachment deleted successfully' };
  }
}
