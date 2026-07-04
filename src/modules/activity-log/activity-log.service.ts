import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════
  //  Create Activity Log (internal — no public API)
  // ═══════════════════════════════════════════════

  async create(
    userId: number,
    action: string,
    entityType: string,
    entityId: number,
    oldValue?: string | null,
    newValue?: string | null,
  ) {
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

  // ═══════════════════════════════════════════════
  //  Get My Activities (paginated)
  // ═══════════════════════════════════════════════

  async findMyActivities(
    userId: number,
    options: { page?: number; limit?: number },
  ) {
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

  // ═══════════════════════════════════════════════
  //  Get Project Activities (paginated)
  // ═══════════════════════════════════════════════

  async findProjectActivities(
    projectId: number,
    userId: number,
    options: { page?: number; limit?: number },
  ) {
    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Collect all entity IDs related to this project
    // so we can filter activity logs by (entityType, entityId) pairs.

    const entityFilters: Array<{ entityType: string; entityId: number }> = [];

    // 1. Project itself
    entityFilters.push({ entityType: 'PROJECT', entityId: projectId });

    // 2. Project members
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      select: { id: true },
    });
    for (const m of members) {
      entityFilters.push({ entityType: 'PROJECT_MEMBER', entityId: m.id });
    }

    // 3. Checklists
    const checklists = await this.prisma.checklist.findMany({
      where: { projectId },
      select: { id: true },
    });
    const checklistIds = checklists.map((c) => c.id);
    for (const id of checklistIds) {
      entityFilters.push({ entityType: 'CHECKLIST', entityId: id });
    }

    // 4. Tasks
    const tasks = await this.prisma.checklistItem.findMany({
      where: { checklistId: { in: checklistIds } },
      select: { id: true },
    });
    const taskIds = tasks.map((t) => t.id);
    for (const id of taskIds) {
      entityFilters.push({ entityType: 'TASK', entityId: id });
    }

    // 5. Comments
    const comments = await this.prisma.taskComment.findMany({
      where: { taskId: { in: taskIds } },
      select: { id: true },
    });
    for (const c of comments) {
      entityFilters.push({ entityType: 'TASK_COMMENT', entityId: c.id });
    }

    // 6. Attachments
    const attachments = await this.prisma.taskAttachment.findMany({
      where: { taskId: { in: taskIds } },
      select: { id: true },
    });
    for (const a of attachments) {
      entityFilters.push({ entityType: 'TASK_ATTACHMENT', entityId: a.id });
    }

    // 7. Tags
    const tags = await this.prisma.tag.findMany({
      where: { projectId },
      select: { id: true },
    });
    for (const t of tags) {
      entityFilters.push({ entityType: 'TAG', entityId: t.id });
    }

    // Build OR conditions for Prisma
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

    const where = { OR: orConditions } as any;

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

  // ═══════════════════════════════════════════════
  //  Get Task Activities (paginated)
  // ═══════════════════════════════════════════════

  async findTaskActivities(
    taskId: number,
    userId: number,
    options: { page?: number; limit?: number },
  ) {
    // Verify task exists and get project ID for auth
    const task = await this.prisma.checklistItem.findUnique({
      where: { id: taskId },
      include: { checklist: { select: { projectId: true } } },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(task.checklist.projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Collect entity IDs related to this task
    const entityFilters: Array<{ entityType: string; entityId: number }> = [];

    // 1. Task itself
    entityFilters.push({ entityType: 'TASK', entityId: taskId });

    // 2. Comments
    const comments = await this.prisma.taskComment.findMany({
      where: { taskId },
      select: { id: true },
    });
    for (const c of comments) {
      entityFilters.push({ entityType: 'TASK_COMMENT', entityId: c.id });
    }

    // 3. Attachments
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

    const where = { OR: orConditions } as any;

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

  // ───────────────────────────
  //  Helper: Check project membership
  // ───────────────────────────

  private async isProjectMember(
    projectId: number,
    userId: number,
  ): Promise<boolean> {
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, status: 'ACTIVE' },
    });
    return !!member;
  }
}
