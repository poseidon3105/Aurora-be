import { Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { AssignTagDto } from './dto/assign-tag.dto';
import { ProjectMemberStatus } from '@prisma/client';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ───────────────────────────
  //  Helper: Find project or throw 404
  // ───────────────────────────

  private async findProjectOrThrow(projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  // ───────────────────────────
  //  Helper: Find tag or throw 404
  // ───────────────────────────

  private async findTagOrThrow(tagId: number) {
    const tag = await this.prisma.tag.findUnique({
      where: { id: tagId },
    });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    return tag;
  }

  // ───────────────────────────
  //  Helper: Find task or throw 404
  // ───────────────────────────

  private async findTaskOrThrow(taskId: number) {
    const task = await this.prisma.checklistItem.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  // ───────────────────────────
  //  Helper: Check if user is a project member
  // ───────────────────────────

  private async isProjectMember(
    projectId: number,
    userId: number,
  ): Promise<boolean> {
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, status: ProjectMemberStatus.ACTIVE },
    });
    return !!member;
  }

  // ───────────────────────────
  //  Helper: Check if user has a specific project role (active member)
  // ───────────────────────────

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
      },
    });
    return !!membership;
  }

  // ───────────────────────────
  //  Helper: Check if user has an elevated system role (SUPER_ADMIN or ADMIN)
  // ───────────────────────────

  private async hasElevatedRole(userId: number): Promise<boolean> {
    const elevatedRoles = ['SUPER_ADMIN', 'ADMIN'];
    const roles = await this.prisma.systemRole.findMany({
      where: { name: { in: elevatedRoles } },
    });
    if (roles.length === 0) return false;
    const roleIds = roles.map((r) => r.id);
    const assignment = await this.prisma.userSystemRole.findFirst({
      where: { userId, roleId: { in: roleIds } },
    });
    return !!assignment;
  }

  // ───────────────────────────
  //  Helper: Check if user is MANAGER or has elevated system role
  // ───────────────────────────

  private async hasManagerOrElevatedRole(
    projectId: number,
    userId: number,
  ): Promise<boolean> {
    const isManager = await this.hasProjectRole(
      projectId,
      userId,
      'PROJECT_MANAGER',
    );
    if (isManager) return true;
    const isElevated = await this.hasElevatedRole(userId);
    return isElevated;
  }

  // ═══════════════════════════════════════════════
  //  3. Create Tag
  // ═══════════════════════════════════════════════

  async create(projectId: number, dto: CreateTagDto, userId: number) {
    // Validate project exists and is not deleted
    const project = await this.findProjectOrThrow(projectId);
    if (project.deletedAt) {
      throw new BadRequestException('Project has been deleted');
    }

    // Authorization: PROJECT_MANAGER, ADMIN, or SUPER_ADMIN
    const hasPermission = await this.hasManagerOrElevatedRole(
      projectId,
      userId,
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        'Only a project manager, admin, or super admin can create tags',
      );
    }

    // Duplicate validation is handled by the @@unique constraint,
    // but we provide a friendlier error message upfront
    const existing = await this.prisma.tag.findUnique({
      where: { projectId_name: { projectId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(
        `A tag with the name "${dto.name}" already exists in this project`,
      );
    }

    const tag = await this.prisma.tag.create({
      data: {
        projectId,
        name: dto.name,
        color: dto.color,
        createdById: userId,
      },
    });

    // Activity Log: TAG_CREATED
    await this.activityLogService.create(
      userId,
      'TAG_CREATED',
      'TAG',
      tag.id,
      null,
      JSON.stringify({ name: tag.name, color: tag.color }),
    ).catch(() => {});

    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
    };
  }

  // ═══════════════════════════════════════════════
  //  4. Get Project Tags
  // ═══════════════════════════════════════════════

  async findAll(projectId: number, userId: number) {
    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    const tags = await this.prisma.tag.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });

    return tags;
  }

  // ═══════════════════════════════════════════════
  //  5. Update Tag
  // ═══════════════════════════════════════════════

  async update(tagId: number, dto: UpdateTagDto, userId: number) {
    // Validate tag exists
    const tag = await this.findTagOrThrow(tagId);

    // Authorization: PROJECT_MANAGER, ADMIN, or SUPER_ADMIN
    const hasPermission = await this.hasManagerOrElevatedRole(
      tag.projectId,
      userId,
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        'Only a project manager, admin, or super admin can update tags',
      );
    }

    // If name is being updated, check for duplicate within the same project
    if (dto.name !== undefined && dto.name !== tag.name) {
      const existing = await this.prisma.tag.findUnique({
        where: {
          projectId_name: { projectId: tag.projectId, name: dto.name },
        },
      });
      if (existing) {
        throw new ConflictException(
          `A tag with the name "${dto.name}" already exists in this project`,
        );
      }
    }

    await this.prisma.tag.update({
      where: { id: tagId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });

    // Activity Log: TAG_UPDATED
    await this.activityLogService.create(
      userId,
      'TAG_UPDATED',
      'TAG',
      tagId,
      JSON.stringify({ name: tag.name, color: tag.color }),
      JSON.stringify({
        name: dto.name ?? tag.name,
        color: dto.color ?? tag.color,
      }),
    ).catch(() => {});

    return { message: 'Tag updated successfully' };
  }

  // ═══════════════════════════════════════════════
  //  6. Delete Tag (Hard Delete)
  // ═══════════════════════════════════════════════

  async remove(tagId: number, userId: number) {
    // Validate tag exists
    const tag = await this.findTagOrThrow(tagId);

    // Authorization: PROJECT_MANAGER, ADMIN, or SUPER_ADMIN
    const hasPermission = await this.hasManagerOrElevatedRole(
      tag.projectId,
      userId,
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        'Only a project manager, admin, or super admin can delete tags',
      );
    }

    // Hard delete: remove all task_tag associations first, then the tag itself
    await this.prisma.$transaction([
      this.prisma.taskTag.deleteMany({ where: { tagId } }),
      this.prisma.tag.delete({ where: { id: tagId } }),
    ]);

    // Activity Log: TAG_DELETED
    await this.activityLogService.create(
      userId,
      'TAG_DELETED',
      'TAG',
      tagId,
      JSON.stringify({ name: tag.name, color: tag.color }),
    ).catch(() => {});

    return { message: 'Tag deleted successfully' };
  }

  // ═══════════════════════════════════════════════
  //  7. Assign Tag to Task
  // ═══════════════════════════════════════════════

  async assignToTask(taskId: number, dto: AssignTagDto, userId: number) {
    const { tagId } = dto;

    // Validate task exists
    const task = await this.findTaskOrThrow(taskId);
    if (task.deletedAt) {
      throw new BadRequestException('Cannot assign tags to a deleted task');
    }

    // Validate tag exists
    const tag = await this.findTagOrThrow(tagId);

    // Task and tag must belong to the same project
    // Task → Checklist → Project
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: task.checklistId },
      select: { projectId: true },
    });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    if (tag.projectId !== checklist.projectId) {
      throw new BadRequestException('Tag does not belong to this project');
    }

    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(checklist.projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Check for duplicate assignment
    const existingAssignment = await this.prisma.taskTag.findUnique({
      where: { taskId_tagId: { taskId, tagId } },
    });
    if (existingAssignment) {
      throw new ConflictException('Tag is already assigned to this task');
    }

    // Create assignment
    await this.prisma.taskTag.create({
      data: { taskId, tagId },
    });

    // Activity Log: TAG_ASSIGNED
    await this.activityLogService.create(
      userId,
      'TAG_ASSIGNED',
      'TAG',
      tagId,
      null,
      JSON.stringify({ taskId, tagName: tag.name }),
    ).catch(() => {});

    return { message: 'Tag assigned successfully' };
  }

  // ═══════════════════════════════════════════════
  //  8. Remove Tag from Task
  // ═══════════════════════════════════════════════

  async removeFromTask(taskId: number, tagId: number, userId: number) {
    // Validate task exists and is not deleted
    const task = await this.findTaskOrThrow(taskId);
    if (task.deletedAt) {
      throw new BadRequestException('Cannot modify a deleted task');
    }

    // Get checklist for project ID (for authorization)
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: task.checklistId },
      select: { projectId: true },
    });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(checklist.projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Check if the assignment exists
    const assignment = await this.prisma.taskTag.findUnique({
      where: { taskId_tagId: { taskId, tagId } },
    });
    if (!assignment) {
      throw new BadRequestException('Tag not assigned to task');
    }

    // Delete the assignment
    await this.prisma.taskTag.delete({
      where: { taskId_tagId: { taskId, tagId } },
    });

    // Activity Log: TAG_REMOVED
    await this.activityLogService.create(
      userId,
      'TAG_REMOVED',
      'TAG',
      tagId,
      JSON.stringify({ taskId }),
    ).catch(() => {});

    return { message: 'Tag removed from task successfully' };
  }

  // ═══════════════════════════════════════════════
  //  9. Get Task Tags
  // ═══════════════════════════════════════════════

  async getTaskTags(taskId: number, userId: number) {
    // Validate task exists and is not deleted
    const task = await this.findTaskOrThrow(taskId);
    if (task.deletedAt) {
      throw new BadRequestException('Task has been deleted');
    }

    // Get checklist for project ID (for authorization)
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: task.checklistId },
      select: { projectId: true },
    });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(checklist.projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    const taskTags = await this.prisma.taskTag.findMany({
      where: { taskId },
      include: {
        tag: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return taskTags.map((tt) => tt.tag);
  }
}
