import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProjectMemberStatus, ProjectStatus, UserStatus } from '@prisma/client';
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
    this.maxFileSize = this.configService.get<number>(
      'upload.maxFileSize',
      20971520,
    );
  }

  private async isProjectMember(
    projectId: number,
    userId: number,
  ): Promise<boolean> {
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        status: ProjectMemberStatus.ACTIVE,
        deletedAt: null,
        user: {
          is: { status: UserStatus.ACTIVE, deletedAt: null },
        },
      },
    });
    return !!member;
  }

  private async hasProjectRole(
    projectId: number,
    userId: number,
    roleName: string,
  ): Promise<boolean> {
    const role = await this.prisma.projectRole.findUnique({
      where: { name: roleName },
    });
    if (!role) return false;

    const membership = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        roleId: role.id,
        status: ProjectMemberStatus.ACTIVE,
        deletedAt: null,
        user: {
          is: { status: UserStatus.ACTIVE, deletedAt: null },
        },
      },
    });
    return !!membership;
  }

  private ensureTaskContainerActive(task: {
    deletedAt: Date | null;
    checklist: {
      deletedAt: Date | null;
      project: { deletedAt: Date | null; status: ProjectStatus };
    };
  }): void {
    if (task.deletedAt) {
      throw new NotFoundException('Task not found');
    }
    if (task.checklist.deletedAt) {
      throw new BadRequestException('Checklist has been deleted');
    }
    if (task.checklist.project.deletedAt) {
      throw new BadRequestException('Project has been deleted');
    }
    if (task.checklist.project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException('Project must be ACTIVE to access attachments');
    }
  }

  private async findTaskWithProjectOrThrow(taskId: number) {
    const task = await this.prisma.checklistItem.findUnique({
      where: { id: taskId },
      include: { checklist: { include: { project: true } } },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    this.ensureTaskContainerActive(task);
    return task;
  }

  private async findAttachmentWithProjectOrThrow(attachmentId: number) {
    const attachment = await this.prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: {
          include: {
            checklist: { include: { project: true } },
          },
        },
      },
    });
    if (!attachment || attachment.deletedAt) {
      throw new NotFoundException('Attachment not found');
    }

    this.ensureTaskContainerActive(attachment.task);
    return attachment;
  }

  private async notifyTaskParticipants(
    taskId: number,
    projectId: number,
    uploaderId: number,
    taskTitle: string,
  ): Promise<void> {
    const task = await this.prisma.checklistItem.findUnique({
      where: { id: taskId },
      select: { assigneeId: true },
    });
    if (!task) return;

    const participantIds = new Set<number>();
    if (task.assigneeId && task.assigneeId !== uploaderId) {
      participantIds.add(task.assigneeId);
    }

    const commenters = await this.prisma.taskComment.findMany({
      where: { taskId, deletedAt: null, userId: { not: uploaderId } },
      select: { userId: true },
    });
    commenters.forEach((commenter) => participantIds.add(commenter.userId));

    if (participantIds.size === 0) return;

    const activeMembers = await this.prisma.projectMember.findMany({
      where: {
        projectId,
        status: ProjectMemberStatus.ACTIVE,
        deletedAt: null,
        user: {
          is: { status: UserStatus.ACTIVE, deletedAt: null },
        },
      },
      select: { userId: true },
    });
    const activeMemberIds = new Set(activeMembers.map((member) => member.userId));
    const content = `A new file has been uploaded to task "${taskTitle}".`;

    for (const participantId of participantIds) {
      if (!activeMemberIds.has(participantId)) continue;

      await this.notificationsService
        .create(participantId, 'New Attachment', content)
        .catch(() => {});
    }
  }

  async upload(
    taskId: number,
    file: Express.Multer.File,
    userId: number,
  ) {
    const task = await this.findTaskWithProjectOrThrow(taskId);
    const projectId = task.checklist.projectId;

    if (!(await this.isProjectMember(projectId, userId))) {
      throw new ForbiddenException('You are not a member of this project');
    }

    if (file.size > this.maxFileSize) {
      const maxMB = Math.round(this.maxFileSize / (1024 * 1024));
      throw new BadRequestException(`File size must not exceed ${maxMB} MB`);
    }

    const normalizedFileName = normalizeFileName(file.originalname);
    validateFile(normalizedFileName, file.mimetype, file.buffer);

    const extension = normalizedFileName.split('.').pop()?.toLowerCase();
    if (!extension) {
      throw new BadRequestException('File extension is required');
    }
    const blobName = `${crypto.randomUUID()}.${extension}`;
    const persistedBlobUrl = await this.azureBlobService.upload(
      blobName,
      file.buffer,
      file.mimetype,
    );

    let attachment;
    let fileUrl: string;
    try {
      fileUrl = await this.azureBlobService.getReadSasUrl(persistedBlobUrl);
      attachment = await this.prisma.taskAttachment.create({
        data: {
          taskId,
          uploadedById: userId,
          fileName: normalizedFileName,
          fileUrl: persistedBlobUrl,
        },
      });
    } catch (error) {
      await this.azureBlobService.delete(persistedBlobUrl).catch(() => {});
      throw error;
    }

    await this.notifyTaskParticipants(taskId, projectId, userId, task.title);
    await this.activityLogService
      .create(userId, 'ATTACHMENT_UPLOADED', 'TASK_ATTACHMENT', attachment.id)
      .catch(() => {});

    return { id: attachment.id, fileName: attachment.fileName, fileUrl };
  }

  async findAll(taskId: number, userId: number) {
    const task = await this.findTaskWithProjectOrThrow(taskId);
    const projectId = task.checklist.projectId;

    if (!(await this.isProjectMember(projectId, userId))) {
      throw new ForbiddenException('You are not a member of this project');
    }

    const attachments = await this.prisma.taskAttachment.findMany({
      where: { taskId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
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

  async getDownloadUrl(attachmentId: number, userId: number) {
    const attachment = await this.findAttachmentWithProjectOrThrow(attachmentId);
    const projectId = attachment.task.checklist.projectId;

    if (!(await this.isProjectMember(projectId, userId))) {
      throw new ForbiddenException('You are not a member of this project');
    }
    if (!attachment.fileUrl) {
      throw new NotFoundException('Attachment file not found');
    }

    return {
      fileUrl: await this.azureBlobService.getReadSasUrl(attachment.fileUrl),
      fileName: attachment.fileName,
    };
  }

  async remove(attachmentId: number, userId: number) {
    const attachment = await this.findAttachmentWithProjectOrThrow(attachmentId);
    const projectId = attachment.task.checklist.projectId;

    if (!(await this.isProjectMember(projectId, userId))) {
      throw new ForbiddenException('You are not a member of this project');
    }

    const isOwner = attachment.uploadedById === userId;
    const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
    const isAdmin = await this.hasProjectRole(projectId, userId, 'ADMIN');
    const isSuperAdmin = await this.hasProjectRole(projectId, userId, 'SUPER_ADMIN');

    if (!isOwner && !isManager && !isAdmin && !isSuperAdmin) {
      throw new ForbiddenException(
        'Only the attachment owner, project manager, or admin can delete this attachment',
      );
    }

    await this.prisma.taskAttachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });

    await this.activityLogService
      .create(
        userId,
        'ATTACHMENT_DELETED',
        'TASK_ATTACHMENT',
        attachmentId,
        JSON.stringify({ fileName: attachment.fileName }),
      )
      .catch(() => {});

    if (attachment.fileUrl) {
      await this.azureBlobService.delete(attachment.fileUrl).catch(() => {});
    }

    return { message: 'Attachment deleted successfully' };
  }
}